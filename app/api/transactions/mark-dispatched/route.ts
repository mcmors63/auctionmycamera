// app/api/transactions/mark-dispatched/route.ts
import { NextResponse } from "next/server";
import { Client as AppwriteClient, Account, Databases } from "node-appwrite";
import nodemailer from "nodemailer";

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

// Transactions DB/collection (camera-first, legacy fallback)
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
// EMAIL (server-side)
// -----------------------------
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

const RAW_FROM_EMAIL =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "no-reply@auctionmycamera.co.uk";

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim();

function normalizeEmailAddress(input: string) {
  let v = (input || "").trim();
  const angleMatch = v.match(/<([^>]+)>/);
  if (angleMatch?.[1]) v = angleMatch[1].trim();
  v = v.replace(/^"+|"+$/g, "").trim();
  v = v.replace(/\s+/g, "");
  return v;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const FROM_ADDRESS = normalizeEmailAddress(RAW_FROM_EMAIL);

function getMailer() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const port = Number(process.env.SMTP_PORT || "465");

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtLondonIso(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
  } catch {
    return iso;
  }
}

async function sendDispatchEmails(params: {
  tx: any;
  carrier: string;
  tracking: string;
  note: string;
}) {
  const { tx, carrier, tracking, note } = params;

  const mailer = getMailer();
  if (!mailer) return { sent: false, reason: "SMTP not configured" };
  if (!isValidEmail(FROM_ADDRESS)) return { sent: false, reason: "Invalid FROM email" };

  const buyerEmail = String(tx?.buyer_email || "").trim().toLowerCase();
  const sellerEmail = String(tx?.seller_email || "").trim().toLowerCase();

  // Transaction label
  const label =
    String(tx?.registration || "").trim() ||
    String(tx?.item_title || "").trim() ||
    `Transaction ${String(tx?.$id || "").slice(0, 8)}`;

  const dashLink = `${SITE_URL}/dashboard?tab=transactions`;
  const from = { name: FROM_NAME, address: FROM_ADDRESS };

  const dispatchedAt = tx?.seller_dispatched_at ? fmtLondonIso(String(tx.seller_dispatched_at)) : "";

  const carrierLine = carrier ? `Carrier: ${carrier}` : "";
  const trackingLine = tracking ? `Tracking: ${tracking}` : "";
  const noteLine = note ? `Note: ${note}` : "";

  // Buyer email
  if (buyerEmail && isValidEmail(buyerEmail)) {
    await mailer.sendMail({
      from,
      to: buyerEmail,
      subject: `📦 Dispatched: ${label}`,
      text: [
        `Your item has been dispatched: ${label}`,
        dispatchedAt ? `Dispatched: ${dispatchedAt}` : "",
        carrierLine,
        trackingLine,
        noteLine,
        "",
        `Track your order progress in your dashboard:`,
        dashLink,
        "",
        `— AuctionMyCamera Team`,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>Your item has been dispatched: <strong>${esc(label)}</strong></p>
        ${dispatchedAt ? `<p><strong>Dispatched:</strong> ${esc(dispatchedAt)}</p>` : ""}
        ${carrier ? `<p><strong>Carrier:</strong> ${esc(carrier)}</p>` : ""}
        ${tracking ? `<p><strong>Tracking:</strong> ${esc(tracking)}</p>` : ""}
        ${note ? `<p><strong>Note:</strong> ${esc(note)}</p>` : ""}
        <p><a href="${esc(dashLink)}" target="_blank" rel="noopener noreferrer">View in your dashboard</a></p>
        <p>— AuctionMyCamera Team</p>
      `,
    });
  }

  // Admin notification (optional)
  if (ADMIN_EMAIL && isValidEmail(ADMIN_EMAIL)) {
    await mailer.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `📦 Dispatched: ${label}`,
      text: [
        `A seller marked an item as dispatched.`,
        "",
        `Item: ${label}`,
        `TX: ${String(tx?.$id || "")}`,
        sellerEmail ? `Seller: ${sellerEmail}` : "",
        buyerEmail ? `Buyer: ${buyerEmail}` : "",
        dispatchedAt ? `Dispatched: ${dispatchedAt}` : "",
        carrierLine,
        trackingLine,
        noteLine,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  // (Optional) seller confirmation email — not essential; skip for now to reduce noise.
  return { sent: true };
}

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

  // Last resort minimal update
  const minimal: Record<string, any> = {};
  if (payload.transaction_status) minimal.transaction_status = payload.transaction_status;
  if (payload.seller_dispatch_status) minimal.seller_dispatch_status = payload.seller_dispatch_status;
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST /api/transactions/mark-dispatched
// Auth: Bearer <Appwrite JWT>
// Body: { txId?: string, transactionId?: string, carrier?: string, tracking?: string, note?: string }
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

    const carrier = safeStr(body?.carrier);
    const tracking = safeStr(body?.tracking);
    const note = safeStr(body?.note);

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

    // Require paid before dispatch
    const paymentStatus = lower(tx?.payment_status);
    if (paymentStatus !== "paid") {
      return NextResponse.json(
        { ok: false, error: "Cannot mark dispatched until payment is marked as paid." },
        { status: 409 }
      );
    }

    // Require correct stage (allow idempotent re-submit)
    const currentStage = lower(tx?.transaction_status);
    const allowed = ["dispatch_pending", "pending_documents", "pending", "dispatch_sent", "receipt_pending"];
    if (currentStage && !allowed.includes(currentStage)) {
      return NextResponse.json(
        { ok: false, error: `Cannot mark dispatched from status "${tx?.transaction_status}".` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      // Pipeline move
      transaction_status: "receipt_pending",

      // Dispatch fields
      seller_dispatch_status: "sent",
      seller_dispatch_carrier: carrier || undefined,
      seller_dispatch_tracking: tracking || undefined,
      seller_dispatch_note: note || undefined,
      seller_dispatched_at: nowIso,

      updated_at: nowIso,
    };

    // Strip undefined keys so Appwrite doesn’t get spammed
    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    }

    const updated = await updateDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txId, updatePayload);

    // ✅ Dispatch confirmation emails (best-effort, non-blocking)
    let emailResult: any = { sent: false };
    try {
      emailResult = await sendDispatchEmails({
        tx: updated,
        carrier,
        tracking,
        note,
      });
    } catch (e) {
      console.error("[transactions/mark-dispatched] dispatch email error:", e);
      emailResult = { sent: false, error: "email_failed" };
    }

    return NextResponse.json({ ok: true, transaction: updated, dispatchEmail: emailResult }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || "");
    const status = /Not authenticated|Invalid session|auth/i.test(msg) ? 401 : 500;
    console.error("[transactions/mark-dispatched] error:", err);
    return NextResponse.json({ ok: false, error: msg || "Failed to mark dispatched." }, { status });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}