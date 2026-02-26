// app/api/listings/withdraw-queued/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
// -----------------------------
const endpoint = (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const projectId = (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

const LISTINGS_DB_ID = (
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  ""
).trim();

const LISTINGS_COLLECTION_ID = (
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings"
).trim();

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

function isQueuedStatus(s: any) {
  const x = String(s || "").toLowerCase();
  return x === "queued" || x === "approved" || x === "approved_queued" || x === "approvedqueued";
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

    const listingId = safeString(body?.listingId);
    const reason = safeString(body?.reason);

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
          error: `Only queued listings can be withdrawn. Current status: ${String(listing?.status || "unknown")}`,
        },
        { status: 400 }
      );
    }

    // 3) Update (schema-tolerant)
    // Status alone is enough — do NOT write "" into datetime fields (can break Appwrite validation).
    const payload: Record<string, any> = { status: "withdrawn" };

    // Only store a reason if one was provided (avoids schema noise)
    if (reason) payload.withdrawn_reason = reason;

    // Only keep this line if you've actually created a `withdrawn_at` attribute in Appwrite.
    // If you haven't, it will trigger the schema-tolerant retry every time.
    // payload.withdrawn_at = new Date().toISOString();

    const updated = await updateDocSchemaTolerant(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, payload);

    return NextResponse.json({ ok: true, listing: updated });
  } catch (err: any) {
    console.error("withdraw-queued error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to withdraw listing." }, { status: 500 });
  }
}