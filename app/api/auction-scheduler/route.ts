// app/api/auction-scheduler/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query, ID } from "node-appwrite";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// APPWRITE SETUP (server-safe)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";

const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

// DB + collections (allow separation, fall back safely)
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// Bids may be separate DB/collection
const BIDS_DB_ID =
  process.env.APPWRITE_BIDS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_DATABASE_ID ||
  LISTINGS_DB_ID;

const BIDS_COLLECTION_ID =
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  "";

// Transactions may be separate DB/collection
const TRANSACTIONS_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  LISTINGS_DB_ID;

const TRANSACTIONS_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "";

// Profiles may be separate DB/collection (✅ important!)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  LISTINGS_DB_ID;

const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

function getDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
  if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) return null;

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// -----------------------------
// CRON / SECURITY
// -----------------------------
const CRON_SECRET = (process.env.CRON_SECRET || process.env.AUCTION_CRON_SECRET || "").trim();

function cronAuthed(req: NextRequest) {
  if (!CRON_SECRET) return false;

  // Preferred: Vercel Cron style Authorization header
  const auth = (req.headers.get("authorization") || "").trim();
  if (auth === `Bearer ${CRON_SECRET}`) return true;

  // Existing methods (keep for manual testing)
  const q = (req.nextUrl.searchParams.get("secret") || "").trim();
  const h = (req.headers.get("x-cron-secret") || "").trim();
  return q === CRON_SECRET || h === CRON_SECRET;
}

// -----------------------------
// STRIPE
// -----------------------------
const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// ✅ SAFETY SWITCH (prevents real charges while testing)
const DISABLE_WINNER_CHARGES =
  (process.env.DISABLE_WINNER_CHARGES || "").trim() === "1" ||
  (process.env.DISABLE_WINNER_CHARGES || "").trim().toLowerCase() === "true";

// -----------------------------
// EMAIL
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

