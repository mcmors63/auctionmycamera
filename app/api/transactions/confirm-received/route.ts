// app/api/transactions/confirm-received/route.ts
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

const APPWRITE_PROJECT = (process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "").trim();

const APPWRITE_API_KEY = (process.env.APPWRITE_API_KEY || "").trim();

// Transactions DB/collection
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

// Schema-tolerant update
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
  if (payload.buyer_receipt_status) minimal.buyer_receipt_status = payload.buyer_receipt_status;
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST /api/transactions/confirm-received
// Auth: Bearer <Appwrite JWT>
// Body: { txId?: string, transactionId?: string }
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
    } catch {
      // allow empty
    }

    const txId = safeStr(body?.txId || body?.transactionId);
    if (!txId) {
      return NextResponse.json({ ok: false, error: "txId (or transactionId) is required." }, { status: 400 });
    }

    const tx: any = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, txId);

    // Must be buyer
    const buyerEmail = lower(tx?.buyer_email);
    if (!buyerEmail || buyerEmail !== email) {
      return NextResponse.json({ ok: false, error: "Forbidden (buyer only)." }, { status: 403 });
    }

    // Block deleted
    if (lower(tx?.transaction_status) === "deleted") {
      return NextResponse.json({ ok: false, error: "This transaction was deleted/archived." }, { status: 409 });
    }

    // Require paid
    const paymentStatus = lower(tx?.payment_status);
    if (paymentStatus !== "paid") {
      return NextResponse.json(
        { ok: false, error: "Cannot confirm receipt until payment is marked as paid." },
        { status: 409 }
      );
    }

    // Require correct stage (allow idempotent)
    const stage = lower(tx?.transaction_status);
    const allowed = ["receipt_pending", "dispatch_sent", "dispatch_pending"];
    if (stage && !allowed.includes(stage)) {
      // If already complete, return ok (idempotent)
      if (stage === "complete" || stage === "completed") {
        return NextResponse.json({ ok: true, transaction: tx }, { status: 200 });
      }
      return NextResponse.json(
        { ok: false, error: `Cannot confirm receipt from status "${tx?.transaction_status}".` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      transaction_status: "complete",

      buyer_receipt_status: "confirmed",
      buyer_received_at: nowIso,

      // Optional payout flag (if your schema has it)
      payout_status: "ready",

      updated_at: nowIso,
    };

    // Strip undefined keys
    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    }

    const updated = await updateDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txId, updatePayload);

    return NextResponse.json({ ok: true, transaction: updated }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || "");
    const status = /Not authenticated|Invalid session|auth/i.test(msg) ? 401 : 500;
    console.error("[transactions/confirm-received] error:", err);
    return NextResponse.json({ ok: false, error: msg || "Failed to confirm receipt." }, { status });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}