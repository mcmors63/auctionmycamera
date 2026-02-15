// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite ENV
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

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
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
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

  const userClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(userClient);

  try {
    const me: any = await account.get(); // validates JWT
    if (!me?.$id || !me?.email) return null;
    return { id: String(me.$id), email: String(me.email), name: String(me.name || "") };
  } catch {
    return null;
  }
}

// -----------------------------
// POST /api/listings
// Requires Authorization: Bearer <Appwrite JWT>
// Creates a NEW listing document in Appwrite
// Then triggers emails via /api/admin/new-listing
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    // ✅ HARD GATE: must be logged in
    const me = await getAuthedUser(req);
    if (!me) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in or register before selling." },
        { status: 401 }
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
      return NextResponse.json({ error: "Prices cannot be negative." }, { status: 400 });
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
          { error: "Buy Now price cannot be lower than the reserve price or starting price." },
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

    const data: Record<string, any> = {
      // Legacy-safe base
      registration: displayName,
      seller_email: sellerEmail,
      owner_id: ownerId,
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNow,
      status: "pending_approval",

      // Camera fields (will work once schema exists)
      item_title: itemTitle || null,
      gear_type: gearType || null,
      era: era || null,
      condition: condition || null,
      brand: brand || null,
      model: model || null,
      description: description || null,

      // Keep these as harmless defaults if old schema expects them
      plate_status: body.plate_status || "available",
      expiry_date: body.expiry_date || null,
      interesting_fact: body.interesting_fact || null,

      // Optional auction fields if provided (approval overwrites anyway)
      auction_start: body.auction_start || null,
      auction_end: body.auction_end || null,
    };

    let created: any;
    try {
      created = await databases.createDocument(
        LISTINGS_DB_ID,
        LISTINGS_COLLECTION_ID,
        ID.unique(),
        data
      );
    } catch (err: any) {
      // If schema rejects new fields, fall back to minimal write
      const msg = String(err?.message || err);
      console.error("❌ createDocument failed, attempting minimal fallback", msg);

      const minimal = {
        registration: displayName,
        seller_email: sellerEmail,
        owner_id: ownerId,
        starting_price: startingPrice,
        reserve_price: reservePrice,
        buy_now: buyNow,
        status: "pending_approval",
        plate_status: body.plate_status || "available",
        expiry_date: body.expiry_date || null,
      };

      created = await databases.createDocument(
        LISTINGS_DB_ID,
        LISTINGS_COLLECTION_ID,
        ID.unique(),
        minimal
      );
    }

    const listingId = created?.$id;

    // Trigger admin + seller emails (non-fatal)
    // NOTE: your /api/admin/new-listing currently expects plateId + registration (legacy naming)
    try {
      const url = new URL("/api/admin/new-listing", req.url);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: listingId,
          registration: displayName,
          sellerEmail,
          reserve_price: reservePrice,
          starting_price: startingPrice,
          buy_now: buyNow,

          // extras (ignored by legacy handler, but useful later)
          item_title: itemTitle || displayName,
          gear_type: gearType || undefined,
          era: era || undefined,
          condition: condition || undefined,
          brand: brand || undefined,
          model: model || undefined,
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