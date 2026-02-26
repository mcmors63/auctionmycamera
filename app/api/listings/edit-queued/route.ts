// app/api/listings/edit-queued/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
// -----------------------------
const endpoint =
  (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const projectId =
  (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

const LISTINGS_DB_ID =
  (process.env.APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    "").trim();

const LISTINGS_COLLECTION_ID =
  (process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
    "listings").trim();

// -----------------------------
// Helpers
// -----------------------------
function bearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || "").trim();
}

function safeString(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function toNumber(value: any, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isQueuedStatus(s: any) {
  const x = String(s || "").toLowerCase();
  return x === "queued" || x === "approved" || x === "approved_queued" || x === "approvedqueued";
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

// Schema-tolerant update: remove unknown keys and retry
async function updateDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 10; i++) {
    try {
      return await databases.updateDocument(dbId, colId, docId, data);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const m = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
      if (m?.[1]) {
        delete data[m[1]];
        continue;
      }
      throw err;
    }
  }

  // fallback: at least update pricing (most likely to exist)
  return await databases.updateDocument(dbId, colId, docId, {
    reserve_price: payload.reserve_price,
    starting_price: payload.starting_price,
    buy_now: payload.buy_now,
  });
}

// -----------------------------
// POST /api/listings/edit-queued
// Body: {
//   listingId: string,
//   item_title?: string,
//   gear_type?: string,
//   brand?: string,
//   model?: string,
//   era?: string,
//   condition?: string,
//   description?: string,
//   reserve_price: number,
//   starting_price?: number,
//   buy_now?: number,
//   relist_until_sold?: boolean
// }
// Auth: Authorization: Bearer <Appwrite JWT>
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId) {
      return NextResponse.json(
        { ok: false, error: "Server Appwrite config missing (endpoint/project)." },
        { status: 500 }
      );
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Server missing APPWRITE_API_KEY." }, { status: 500 });
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing listings env (APPWRITE_LISTINGS_DATABASE_ID / APPWRITE_LISTINGS_COLLECTION_ID)." },
        { status: 500 }
      );
    }

    const jwt = bearerToken(req);
    if (!jwt) {
      return NextResponse.json({ ok: false, error: "Missing Authorization Bearer token." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = safeString(body.listingId);
    if (!listingId) {
      return NextResponse.json({ ok: false, error: "listingId required" }, { status: 400 });
    }

    // Strings (write as "" to avoid schema rejecting null)
    const item_title = safeString(body.item_title);
    const gear_type = safeString(body.gear_type);
    const brand = safeString(body.brand);
    const model = safeString(body.model);
    const era = safeString(body.era);
    const condition = safeString(body.condition);
    const description = safeString(body.description);

    const reserve_price = toNumber(body.reserve_price, NaN);
    const starting_price =
      body.starting_price === "" || body.starting_price == null ? 0 : toNumber(body.starting_price, NaN);
    const buy_now = body.buy_now === "" || body.buy_now == null ? 0 : toNumber(body.buy_now, NaN);

    if (!Number.isFinite(reserve_price) || reserve_price < 10) {
      return NextResponse.json({ ok: false, error: "Minimum reserve price is £10." }, { status: 400 });
    }
    if (!Number.isFinite(starting_price) || starting_price < 0) {
      return NextResponse.json({ ok: false, error: "Starting price must be a valid number (0+)." }, { status: 400 });
    }
    if (!Number.isFinite(buy_now) || buy_now < 0) {
      return NextResponse.json({ ok: false, error: "Buy Now must be a valid number (0+)." }, { status: 400 });
    }

    if (starting_price > 0 && starting_price >= reserve_price) {
      return NextResponse.json(
        { ok: false, error: "Starting price must be lower than the reserve price." },
        { status: 400 }
      );
    }

    if (buy_now > 0) {
      const minBuyNow = Math.max(reserve_price || 0, starting_price || 0);
      if (buy_now < minBuyNow) {
        return NextResponse.json(
          { ok: false, error: "Buy Now price cannot be lower than your reserve price or starting price." },
          { status: 400 }
        );
      }
    }

    // 1) Identify the user (JWT client)
    const jwtClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const jwtAccount = new Account(jwtClient);

    let me: any;
    try {
      me = await jwtAccount.get();
    } catch {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const myEmail = safeString(me?.email).toLowerCase();
    if (!myEmail) {
      return NextResponse.json({ ok: false, error: "Could not determine user email." }, { status: 401 });
    }

    // 2) Server client for DB write
    const serverClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(serverClient);

    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);
    if (!listing) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }

    const sellerEmail = safeString(listing?.seller_email || listing?.sellerEmail).toLowerCase();
    if (!sellerEmail || sellerEmail !== myEmail) {
      return NextResponse.json({ ok: false, error: "Forbidden (not your listing)." }, { status: 403 });
    }

    if (!isQueuedStatus(listing?.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Only queued listings can be edited. Current status: ${String(listing?.status || "unknown")}`,
        },
        { status: 400 }
      );
    }

    // 3) Update fields (schema-tolerant)
    const payload: Record<string, any> = {
      reserve_price,
      starting_price,
      buy_now,
      relist_until_sold: !!body.relist_until_sold,
      seller_last_edited_at: new Date().toISOString(),
    };

    // Optional strings (avoid null writes)
    if (item_title) payload.item_title = item_title;
if (gear_type) payload.gear_type = gear_type;
if (brand) payload.brand = brand;
if (model) payload.model = model;
if (era) payload.era = era;
if (condition) payload.condition = condition;
if (description) payload.description = description;

    // Do NOT touch status/auction dates here (admin controls schedule)
    if (has(listing, "status")) payload.status = listing.status;

    const updated = await updateDocSchemaTolerant(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, payload);

    return NextResponse.json({ ok: true, listing: updated });
  } catch (err: any) {
    console.error("edit-queued error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to edit listing." }, { status: 500 });
  }
}