function fmtLondon(d: Date) {
  return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -----------------------------
// CAMERA POLICY (No DVLA fee)
// -----------------------------
const EXTRA_FEE_GBP = 0;

// -----------------------------
// SMALL HELPERS
// -----------------------------
function getNumeric(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseTimestamp(ts: any): number {
  if (!ts || typeof ts !== "string") return 0;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? t : 0;
}

async function listAllDocs(params: {
  databases: Databases;
  dbId: string;
  colId: string;
  queries: string[];
  pageSize?: number;
  hardLimit?: number;
}) {
  const { databases, dbId, colId, queries, pageSize = 200, hardLimit = 5000 } = params;

  const all: any[] = [];
  let offset = 0;

  while (true) {
    const page = await databases.listDocuments(dbId, colId, [
      ...queries,
      Query.limit(pageSize),
      Query.offset(offset),
    ]);

    all.push(...page.documents);

    if (page.documents.length < pageSize) break;
    offset += pageSize;

    if (all.length >= hardLimit) break;
  }

  return all;
}

function getListingLabel(listing: any) {
  const t = String(listing?.item_title || listing?.title || "").trim();
  if (t) return t;

  const brand = String(listing?.brand || "").trim();
  const model = String(listing?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  if (bm) return bm;

  const reg = String(listing?.registration || "").trim();
  if (reg) return reg;

  return `Listing ${String(listing?.$id || "").slice(0, 8)}`;
}

// -----------------------------
// Delivery formatting (seller email)
// -----------------------------
function safeTrim(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function buildDeliveryBlock(profile: any) {
  const first = safeTrim(profile?.first_name);
  const last = safeTrim(profile?.surname);
  const phone = safeTrim(profile?.phone);

  const house = safeTrim(profile?.house);
  const street = safeTrim(profile?.street);
  const town = safeTrim(profile?.town);
  const county = safeTrim(profile?.county);
  const postcode = safeTrim(profile?.postcode);

  const nameLine = [first, last].filter(Boolean).join(" ").trim();

  const lines = [
    nameLine || "",
    house || "",
    street || "",
    town || "",
    county || "",
    postcode || "",
    phone ? `Phone: ${phone}` : "",
  ].filter(Boolean);

  const hasUsable = !!(house || street || town || postcode || nameLine || phone);

  return {
    hasUsable,
    text: hasUsable ? lines.join("\n") : "",
    html: hasUsable
      ? `<div style="margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa">
           <p style="margin:0 0 8px 0"><strong>Buyer delivery details</strong></p>
           <div style="white-space:pre-line;line-height:1.5">${esc(lines.join("\n"))}</div>
         </div>`
      : "",
  };
}

// -----------------------------
// Stripe helper: pick default PM first
// -----------------------------
async function pickPaymentMethodForCustomer(customerId: string) {
  if (!stripe) return null;

  const customer = await stripe.customers.retrieve(customerId);
  let defaultPmId: string | null = null;

  if (!("deleted" in customer)) {
    const defPm = customer.invoice_settings?.default_payment_method as
      | string
      | { id: string }
      | null
      | undefined;

    if (typeof defPm === "string") defaultPmId = defPm;
    else if (defPm && typeof defPm === "object") defaultPmId = defPm.id;
  }

  if (defaultPmId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(defaultPmId);
      if ((pm as any)?.id) return pm as Stripe.PaymentMethod;
    } catch {
      // fall back to listing below
    }
  }

  const pmList = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  return pmList.data[0] || null;
}

// -----------------------------
// Idempotency helpers (Appwrite-level)
// -----------------------------
async function findExistingPaidTransaction(databases: Databases, listingId: string) {
  if (!TRANSACTIONS_COLLECTION_ID) return null;

  try {
    const r = await databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, [
      Query.equal("listing_id", listingId),
      Query.equal("payment_status", "paid"),
      Query.limit(1),
      Query.orderDesc("$createdAt"),
    ]);
    return r.documents?.[0] || null;
  } catch {
    return null;
  }
}

async function findAnyTransactionForListing(databases: Databases, listingId: string) {
  if (!TRANSACTIONS_COLLECTION_ID) return null;

  try {
    const r = await databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, [
      Query.equal("listing_id", listingId),
      Query.limit(1),
      Query.orderDesc("$createdAt"),
    ]);
    return r.documents?.[0] || null;
  } catch {
    return null;
  }
}

// -----------------------------
// Transaction doc creation (pipeline starts)
// -----------------------------
async function createTransactionForWinner(params: {
  databases: Databases;
  listing: any;
  finalBidAmount: number; // GBP
  winnerEmail: string;
  winnerUserId: string | null;
  paymentIntentId: string;
  buyerProfile?: any;
}) {
  const { databases, listing, finalBidAmount, winnerEmail, winnerUserId, paymentIntentId, buyerProfile } = params;

  if (!TRANSACTIONS_COLLECTION_ID) {
    console.warn("No TRANSACTIONS_COLLECTION_ID configured; skipping transaction creation.");
    return null;
  }

  // ✅ prevent duplicate tx creation (scheduler reruns)
  const existing = await findAnyTransactionForListing(databases, String(listing.$id || ""));
  if (existing && String(existing.payment_status || "").toLowerCase() === "paid") {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const listingId = String(listing.$id || "");
  const label = getListingLabel(listing);
  const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();

  const commissionRate = getNumeric(listing.commission_rate); // %
  const salePrice = Math.round(finalBidAmount);

  const commissionAmount = Math.round(commissionRate > 0 ? (salePrice * commissionRate) / 100 : 0);
  const sellerPayout = Math.max(0, salePrice - commissionAmount - EXTRA_FEE_GBP);

  const delivery = {
    delivery_first_name: buyerProfile?.first_name || "",
    delivery_surname: buyerProfile?.surname || "",
    delivery_house: buyerProfile?.house || "",
    delivery_street: buyerProfile?.street || "",
    delivery_town: buyerProfile?.town || "",
    delivery_county: buyerProfile?.county || "",
    delivery_postcode: buyerProfile?.postcode || "",
    delivery_phone: buyerProfile?.phone || "",
  };

  const data: Record<string, any> = {
    listing_id: listingId,
    seller_email: sellerEmail,
    buyer_email: winnerEmail,
    buyer_id: winnerUserId,

    sale_price: salePrice,

    commission_rate: commissionRate,
    commission_amount: commissionAmount,

    seller_payout: sellerPayout,

    dvla_fee: 0,

    payment_status: "paid",
    transaction_status: "dispatch_pending",

    created_at: nowIso,

    registration: label,
    stripe_payment_intent_id: paymentIntentId,

    ...delivery,

    seller_dispatch_status: "pending",
    buyer_receipt_status: "pending",
  };

  try {
    const doc = await databases.createDocument(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, ID.unique(), data);
    return doc as any;
  } catch (err) {
    console.error("Failed to create transaction document for listing", listingId, err);
    return null;
  }
}

async function createPaymentFailedTransaction(params: {
  databases: Databases;
  listing: any;
  finalBidAmount: number; // GBP
  winnerEmail: string;
  winnerUserId: string | null;
  paymentIntentId?: string;
  reason: string;
  buyerProfile?: any;
}) {
  const { databases, listing, finalBidAmount, winnerEmail, winnerUserId, paymentIntentId, reason, buyerProfile } =
    params;

  if (!TRANSACTIONS_COLLECTION_ID) return null;

  // ✅ prevent endless failure tx spam
  const existing = await findAnyTransactionForListing(databases, String(listing.$id || ""));
  if (existing && String(existing.transaction_status || "").toLowerCase() === "payment_failed") {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const listingId = String(listing.$id || "");
  const label = getListingLabel(listing);
  const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();

  const delivery = {
    delivery_first_name: buyerProfile?.first_name || "",
    delivery_surname: buyerProfile?.surname || "",
    delivery_house: buyerProfile?.house || "",
    delivery_street: buyerProfile?.street || "",
    delivery_town: buyerProfile?.town || "",
    delivery_county: buyerProfile?.county || "",
    delivery_postcode: buyerProfile?.postcode || "",
    delivery_phone: buyerProfile?.phone || "",
  };

  const data: Record<string, any> = {
    listing_id: listingId,
    seller_email: sellerEmail,
    buyer_email: winnerEmail,
    buyer_id: winnerUserId,

    sale_price: Math.round(finalBidAmount),

    payment_status: "unpaid",
    transaction_status: "payment_failed",

    created_at: nowIso,
    registration: label,

    stripe_payment_intent_id: paymentIntentId || "",
    payment_failure_reason: reason,

    ...delivery,
  };

  try {
    const doc = await databases.createDocument(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, ID.unique(), data);
    return doc as any;
  } catch (err) {
    console.warn("Could not create payment_failed transaction (schema may not allow fields).", err);
    return null;
  }
}

// -----------------------------
// Emails after successful charge
// -----------------------------
async function sendWinnerEmails(params: {
  mailer: nodemailer.Transporter;
  listing: any;
  winnerEmail: string;
  sellerEmail: string;
  finalBidAmount: number;
  paymentIntentId: string;
  buyerProfile?: any;
}) {
  const { mailer, listing, winnerEmail, sellerEmail, finalBidAmount, paymentIntentId, buyerProfile } = params;

  const label = getListingLabel(listing);
  const amountLabel = `£${finalBidAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const buyerLink = `${SITE_URL}/dashboard?tab=transactions`;
  const sellerLink = `${SITE_URL}/dashboard?tab=transactions`;
  const listingLink = `${SITE_URL}/listing/${listing.$id}`;

  const from = { name: FROM_NAME, address: FROM_ADDRESS };

  if (isValidEmail(winnerEmail) && isValidEmail(FROM_ADDRESS)) {
    await mailer.sendMail({
      from,
      to: winnerEmail,
      subject: `✅ You won: ${label} — payment received`,
      text: [
        `Congratulations — you won the auction for: ${label}`,
        ``,
        `Payment received: ${amountLabel}`,
        ``,
        `Next steps:`,
        `1) The seller will dispatch your item within the delivery window.`,
        `2) You’ll be able to track progress in your dashboard.`,
        ``,
        `Go to your dashboard: ${buyerLink}`,
        `View listing: ${listingLink}`,
        ``,
        `Payment reference: ${paymentIntentId}`,
        ``,
        `— AuctionMyCamera Team`,
      ].join("\n"),
      html: `
        <p>Congratulations — you won the auction for <strong>${esc(label)}</strong>.</p>
        <p><strong>Payment received:</strong> ${esc(amountLabel)}</p>
        <p><strong>Next steps</strong></p>
        <ol>
          <li>The seller will dispatch your item within the delivery window.</li>
          <li>You can track progress in your dashboard.</li>
        </ol>
        <p>
          <a href="${esc(buyerLink)}" target="_blank" rel="noopener noreferrer">Go to your dashboard</a><br/>
          <a href="${esc(listingLink)}" target="_blank" rel="noopener noreferrer">View listing</a>
        </p>
        <p style="color:#6b7280;font-size:12px">Payment reference: ${esc(paymentIntentId)}</p>
        <p>— AuctionMyCamera Team</p>
      `,
    });
  }

  if (isValidEmail(sellerEmail) && isValidEmail(FROM_ADDRESS)) {
    const delivery = buildDeliveryBlock(buyerProfile);

    await mailer.sendMail({
      from,
      to: sellerEmail,
      subject: `✅ Sold: ${label} — buyer payment received`,
      text: [
        `Good news — your item has sold: ${label}`,
        ``,
        `Buyer payment received: ${amountLabel}`,
        ``,
        delivery.hasUsable
          ? `Buyer delivery details:\n${delivery.text}`
          : `Buyer delivery details: (not available — buyer must update profile)`,
        ``,
        `Next steps:`,
        `1) Prepare your item for dispatch.`,
        `2) Add dispatch details (carrier/tracking) in your dashboard.`,
        ``,
        `Go to your dashboard: ${sellerLink}`,
        `View listing: ${listingLink}`,
        ``,
        `— AuctionMyCamera Team`,
      ].join("\n"),
      html: `
        <p>Good news — your item has sold: <strong>${esc(label)}</strong></p>
        <p><strong>Buyer payment received:</strong> ${esc(amountLabel)}</p>
        ${
          delivery.hasUsable
            ? delivery.html
            : `<p><strong>Buyer delivery details:</strong> <span style="color:#6b7280">Not available — buyer must update their profile.</span></p>`
        }
        <p><strong>Next steps</strong></p>
        <ol>
          <li>Prepare your item for dispatch.</li>
          <li>Add dispatch details (carrier/tracking) in your dashboard.</li>
        </ol>
        <p>
          <a href="${esc(sellerLink)}" target="_blank" rel="noopener noreferrer">Go to your dashboard</a><br/>
          <a href="${esc(listingLink)}" target="_blank" rel="noopener noreferrer">View listing</a>
        </p>
        <p>— AuctionMyCamera Team</p>
      `,
    });
  }

  if (ADMIN_EMAIL && isValidEmail(ADMIN_EMAIL) && isValidEmail(FROM_ADDRESS)) {
    await mailer.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `📸 Sale: ${label} — ${amountLabel} paid`,
      text: [
        `A sale was completed and the winner was charged.`,
        ``,
        `Item: ${label}`,
        `Amount: ${amountLabel}`,
        `Buyer: ${winnerEmail}`,
        `Seller: ${sellerEmail || "unknown"}`,
        `Listing: ${listingLink}`,
        `PaymentIntent: ${paymentIntentId}`,
      ].join("\n"),
    });
  }
}

async function sendPaymentRequiredEmails(params: {
  mailer: nodemailer.Transporter;
  listing: any;
  winnerEmail: string;
  sellerEmail: string;
  finalBidAmount: number;
  reason: string;
}) {
  const { mailer, listing, winnerEmail, sellerEmail, finalBidAmount, reason } = params;

  const label = getListingLabel(listing);
  const amountLabel = `£${finalBidAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const from = { name: FROM_NAME, address: FROM_ADDRESS };

  const paymentMethodLink = `${SITE_URL}/payment-method`;
  const adminLink = `${SITE_URL}/admin`;
  const listingLink = `${SITE_URL}/listing/${listing.$id}`;

  if (isValidEmail(winnerEmail) && isValidEmail(FROM_ADDRESS)) {
    await mailer.sendMail({
      from,
      to: winnerEmail,
      subject: `⚠️ Action required: payment failed for ${label}`,
      text: [
        `You won the auction for: ${label}`,
        `Amount due: ${amountLabel}`,
        ``,
        `We could not take payment automatically: ${reason}`,
        ``,
        `Next step: add or update your saved card here:`,
        paymentMethodLink,
        ``,
        `After updating your card, our system will attempt payment again automatically.`,
        ``,
        `View listing: ${listingLink}`,
        ``,
        `— AuctionMyCamera Team`,
      ].join("\n"),
      html: `
        <p>You won the auction for <strong>${esc(label)}</strong>.</p>
        <p><strong>Amount due:</strong> ${esc(amountLabel)}</p>
        <p style="color:#b45309"><strong>We could not take payment automatically:</strong> ${esc(reason)}</p>
        <p><strong>Next step:</strong> <a href="${esc(
          paymentMethodLink
        )}" target="_blank" rel="noopener noreferrer">Add / update your saved card</a></p>
        <p>After updating your card, our system will attempt payment again automatically.</p>
        <p><a href="${esc(listingLink)}" target="_blank" rel="noopener noreferrer">View listing</a></p>
        <p>— AuctionMyCamera Team</p>
      `,
    });
  }

  if (ADMIN_EMAIL && isValidEmail(ADMIN_EMAIL) && isValidEmail(FROM_ADDRESS)) {
    await mailer.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `⚠️ Winner payment failed: ${label} — ${amountLabel}`,
      text: [
        `Winner payment failed.`,
        ``,
        `Item: ${label}`,
        `Amount: ${amountLabel}`,
        `Buyer: ${winnerEmail}`,
        `Seller: ${sellerEmail || "unknown"}`,
        `Reason: ${reason}`,
        `Listing: ${listingLink}`,
        `Admin: ${adminLink}`,
      ].join("\n"),
    });
  }
}

