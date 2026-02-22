// app/api/admin/delete-transaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side)
// Prefer server envs first, then public fallbacks (non-breaking).
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

// Optional: if set, require ?token=... or header x-admin-token
const ADMIN_DELETE_TX_SECRET = (process.env.ADMIN_DELETE_TX_SECRET || "").trim();

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

  // Last resort: update only status fields (most schemas have these)
  const minimal: Record<string, any> = {
    transaction_status: payload.transaction_status,
    payment_status: payload.payment_status,
  };
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST  /api/admin/delete-transaction
// Body: { txId?: string, transactionId?: string, reason: string }
// Soft delete (archive) – no hard delete
// Optional auth: if ADMIN_DELETE_TX_SECRET is set, require token.
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ DELETE-TX: Missing Appwrite config");
      return NextResponse.json(
        { error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }

    if (!TX_DB_ID || !TX_COLLECTION_ID) {
      console.error("❌ DELETE-TX: Missing transactions DB/collection config", {
        TX_DB_ID,
        TX_COLLECTION_ID,
      });
      return NextResponse.json(
        { error: "Server transactions configuration incomplete." },
        { status: 500 }
      );
    }

    // Optional protection: enable by setting ADMIN_DELETE_TX_SECRET in env
    if (ADMIN_DELETE_TX_SECRET) {
      const { searchParams } = new URL(req.url);
      const tokenFromQuery = (searchParams.get("token") || "").trim();
      const tokenFromHeader = (req.headers.get("x-admin-token") || "").trim();
      const token = tokenFromQuery || tokenFromHeader;

      if (token !== ADMIN_DELETE_TX_SECRET) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
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
      return NextResponse.json(
        { error: "txId or transactionId is required." },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json(
        { error: "A delete reason is required." },
        { status: 400 }
      );
    }

    const databases = getServerDatabases();
    if (!databases) {
      return NextResponse.json(
        { error: "Server Appwrite client could not be initialised." },
        { status: 500 }
      );
    }

    // Load existing doc so we can keep payment_status if present
    const existing: any = await databases.getDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      txId
    );

    const nowIso = new Date().toISOString();

    // Soft delete payload (schema tolerant; extra keys will be stripped if missing)
    const updatePayload: Record<string, any> = {
      transaction_status: "deleted",
      payment_status: existing?.payment_status || "pending",

      // Optional audit fields (safe if schema has them)
      is_deleted: true,
      deleted_reason: reason,
      deleted_at: nowIso,
      updated_at: nowIso,
    };

    const updated = await updateDocSchemaTolerant(
      databases,
      TX_DB_ID,
      TX_COLLECTION_ID,
      txId,
      updatePayload
    );

    return NextResponse.json(
      { ok: true, transaction: updated },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ DELETE-TX error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete (archive) transaction." },
      { status: 500 }
    );
  }
}

// Small debug helper – safe to leave
export async function GET() {
  return NextResponse.json(
    { ok: true, route: "admin/delete-transaction" },
    { status: 200 }
  );
}