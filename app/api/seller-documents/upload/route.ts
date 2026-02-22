// app/api/seller-documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Storage, Databases, ID, Account } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV helpers (no crashes at module load)
// -----------------------------
function env(name: string) {
  return (process.env[name] || "").trim();
}

function getAppwriteConfig() {
  const endpoint = env("APPWRITE_ENDPOINT") || env("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const project = env("APPWRITE_PROJECT_ID") || env("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  const apiKey = env("APPWRITE_API_KEY");
  const bucketId = env("APPWRITE_SELLER_DOCS_BUCKET_ID");
  return { endpoint, project, apiKey, bucketId };
}

// Transactions DB/collection – same DB as listings (fallbacks kept)
function getTransactionsTarget() {
  const dbId =
    env("APPWRITE_TRANSACTIONS_DATABASE_ID") ||
    env("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID") ||
    env("APPWRITE_LISTINGS_DATABASE_ID") ||
    env("NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID");

  const collectionId =
    env("APPWRITE_TRANSACTIONS_COLLECTION_ID") ||
    env("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID") ||
    "transactions";

  return { dbId, collectionId };
}

// -----------------------------
// SMTP / admin
// -----------------------------
const SMTP_HOST = env("SMTP_HOST");
const SMTP_PORT = Number(env("SMTP_PORT") || "465");
const SMTP_USER = env("SMTP_USER");
const SMTP_PASS = env("SMTP_PASS");

// If your SMTP has cert-chain issues, set SMTP_TLS_REJECT_UNAUTHORIZED=false
const TLS_REJECT_UNAUTHORIZED =
  (env("SMTP_TLS_REJECT_UNAUTHORIZED") || "true").toLowerCase() !== "false";

const FROM_EMAIL =
  env("FROM_EMAIL") ||
  env("CONTACT_FROM_EMAIL") ||
  env("EMAIL_FROM") ||
  SMTP_USER ||
  "no-reply@auctionmycamera.co.uk";

const ADMIN_EMAIL = (env("ADMIN_EMAIL") || "admin@auctionmycamera.co.uk").trim();

function createTransporterOrNull() {
  const enabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
  if (!enabled) {
    console.warn("[seller-documents/upload] SMTP not fully configured, skipping emails.");
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: TLS_REJECT_UNAUTHORIZED },
  });
}

