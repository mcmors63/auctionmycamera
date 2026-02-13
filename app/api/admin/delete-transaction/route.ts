// app/api/admin/delete-transaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV (server-side)
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

// Use the same DB setup as the rest of your admin APIs
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const TX_COLLECTION_ID = "transactions";

function getServerDatabases() {
  const client = new Client();
  client
    .setEndpoint(endpoint!) // non-null because we guard in POST below
    .setProject(projectId!)
    .setKey(apiKey!);
  return new Databases(client);
}

// -----------------------------
// POST  /api/admin/delete-transaction
// Body: { txId?: string, transactionId?: string, reason: string }
// Soft delete (archive) – no hard delete
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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    // Accept BOTH txId and transactionId to match any frontend calls
    const idFromTx = body?.txId as string | undefined;
    const idFromTransaction = body?.transactionId as string | undefined;
    const txId = idFromTx || idFromTransaction;

    const reasonRaw = (body?.reason as string | undefined) || "";
    const reason = reasonRaw.trim();

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

    // Load existing doc (so we can keep current statuses if needed)
    const existing: any = await databases.getDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      txId
    );

    const nowIso = new Date().toISOString();

    // Soft delete: mark as deleted + record reason + timestamps
    const updated = await databases.updateDocument(
      TX_DB_ID,
      TX_COLLECTION_ID,
      txId,
      {
        transaction_status: "deleted",
        is_deleted: true,
        deleted_reason: reason,
        deleted_at: nowIso,
        // keep whatever payment_status it already had
        payment_status: existing.payment_status || "pending",
        updated_at: nowIso,
      }
    );

    console.log("✅ DELETE-TX soft-deleted", { txId, reason });

    return NextResponse.json(
      {
        ok: true,
        transaction: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ DELETE-TX error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to delete (archive) transaction.",
      },
      { status: 500 }
    );
  }
}

// Small debug helper – safe to leave, or remove later if you want
export async function GET() {
  return NextResponse.json(
    { ok: true, route: "delete-transaction" },
    { status: 200 }
  );
}
