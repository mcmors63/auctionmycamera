// app/api/admin/delete-transaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side)
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

// Transactions DB/collection (camera first, legacy fallback)
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

function getServerDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return new Databases(client);
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

  // Last resort: only write a minimal audit flag if possible
  const minimal: Record<string, any> = {};
  if ("archived" in payload) minimal.archived = payload.archived;
  if ("archived_reason" in payload) minimal.archived_reason = payload.archived_reason;
  if ("archived_at" in payload) minimal.archived_at = payload.archived_at;

  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST /api/admin/delete-transaction
// Body: { txId?: string, transactionId?: string, reason: string }
// Soft delete (archive) – no hard delete
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    // ✅ Real admin gate: session-based (same as your other admin routes)
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    if (!TX_DB_ID || !TX_COLLECTION_ID) {
      return NextResponse.json({ error: "Server transactions configuration incomplete." }, { status: 500 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const txId =
      (body?.txId as string | undefined) ||
      (body?.transactionId as string | undefined) ||
      "";

    const reason = String(body?.reason || "").trim();

    if (!txId) {
      return NextResponse.json({ error: "txId or transactionId is required." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "A reason is required." }, { status: 400 });
    }

    const databases = getServerDatabases();
    if (!databases) {
      return NextResponse.json({ error: "Server Appwrite client could not be initialised." }, { status: 500 });
    }

    // Load existing doc (so we can keep important fields intact)
    const existing: any = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, txId);

    const nowIso = new Date().toISOString();

    /**
     * ✅ Archive strategy:
     * - DO NOT invent a new transaction_status like "deleted"
     * - Keep fulfilment + payment fields as they are
     * - Add archive flags + reason (schema-tolerant)
     */
    const updatePayload: Record<string, any> = {
      // keep these intact if they exist
      transaction_status: existing?.transaction_status,
      payment_status: existing?.payment_status,

      // archive flags (will be kept if schema has them)
      archived: true,
      archived_reason: reason,
      archived_at: nowIso,

      // optional timestamp (schema tolerant)
      updated_at: nowIso,
    };

    const updated = await updateDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txId, updatePayload);

    return NextResponse.json({ ok: true, transaction: updated }, { status: 200 });
  } catch (err: any) {
    console.error("delete-transaction error:", err);
    return NextResponse.json({ error: err?.message || "Failed to archive transaction." }, { status: 500 });
  }
}

// Optional smoke-test
export async function GET() {
  return NextResponse.json({ ok: true, route: "admin/delete-transaction" }, { status: 200 });
}