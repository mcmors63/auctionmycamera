// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account, Permission, Role } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite ENV (SAFE reads)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// Optional admin access helpers (ONLY used for document permissions if you enable Row Security)
const ADMINS_TEAM_ID = (process.env.APPWRITE_ADMINS_TEAM_ID || "").trim(); // optional
const ADMIN_USER_ID = (process.env.APPWRITE_ADMIN_USER_ID || "").trim(); // optional

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// -----------------------------
// Helpers
// -----------------------------
function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function isBlank(v: any) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function getAdminDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function getAuthedUser(req: NextRequest) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) return null;

  const userClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(userClient);

  try {
    const me: any = await account.get();
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
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        { error: "Missing listings env (APPWRITE_LISTINGS_DATABASE_ID / APPWRITE_LISTINGS_COLLECTION_ID)." },
        { status: 500 }
      );
    }

    // ✅ Auth
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

    // ✅ Email verified
    if (!me.emailVerified) {
      return NextResponse.json(
        {
          error: "Email not verified. Please verify your email before submitting a listing.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // -----------------------------
    // Fields (camera-first)
    // -----------------------------
    const itemTitle = safeString(body.item_title || body.title || body.itemTitle);
    const gearType = safeString(body.gear_type || body.gearType);
    const era = safeString(body.era);
    const condition = safeString(body.condition);
    const brand = safeString(body.brand);
    const model = safeString(body.model);
    const description = safeString(body.description);

    // Photo references
    const imageId = safeString(body.image_id || body.imageId);
    const imageIdsRaw = Array.isArray(body.image_ids || body.imageIds) ? body.image_ids || body.imageIds : null;

    const imageIds =
      Array.isArray(imageIdsRaw) && imageIdsRaw.length
        ? imageIdsRaw.map((x: any) => safeString(x)).filter(Boolean).slice(0, 10)
        : null;

    // Optional relist
    const relistUntilSold = !!body.relist_until_sold;

    // -----------------------------
    // Prices (match dashboard rules)
    // -----------------------------
    const reservePrice = isBlank(body.reserve_price ?? body.reservePrice)
      ? NaN
      : toNumber(body.reserve_price ?? body.reservePrice, NaN);

    const startingPrice = isBlank(body.starting_price ?? body.startingPrice)
      ? 0
      : toNumber(body.starting_price ?? body.startingPrice, NaN);

    const buyNow = isBlank(body.buy_now ?? body.buyNow)
      ? 0
      : toNumber(body.buy_now ?? body.buyNow, NaN);

    if (!Number.isFinite(reservePrice)) {
      return NextResponse.json({ error: "reserve_price must be a valid number." }, { status: 400 });
    }
    if (!Number.isFinite(startingPrice) || startingPrice < 0) {
      return NextResponse.json({ error: "Starting price must be a valid number (0+)." }, { status: 400 });
    }
    if (!Number.isFinite(buyNow) || buyNow < 0) {
      return NextResponse.json({ error: "Buy Now must be a valid number (0+)." }, { status: 400 });
    }

    // ✅ enforce your UI rule
    if (reservePrice < 10) {
      return NextResponse.json({ error: "Minimum reserve price is £10." }, { status: 400 });
    }

    if (startingPrice > 0 && startingPrice >= reservePrice) {
      return NextResponse.json({ error: "Starting price must be lower than reserve price." }, { status: 400 });
    }

    if (buyNow > 0) {
      const minBuyNow = Math.max(reservePrice || 0, startingPrice || 0);
      if (buyNow < minBuyNow) {
        return NextResponse.json(
          { error: "Buy Now price cannot be lower than the reserve price or starting price." },
          { status: 400 }
        );
      }
    }

    // Display label compatibility (you use `registration` as a label in places)
    const displayName = itemTitle || [brand, model].filter(Boolean).join(" ") || `Listing ${Date.now()}`;

    const databases = getAdminDatabases();

    const sellerEmail = me.email;
    const ownerId = me.id;

    const permissions = buildCreatePermissions(ownerId);

    const data: Record<string, any> = {
      // label / legacy compatibility
      registration: displayName,

      // Ownership / seller
      seller_email: sellerEmail,
      owner_id: ownerId,

      // Pricing
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNow,

      // Lifecycle
      status: "pending_approval",
      auction_start: null,
      auction_end: null,
      current_bid: 0,

      // Camera fields
      item_title: itemTitle || null,
      gear_type: gearType || null,
      era: era || null,
      condition: condition || null,
      brand: brand || null,
      model: model || null,
      description: description || null,

      // Photos
      image_id: imageId || null,
      image_ids: imageIds || null,

      // Relist
      relist_until_sold: relistUntilSold,
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

      const minimal: Record<string, any> = {
        registration: displayName,
        seller_email: sellerEmail,
        owner_id: ownerId,
        starting_price: startingPrice,
        reserve_price: reservePrice,
        buy_now: buyNow,
        status: "pending_approval",
        image_id: imageId || null,
        relist_until_sold: relistUntilSold,
      };

      try {
        created = await databases.createDocument(
          LISTINGS_DB_ID,
          LISTINGS_COLLECTION_ID,
          ID.unique(),
          minimal,
          permissions
        );
      } catch {
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

    return NextResponse.json({ ok: true, listingId: created?.$id }, { status: 200 });
  } catch (err: any) {
    console.error("❌ /api/listings error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create listing." }, { status: 500 });
  }
}