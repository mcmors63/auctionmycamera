// app/api/listings/withdraw-queued/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
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

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// -----------------------------
// Helpers
// -----------------------------
function bearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || "").trim();
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

  for (let i = 0; i < 8; i++) {
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

  // fallback: at least set status
  return await databases.updateDocument(dbId, colId, docId, { status: payload.status });
}

// -----------------------------
// POST /api/listings/withdraw-queued
// Body: { listingId: string, reason?: string }
// Auth: Authorization: Bearer <Appwrite JWT>
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId) {
      return NextResponse.json({ ok: false, error: "Server Appwrite config missing (endpoint/project)." }, { status: 500 });
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = String(body?.listingId || "").trim();
    const reason = String(body?.reason || "").trim();

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "listingId required" }, { status: 400 });
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

    const myEmail = String(me?.email || "").trim().toLowerCase();
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

    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim().toLowerCase();
    if (!sellerEmail || sellerEmail !== myEmail) {
      return NextResponse.json({ ok: false, error: "Forbidden (not your listing)." }, { status: 403 });
    }

    if (!isQueuedStatus(listing?.status)) {
      return NextResponse.json(
        { ok: false, error: `Only queued listings can be withdrawn. Current status: ${String(listing?.status || "unknown")}` },
        { status: 400 }
      );
    }

    // 3) Update (schema-tolerant)
    // We set status to "withdrawn" and clear auction dates if those fields exist.
    const payload: Record<string, any> = { status: "withdrawn" };

    if (has(listing, "auction_start")) payload.auction_start = null;
    if (has(listing, "auction_end")) payload.auction_end = null;

    // Optional audit fields (only written if schema allows)
    payload.withdrawn_reason = reason || "";
    payload.withdrawn_at = new Date().toISOString();

    const updated = await updateDocSchemaTolerant(
      databases,
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId,
      payload
    );

    return NextResponse.json({ ok: true, listing: updated });
  } catch (err: any) {
    console.error("withdraw-queued error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to withdraw listing." }, { status: 500 });
  }
}