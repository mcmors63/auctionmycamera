// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account, Permission, Role } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite ENV
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Optional admin access helpers (ONLY used for document permissions if you enable Row Security)
const ADMINS_TEAM_ID = (process.env.APPWRITE_ADMINS_TEAM_ID || "").trim(); // optional
const ADMIN_USER_ID = (process.env.APPWRITE_ADMIN_USER_ID || "").trim(); // optional

// Backwards-compatible env names (your clone still uses "PLATES")
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Helpers
function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function getAdminDatabases() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return new Databases(client);
}

function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  // Optional fallback header name (handy for debugging)
  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function getAuthedUser(req: NextRequest) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) return null;

  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setJWT(jwt);

  const account = new Account(userClient);

  try {
    const me: any = await account.get(); // validates JWT
    if (!me?.$id || !me?.email) return null;

    const emailVerified = !!me?.emailVerification;

    return {
      id: String(me.$id),
      email: String(me.email),
      name: String(me.name || ""),
      emailVerified,
    };
  } catch {
    return null;
  }
}

function buildCreatePermissions(userId: string) {
  const perms: string[] = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  if (ADMINS_TEAM_ID) {
    perms.push(
      Permission.read(Role.team(ADMINS_TEAM_ID)),
      Permission.update(Role.team(ADMINS_TEAM_ID)),
      Permission.delete(Role.team(ADMINS_TEAM_ID))
    );
  }

  if (ADMIN_USER_ID) {
    perms.push(
      Permission.read(Role.user(ADMIN_USER_ID)),
      Permission.update(Role.user(ADMIN_USER_ID)),
      Permission.delete(Role.user(ADMIN_USER_ID))
    );
  }

  return perms;
}