// -----------------------------
// Auth helpers (JWT required)
// -----------------------------
function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  // Optional fallback header name (handy for debugging)
  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function requireAuthedUser(req: NextRequest, endpoint: string, project: string) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }

  try {
    const userClient = new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt);
    const account = new Account(userClient);
    const me: any = await account.get();
    if (!me?.$id || !me?.email) {
      return {
        ok: false as const,
        res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
      };
    }
    return { ok: true as const, me };
  } catch (e) {
    console.warn("[seller-documents/upload] auth failed:", e);
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function titleFromTxOrFallback(txDoc: any) {
  const t = String(txDoc?.item_title || txDoc?.title || "").trim();
  if (t) return t;
  const brand = String(txDoc?.brand || "").trim();
  const model = String(txDoc?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  return bm || "a listing";
}

// -----------------------------
// Route
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const { endpoint, project, apiKey, bucketId } = getAppwriteConfig();
    if (!endpoint || !project || !apiKey || !bucketId) {
      return NextResponse.json(
        {
          error:
            "Server Appwrite config missing. Ensure APPWRITE_ENDPOINT/PROJECT_ID/API_KEY and APPWRITE_SELLER_DOCS_BUCKET_ID are set (or NEXT_PUBLIC fallbacks where applicable).",
        },
        { status: 500 }
      );
    }

    // ✅ Must be logged in — we will NOT trust sellerId from the form
    const auth = await requireAuthedUser(req, endpoint, project);
    if (!auth.ok) return auth.res;

    const sellerId = String((auth.me as any).$id);
    const sellerEmail = String((auth.me as any).email || "").trim();

    const formData = await req.formData();

    const transactionIdRaw = formData.get("transactionId");
    const docTypeRaw = formData.get("docType");
    const fileField = formData.get("file");

    const transactionId =
      typeof transactionIdRaw === "string" && transactionIdRaw.trim()
        ? transactionIdRaw.trim()
        : null;

    const docType =
      typeof docTypeRaw === "string" && docTypeRaw.trim()
        ? docTypeRaw.trim()
        : null;

    if (!docType) {
      return NextResponse.json({ error: "Missing docType" }, { status: 400 });
    }

    if (!fileField || typeof fileField === "string") {
      return NextResponse.json({ error: "File not provided or invalid" }, { status: 400 });
    }

    const blob = fileField as Blob & { name?: string; size?: number; type?: string };

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
    const storage = new Storage(client);
    const databases = new Databases(client);

    const { dbId: TX_DB_ID, collectionId: TX_COLLECTION_ID } = getTransactionsTarget();

    // -----------------------------
    // 1) Upload file into bucket
    // -----------------------------
    const inputFile = InputFile.fromBuffer(buffer, blob.name || "document-upload");

    const createdFile = await storage.createFile(bucketId, ID.unique(), inputFile);

    console.log("[seller-documents/upload] Uploaded seller doc:", {
      sellerId,
      transactionId,
      docType,
      fileId: createdFile.$id,
    });

    // Metadata we want to attach to the transaction
    const docMeta = {
      fileId: createdFile.$id,
      bucketId,
      docType,
      sellerId,
      transactionId: transactionId || null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: sellerId,
      label: docType,
      fileName: blob.name || null,
    };

    let updatedTx: any = null;
    let txDocForEmail: any = null;

    // -----------------------------
    // 2) Attach to transaction (if we have one) — schema tolerant
    // -----------------------------
    if (transactionId && TX_DB_ID && TX_COLLECTION_ID) {
      try {
        const txDoc: any = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId);
        txDocForEmail = txDoc;

        const updateData: Record<string, any> = {};

        // Append documents array if field exists
        if (has(txDoc, "documents")) {
          const existingDocs = Array.isArray(txDoc.documents) ? txDoc.documents : [];
          updateData.documents = [...existingDocs, docMeta];
        }

        // Mark seller docs received if field exists
        if (has(txDoc, "seller_docs_received")) {
          updateData.seller_docs_received = true;
        }

        // IMPORTANT: do NOT write updated_at unless your schema has it.
        // Appwrite already provides $updatedAt.

        if (Object.keys(updateData).length > 0) {
          updatedTx = await databases.updateDocument(
            TX_DB_ID,
            TX_COLLECTION_ID,
            transactionId,
            updateData
          );
          console.log("[seller-documents/upload] Transaction updated with document", { transactionId });
        } else {
          console.log(
            "[seller-documents/upload] Transaction found but no compatible fields to update (schema strict).",
            { transactionId }
          );
        }
      } catch (err) {
        console.error("[seller-documents/upload] Failed to update transaction with document:", err);
        // We still continue – upload is successful, transaction link is best-effort
      }
    }

    // -----------------------------
    // 3) Email admin to say docs were uploaded (best-effort)
    // -----------------------------
    try {
      const transporter = createTransporterOrNull();
      if (transporter && ADMIN_EMAIL) {
        const subjectTxPart = transactionId ? ` (tx ${transactionId})` : "";
        const itemLabel = txDocForEmail ? titleFromTxOrFallback(txDocForEmail) : "a listing";

        await transporter.sendMail({
          from: `AuctionMyCamera <${FROM_EMAIL}>`,
          to: ADMIN_EMAIL,
          subject: `New seller document uploaded${subjectTxPart}`,
          text: `A new supporting document has been uploaded on AuctionMyCamera.

Seller ID: ${sellerId}
Seller Email: ${sellerEmail || "unknown"}
Transaction ID: ${transactionId || "not supplied"}
Item: ${itemLabel}
Doc type: ${docType}
File ID: ${createdFile.$id}
Bucket: ${bucketId}

You can view the file in Appwrite Storage and review the associated transaction/listing as needed.
`,
        });

        console.log("[seller-documents/upload] Admin notification email sent.");
      }
    } catch (mailErr) {
      console.error("[seller-documents/upload] Failed to send admin email:", mailErr);
      // Don’t fail the request over email
    }

    return NextResponse.json(
      {
        ok: true,
        fileId: createdFile.$id,
        sellerId,
        transactionId: transactionId || null,
        docType,
        updatedTransactionId: updatedTx?.$id || null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[seller-documents/upload] Upload seller doc error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}