// -----------------------------
// GET = scheduler run (use via Vercel Cron)
// -----------------------------
export async function GET(req: NextRequest) {
  const winnerCharges: any[] = [];

  try {
    if (!cronAuthed(req)) {
      return NextResponse.json({ ok: false, error: "Forbidden (cron secret required)." }, { status: 403 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ ok: false, error: "Missing Appwrite env config." }, { status: 500 });
    }

    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json({ ok: false, error: "Missing listings DB/collection env config." }, { status: 500 });
    }

    const databases = getDatabases();
    if (!databases) {
      return NextResponse.json({ ok: false, error: "Appwrite client could not be initialised." }, { status: 500 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const nowTs = now.getTime();

    const mailer = getMailer();

    // ---------------------------------
    // 1) Promote queued -> live (and repair missing dates)
    // ---------------------------------
    const queuedDocs = await listAllDocs({
      databases,
      dbId: LISTINGS_DB_ID,
      colId: LISTINGS_COLLECTION_ID,
      queries: [Query.equal("status", ["queued", "approvedQueued"]), Query.orderAsc("$createdAt")],
      pageSize: 200,
      hardLimit: 5000,
    });

    let promoted = 0;
    let repairedQueuedDates = 0;

    for (const doc of queuedDocs as any[]) {
      const lid = String(doc.$id || "");

      let startTs = parseTimestamp(doc.auction_start);
      let endTs = parseTimestamp(doc.auction_end);

      if (!startTs || !endTs) {
        const { currentStart, currentEnd, nextStart, nextEnd, now: wnNow } = getAuctionWindow();
        const useNext = wnNow.getTime() > currentEnd.getTime();

        const start = useNext ? nextStart : currentStart;
        const end = useNext ? nextEnd : currentEnd;

        try {
          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
            auction_start: start.toISOString(),
            auction_end: end.toISOString(),
          });
          repairedQueuedDates++;
          startTs = start.getTime();
          endTs = end.getTime();
        } catch {
          continue;
        }
      }

      if (startTs > nowTs) continue;

      await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, { status: "live" });
      promoted++;
    }

    // ---------------------------------
    // 2) End live auctions
    // ---------------------------------
    const liveToEndDocs = await listAllDocs({
      databases,
      dbId: LISTINGS_DB_ID,
      colId: LISTINGS_COLLECTION_ID,
      queries: [Query.equal("status", "live"), Query.lessThanEqual("auction_end", nowIso), Query.orderAsc("$createdAt")],
      pageSize: 200,
      hardLimit: 5000,
    });

    let completed = 0;
    let markedNotSold = 0;
    let relisted = 0;
    let relistEmailsSent = 0;

    const justCompletedForCharging: any[] = [];

    for (const doc of liveToEndDocs as any[]) {
      const lid = doc.$id as string;

      const currentBid = getNumeric(doc.current_bid);
      const reserve = getNumeric(doc.reserve_price);
      const wantsAutoRelist = !!doc.relist_until_sold;

      const hasBid = currentBid > 0;
      const reserveMet = reserve <= 0 ? hasBid : currentBid >= reserve;

      if (hasBid && reserveMet) {
        const updated = await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, { status: "completed" });
        completed++;
        justCompletedForCharging.push(updated);
        continue;
      }

      if (wantsAutoRelist) {
        const { currentStart, currentEnd, nextStart, nextEnd, now: wnNow } = getAuctionWindow();

        const useNext = wnNow.getTime() > currentEnd.getTime();
        const start = useNext ? nextStart : currentStart;
        const end = useNext ? nextEnd : currentEnd;

        await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
          status: "queued",
          auction_start: start.toISOString(),
          auction_end: end.toISOString(),

          current_bid: null,
          highest_bidder: null,
          last_bidder: null,
          last_bid_time: null,
          bids: 0,
          bidder_email: null,
          bidder_id: null,
        });

        relisted++;

        const sellerEmail = String(doc.seller_email || "").trim();
        const title = getListingLabel(doc);

        if (mailer && sellerEmail && isValidEmail(sellerEmail) && isValidEmail(FROM_ADDRESS)) {
          try {
            await mailer.sendMail({
              from: { name: FROM_NAME, address: FROM_ADDRESS },
              to: sellerEmail,
              subject: `✅ ${title} has been re-listed`,
              text: `Your listing "${title}" did not sell this week, so we have automatically re-listed it for the next auction window.

Start: ${fmtLondon(start)}
End:   ${fmtLondon(end)}

— AuctionMyCamera Team`,
            });

            relistEmailsSent++;
          } catch (mailErr) {
            console.error("Failed to send auto-relist email:", mailErr);
          }
        }

        continue;
      }

      await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, { status: "not_sold" });
      markedNotSold++;
    }

    // ---------------------------------
    // 3) Charge winners for completed listings only
    // ---------------------------------
    if (DISABLE_WINNER_CHARGES) {
      return NextResponse.json({
        ok: true,
        now: nowIso,
        promoted,
        repairedQueuedDates,
        completed,
        markedNotSold,
        relisted,
        relistEmailsSent,
        winnerCharges: [],
        note: "DISABLE_WINNER_CHARGES is enabled — skipped winner charging.",
      });
    }

    if (!stripe || !BIDS_COLLECTION_ID) {
      return NextResponse.json({
        ok: true,
        now: nowIso,
        promoted,
        repairedQueuedDates,
        completed,
        markedNotSold,
        relisted,
        relistEmailsSent,
        winnerCharges: [],
        note: "Stripe or BIDS collection not configured — skipped winner charging.",
      });
    }

    for (const listing of justCompletedForCharging) {
      const lid = listing.$id as string;

      // ✅ Appwrite-level idempotency: if already paid, do not re-charge
      const alreadyIntent = String(listing?.stripe_payment_intent_id || "").trim();
      if (alreadyIntent) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "listing already has stripe_payment_intent_id" });
        continue;
      }

      const existingPaidTx = await findExistingPaidTransaction(databases, lid);
      if (existingPaidTx) {
        // best-effort: ensure listing ends up as sold (prevents “ended” weirdness)
        try {
          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
            status: "sold",
            sale_status: "winner_charged",
            payment_status: "paid",
          });
        } catch {}
        winnerCharges.push({ listingId: lid, skipped: true, reason: "paid transaction already exists" });
        continue;
      }

      const currentBid = getNumeric(listing.current_bid);
      const reserve = getNumeric(listing.reserve_price);

      if (!currentBid || currentBid <= 0) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "no bids / current_bid is 0" });
        continue;
      }

      if (reserve > 0 && currentBid < reserve) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: `reserve not met (bid=${currentBid}, reserve=${reserve})`,
        });
        continue;
      }

      // Load bids
      let bids: any[] = [];
      try {
        bids = await listAllDocs({
          databases,
          dbId: BIDS_DB_ID,
          colId: BIDS_COLLECTION_ID,
          queries: [Query.equal("listing_id", lid), Query.orderDesc("$createdAt")],
          pageSize: 500,
          hardLimit: 5000,
        });
      } catch (err) {
        console.error(`Failed to list bids for listing ${lid}. Check BIDS indexes/attributes.`, err);
        winnerCharges.push({ listingId: lid, skipped: true, reason: "failed to load bids (Appwrite error)" });
        continue;
      }

      if (!bids.length) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "no bids found in BIDS collection" });
        continue;
      }

      bids.sort((a, b) => {
        const bt = parseTimestamp(b.timestamp) || parseTimestamp(b.$createdAt);
        const at = parseTimestamp(a.timestamp) || parseTimestamp(a.$createdAt);
        return bt - at;
      });

      const winningBid = bids[0];
      const rawAmount = winningBid.amount !== undefined ? winningBid.amount : winningBid.bid_amount;
      const winningAmount = getNumeric(rawAmount);

      const winnerEmail = String(winningBid.bidder_email || "").trim();
      const winnerUserId = String(winningBid.bidder_id || "").trim() || null;

      if (!winnerEmail) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "winning bid has no bidder_email" });
        continue;
      }

      if (!winningAmount || winningAmount <= 0) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "winning bid has invalid amount" });
        continue;
      }

      const finalBidAmount = winningAmount || currentBid;
      const totalToCharge = finalBidAmount;
      const amountInPence = Math.round(totalToCharge * 100);

      // ✅ Load buyer profile snapshot from PROFILES_DB_ID (fixes delivery details)
      let buyerProfile: any = null;
      if ((winnerUserId || winnerEmail) && PROFILES_COLLECTION_ID) {
        if (winnerUserId) {
          try {
            buyerProfile = await databases.getDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, winnerUserId);
          } catch {
            buyerProfile = null;
          }
        }
        if (!buyerProfile && winnerEmail) {
          try {
            const found = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
              Query.equal("email", winnerEmail),
              Query.limit(1),
            ]);
            buyerProfile = found.documents[0] || null;
          } catch {
            buyerProfile = null;
          }
        }
      }

      try {
        const existing = await stripe.customers.list({ email: winnerEmail, limit: 10 });
        let customer = existing.data[0];
        if (!customer) customer = await stripe.customers.create({ email: winnerEmail });

        const paymentMethod = await pickPaymentMethodForCustomer(customer.id);

        if (!paymentMethod) {
          try {
            await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
              sale_status: "payment_required",
              payment_status: "unpaid",
              buyer_email: winnerEmail,
              buyer_id: winnerUserId,
            });
          } catch {}

          const txFail = await createPaymentFailedTransaction({
            databases,
            listing,
            finalBidAmount,
            winnerEmail,
            winnerUserId,
            reason: "No saved card on file.",
            buyerProfile,
          });

          try {
            const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();
            if (mailer && isValidEmail(FROM_ADDRESS)) {
              await sendPaymentRequiredEmails({
                mailer,
                listing,
                winnerEmail,
                sellerEmail,
                finalBidAmount,
                reason: "No saved card on file.",
              });
            }
          } catch {}

          winnerCharges.push({
            listingId: lid,
            charged: false,
            reason: "winner has no saved card",
            winnerEmail,
            transactionId: txFail?.$id || null,
          });
          continue;
        }

        // ✅ Stronger idempotency: key is listingId only (not amount)
        const idempotencyKey = `winner-charge-${lid}`;

        const label = getListingLabel(listing);
        const description = `Auction winner - ${label}`;

        const intent = await stripe.paymentIntents.create(
          {
            amount: amountInPence,
            currency: "gbp",
            customer: customer.id,
            payment_method: paymentMethod.id,
            confirm: true,
            off_session: true,
            description,
            metadata: {
              listingId: lid,
              winnerEmail,
              winnerUserId: winnerUserId || "",
              type: "auction_winner",
              finalBidAmount: String(finalBidAmount),
            },
          },
          { idempotencyKey }
        );

        // ✅ Write PI id onto listing immediately (prevents repeats)
        try {
          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
            stripe_payment_intent_id: intent.id,
          });
        } catch {}

        if (intent.status !== "succeeded") {
          try {
            await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
              sale_status: "payment_failed",
              payment_status: "unpaid",
              buyer_email: winnerEmail,
              buyer_id: winnerUserId,
            });
          } catch {}

          const txFail = await createPaymentFailedTransaction({
            databases,
            listing,
            finalBidAmount,
            winnerEmail,
            winnerUserId,
            paymentIntentId: intent.id,
            reason: `Stripe status: ${intent.status}`,
            buyerProfile,
          });

          try {
            const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();
            if (mailer && isValidEmail(FROM_ADDRESS)) {
              await sendPaymentRequiredEmails({
                mailer,
                listing,
                winnerEmail,
                sellerEmail,
                finalBidAmount,
                reason: `Stripe status: ${intent.status}`,
              });
            }
          } catch {}

          winnerCharges.push({
            listingId: lid,
            charged: false,
            winnerEmail,
            paymentIntentId: intent.id,
            paymentStatus: intent.status,
            reason: `PaymentIntent not succeeded (status: ${intent.status})`,
            transactionId: txFail?.$id || null,
          });
          continue;
        }

        // ✅ Payment succeeded: mark listing SOLD (fixes “ended” messaging issues)
        try {
          const commissionRate = getNumeric(listing.commission_rate);
          const soldPrice = finalBidAmount;
          const saleFee = commissionRate > 0 ? (soldPrice * commissionRate) / 100 : 0;
          const sellerNetAmount = Math.max(0, soldPrice - saleFee);

          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
            status: "sold",
            buyer_email: winnerEmail,
            buyer_id: winnerUserId,

            sold_price: soldPrice,
            sale_fee: saleFee,
            seller_net_amount: sellerNetAmount,

            sale_status: "winner_charged",
            payment_status: "paid",
            payout_status: "pending",
            sold_at: new Date().toISOString(),
          });
        } catch (updateErr) {
          console.error(`Failed to update listing doc for ${lid} after charge`, updateErr);
        }

        const tx = await createTransactionForWinner({
          databases,
          listing,
          finalBidAmount,
          winnerEmail,
          winnerUserId,
          paymentIntentId: intent.id,
          buyerProfile,
        });

        try {
          const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();
          if (mailer && isValidEmail(FROM_ADDRESS)) {
            await sendWinnerEmails({
              mailer,
              listing,
              winnerEmail,
              sellerEmail,
              finalBidAmount,
              paymentIntentId: intent.id,
              buyerProfile,
            });
          }
        } catch (mailErr) {
          console.error(`Failed to send winner emails for ${lid}`, mailErr);
        }

        winnerCharges.push({
          listingId: lid,
          charged: true,
          winnerEmail,
          winnerUserId,
          bid: finalBidAmount,
          totalCharged: totalToCharge,
          paymentIntentId: intent.id,
          paymentStatus: intent.status,
          transactionId: tx?.$id || null,
          paymentMethodId: paymentMethod.id,
        });
      } catch (err: any) {
        console.error(`Stripe error charging winner for listing ${lid}:`, err);

        const anyErr = err as any;
        const piId =
          anyErr?.raw?.payment_intent?.id || anyErr?.payment_intent?.id || anyErr?.paymentIntentId || "";

        try {
          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, lid, {
            sale_status: "payment_failed",
            payment_status: "unpaid",
            buyer_email: winnerEmail,
            buyer_id: winnerUserId,
            stripe_payment_intent_id: piId || "",
          });
        } catch {}

        const txFail = await createPaymentFailedTransaction({
          databases,
          listing,
          finalBidAmount,
          winnerEmail,
          winnerUserId,
          paymentIntentId: piId || "",
          reason: err?.message || "Stripe error charging winner.",
          buyerProfile,
        });

        try {
          const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();
          if (mailer && isValidEmail(FROM_ADDRESS)) {
            await sendPaymentRequiredEmails({
              mailer,
              listing,
              winnerEmail,
              sellerEmail,
              finalBidAmount,
              reason: err?.message || "Stripe charge failed.",
            });
          }
        } catch {}

        winnerCharges.push({
          listingId: lid,
          charged: false,
          winnerEmail,
          error: err?.message || "Stripe charge failed.",
          paymentIntentId: piId || undefined,
          transactionId: txFail?.$id || null,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      now: nowIso,
      promoted,
      repairedQueuedDates,
      completed,
      markedNotSold,
      relisted,
      relistEmailsSent,
      winnerCharges,
    });
  } catch (err: any) {
    console.error("auction-scheduler error", err);
    return NextResponse.json({ ok: false, error: err.message || "Unknown error" }, { status: 500 });
  }
}