// -----------------------------
// POST /api/listings
// Requires Authorization: Bearer <Appwrite JWT>
// Creates a NEW listing document as pending_approval
// Then triggers emails via /api/admin/new-listing
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        { error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }

    // ✅ HARD GATE: must be logged in
    const me = await getAuthedUser(req);
    if (!me) {
      return NextResponse.json(
        {
          error: "Not authenticated. Please log in or register before selling.",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // ✅ HARD GATE: must be email verified
    if (!me.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Email not verified. Please verify your email before submitting a listing.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Camera-first fields (new)
    const itemTitle = safeString(body.item_title || body.title || body.itemTitle);
    const gearType = safeString(body.gear_type || body.gearType);
    const era = safeString(body.era);
    const condition = safeString(body.condition);
    const brand = safeString(body.brand);
    const model = safeString(body.model);
    const description = safeString(body.description);

    // ✅ Photo fields from SellClient
    // - SellClient currently sends image_id (single). We also accept image_ids (array) for future-proofing.
    const imageId = safeString(body.image_id || body.imageId);
    const imageIdsRaw = Array.isArray(body.image_ids || body.imageIds)
      ? (body.image_ids || body.imageIds)
      : null;
    const imageIds =
      Array.isArray(imageIdsRaw) && imageIdsRaw.length
        ? imageIdsRaw
            .map((x: any) => safeString(x))
            .filter(Boolean)
            .slice(0, 10) // sensible cap
        : null;

    // Legacy fields (old plate-era) — used as fallback display label
    const regNumber = safeString(body.reg_number || body.registration);

    const startingPrice = toNumber(body.starting_price ?? body.startingPrice, NaN);
    const reservePrice = toNumber(body.reserve_price ?? body.reservePrice, NaN);
    const buyNow = toNumber(body.buy_now ?? body.buyNow, 0);

    if (!Number.isFinite(startingPrice) || !Number.isFinite(reservePrice)) {
      return NextResponse.json(
        { error: "starting_price and reserve_price must be valid numbers." },
        { status: 400 }
      );
    }

    if (startingPrice < 0 || reservePrice < 0) {
      return NextResponse.json(
        { error: "Prices cannot be negative." },
        { status: 400 }
      );
    }

    if (reservePrice > 0 && startingPrice > 0 && startingPrice >= reservePrice) {
      return NextResponse.json(
        { error: "Starting price must be lower than reserve price." },
        { status: 400 }
      );
    }

    if (buyNow > 0) {
      const minBuyNow = Math.max(reservePrice || 0, startingPrice || 0);
      if (buyNow < minBuyNow) {
        return NextResponse.json(
          {
            error:
              "Buy Now price cannot be lower than the reserve price or starting price.",
          },
          { status: 400 }
        );
      }
    }

    // Display label for legacy pages
    const displayName = itemTitle || regNumber || `Listing ${Date.now()}`;

    const databases = getAdminDatabases();

    // ✅ IMPORTANT: seller email + owner id come from auth (NOT the request body)
    const sellerEmail = me.email;
    const ownerId = me.id;

    const permissions = buildCreatePermissions(ownerId);

    // ✅ IMPORTANT:
    // Avoid writing created_at / updated_at unless you have those attributes in Appwrite.
    // Appwrite already provides $createdAt / $updatedAt automatically.
    const data: Record<string, any> = {
      // Base / compatibility (legacy uses "registration" as label)
      registration: displayName,

      // Ownership / seller
      seller_email: sellerEmail,
      sellerEmail: sellerEmail,
      owner_id: ownerId,
      ownerId: ownerId,

      // Pricing
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNow,

      // ✅ Always pending until admin approves
      status: "pending_approval",

      // ✅ Auction timings are ADMIN-controlled (never trust client)
      auction_start: null,
      auction_end: null,

      // Optional bid tracking fields (safe defaults if schema supports them)
      current_bid: 0,

      // Camera fields (schema-tolerant)
      item_title: itemTitle || null,
      gear_type: gearType || null,
      era: era || null,
      condition: condition || null,
      brand: brand || null,
      model: model || null,
      description: description || null,

      // ✅ Photo references (schema-tolerant)
      // If you only add one attribute in Appwrite, add: image_id (string).
      // If you later add gallery support, add: image_ids (string array).
      image_id: imageId || null,
      image_ids: imageIds || null,

      // Legacy harmless defaults
      plate_status: body.plate_status || "available",
      expiry_date: body.expiry_date || null,
      interesting_fact: body.interesting_fact || null,
    };

    let created: any;

    try {
      created = await databases.createDocument(
        LISTINGS_DB_ID,
        LISTINGS_COLLECTION_ID,
        ID.unique(),
        data,
        permissions
      );
    } catch (err: any) {
      const msg = String(err?.message || err);
      console.error("❌ createDocument failed, attempting minimal fallback:", msg);

      // Minimal payload that should work even on a strict schema
      const minimal: Record<string, any> = {
        registration: displayName,
        seller_email: sellerEmail,
        sellerEmail: sellerEmail,
        owner_id: ownerId,
        ownerId: ownerId,
        starting_price: startingPrice,
        reserve_price: reservePrice,
        buy_now: buyNow,
        status: "pending_approval",

        // Try to keep photo even in minimal mode — if schema doesn’t have it,
        // Appwrite will still reject, so we omit it if that happens next time.
        image_id: imageId || null,
      };

      try {
        created = await databases.createDocument(
          LISTINGS_DB_ID,
          LISTINGS_COLLECTION_ID,
          ID.unique(),
          minimal,
          permissions
        );
      } catch (err2: any) {
        // Ultra-minimal last resort (no optional fields at all)
        const ultra: Record<string, any> = {
          registration: displayName,
          seller_email: sellerEmail,
          owner_id: ownerId,
          starting_price: startingPrice,
          reserve_price: reservePrice,
          buy_now: buyNow,
          status: "pending_approval",
        };

        created = await databases.createDocument(
          LISTINGS_DB_ID,
          LISTINGS_COLLECTION_ID,
          ID.unique(),
          ultra,
          permissions
        );
      }
    }

    const listingId = created?.$id;

    // Trigger admin notification (non-fatal)
    try {
      const url = new URL("/api/admin/new-listing", req.url);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: listingId, // legacy param name kept
          registration: displayName,
          sellerEmail,
          reserve_price: reservePrice,
          starting_price: startingPrice,
          buy_now: buyNow,

          // camera context
          item_title: itemTitle || displayName,
          gear_type: gearType || undefined,
          era: era || undefined,
          condition: condition || undefined,
          brand: brand || undefined,
          model: model || undefined,

          // photo info (handy for admin review later)
          image_id: imageId || undefined,
        }),
      });
    } catch (e) {
      console.warn("⚠️ Listing created but email trigger failed:", e);
    }

    return NextResponse.json({ ok: true, listingId }, { status: 200 });
  } catch (err: any) {
    console.error("❌ /api/listings error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create listing." },
      { status: 500 }
    );
  }
}