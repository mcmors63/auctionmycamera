// app/api/transactions/confirm-dispatch/route.ts
import { NextResponse } from "next/server";
import { Client as AppwriteClient, Account, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side)
// -----------------------------
function normalizeEndpoint(raw: string) {
  const x = (raw || "").trim().replace(/\/+$/, "");
  if (!x) return "";
  return x.endsWith("/v1") ? x : `${x}/v1`;
}

const APPWRITE_ENDPOINT = normalizeEndpoint(
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ""
);

const APPWRITE_PROJECT = (
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ""
).trim();

const APPWRITE_API_KEY = (process.env.APPWRITE_API_KEY || "").trim();

const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.APPWRITE_TRANSACTIONS_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DB_ID ||
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.APPWRITE_TRANSACTIONS_TABLE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID ||
  "transactions";

// -----------------------------
// Helpers
// -----------------------------
function getBearerJwt(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function getAuthedUser(req: Request): Promise<{ userId: string; email: string }> {
  const jwt = getBearerJwt(req);
  if (!jwt) throw new Error("Not authenticated.");

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    throw new Error("Server missing Appwrite config.");
  }

  const c = new AppwriteClient().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT).setJWT(jwt);
  const account = new Account(c);
  const me = await account.get();

  const userId = String((me as any)?.$id || "").trim();
  const email = String((me as any)?.email || "").trim().toLowerCase();

  if (!userId || !email) throw new Error("Invalid session.");
  return { userId, email };
}

function getServerDatabases() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY) return null;
  if (!TX_DB_ID || !TX_COLLECTION_ID) return null;

  const c = new AppwriteClient().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT).setKey(APPWRITE_API_KEY);
  return new Databases(c);
}

function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function lower(v: any) {
  return safeStr(v).toLowerCase();
}

// Schema-tolerant update (same pattern as your confirm-received)
async function updateDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 12; i++) {
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

  const minimal: Record<string, any> = {};
  if (payload.transaction_status) minimal.transaction_status = payload.transaction_status;
  if (payload.seller_dispatch_status) minimal.seller_dispatch_status = payload.seller_dispatch_status;
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST /api/transactions/confirm-dispatch
// Auth: Bearer <Appwrite JWT>
// Body: { txId?: string, transactionId?: string, carrier?: string, tracking?: string }
// -----------------------------
export async function POST(req: Request) {
  try {
    const { email } = await getAuthedUser(req);

    const databases = getServerDatabases();
    if (!databases) {
      return NextResponse.json({ ok: false, error: "Server DB configuration incomplete." }, { status: 500 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const txId = safeStr(body?.txId || body?.transactionId);
    if (!txId) {
      return NextResponse.json({ ok: false, error: "txId (or transactionId) is required." }, { status: 400 });
    }

    const carrier = safeStr(body?.carrier);
    const tracking = safeStr(body?.tracking);

    const tx: any = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, txId);

    // Must be seller
    const sellerEmail = lower(tx?.seller_email);
    if (!sellerEmail || sellerEmail !== email) {
      return NextResponse.json({ ok: false, error: "Forbidden (seller only)." }, { status: 403 });
    }

    // Block deleted
    if (lower(tx?.transaction_status) === "deleted") {
      return NextResponse.json({ ok: false, error: "This transaction was deleted/archived." }, { status: 409 });
    }

    // Require paid
    const paymentStatus = lower(tx?.payment_status);
    if (paymentStatus !== "paid") {
      return NextResponse.json(
        { ok: false, error: "Cannot dispatch until payment is marked as paid." },
        { status: 409 }
      );
    }

    // Must be dispatch_pending (idempotent if already dispatched)
    const stage = lower(tx?.transaction_status);
    if (stage === "dispatch_sent" || stage === "receipt_pending") {
      return NextResponse.json({ ok: true, transaction: tx }, { status: 200 });
    }
    if (stage && stage !== "dispatch_pending") {
      return NextResponse.json(
        { ok: false, error: `Cannot confirm dispatch from status "${tx?.transaction_status}".` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      transaction_status: "dispatch_sent",
      seller_dispatch_status: "sent",
      seller_dispatched_at: nowIso,

      // optional details
      dispatch_carrier: carrier || undefined,
      dispatch_tracking: tracking || undefined,

      // optional: move buyer into receipt waiting stage
      buyer_receipt_status: "pending",

      updated_at: nowIso,
    };

    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    }

    const updated = await updateDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txId, updatePayload);

    return NextResponse.json({ ok: true, transaction: updated }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || "");
    const status = /Not authenticated|Invalid session|auth/i.test(msg) ? 401 : 500;
    console.error("[transactions/confirm-dispatch] error:", err);
    return NextResponse.json({ ok: false, error: msg || "Failed to confirm dispatch." }, { status });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}