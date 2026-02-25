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

// DB + collections
const DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

const BIDS_COLLECTION_ID =
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  "";

const TRANSACTIONS_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "";

  const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";
  
function getDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
  if (!DB_ID || !LISTINGS_COLLECTION_ID) return null;

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

  // Your existing methods (keep for manual testing)
  const q = (req.nextUrl.searchParams.get("secret") || "").trim();
  const h = (req.headers.get("x-cron-secret") || "").trim();
  return q === CRON_SECRET || h === CRON_SECRET;
}

// -----------------------------
// STRIPE
// -----------------------------
const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

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
  const {
    databases,
    listing,
    finalBidAmount,
    winnerEmail,
    winnerUserId,
    paymentIntentId,
    buyerProfile,
  } = params;

  if (!TRANSACTIONS_COLLECTION_ID) {
    console.warn("No TRANSACTIONS_COLLECTION_ID configured; skipping transaction creation.");
    return null;
  }

  const nowIso = new Date().toISOString();

  const listingId = String(listing.$id || "");
  const label = getListingLabel(listing);

  const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();

  const commissionRate = getNumeric(listing.commission_rate); // % e.g. 10
  const salePrice = Math.round(finalBidAmount);

  const commissionAmount = Math.round(commissionRate > 0 ? (salePrice * commissionRate) / 100 : 0);
  const sellerPayout = Math.max(0, salePrice - commissionAmount - EXTRA_FEE_GBP);

  // Snapshot delivery fields (safe if schema doesn't include them)
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

    // ✅ IMPORTANT: only create tx after Stripe says "succeeded"
    payment_status: "paid",
    transaction_status: "dispatch_pending",

    created_at: nowIso,

    registration: label,
    stripe_payment_intent_id: paymentIntentId,

    ...delivery,

    // Optional future flags (safe to ignore if schema doesn’t include them)
    seller_dispatch_status: "pending",
    buyer_receipt_status: "pending",
  };

  try {
    const doc = await databases.createDocument(DB_ID, TRANSACTIONS_COLLECTION_ID, ID.unique(), data);
    return doc as any;
  } catch (err) {
    console.error("Failed to create transaction document for listing", listingId, err);
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
}) {
  const { mailer, listing, winnerEmail, sellerEmail, finalBidAmount, paymentIntentId } = params;

  const label = getListingLabel(listing);
  const amountLabel = `£${finalBidAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const buyerLink = `${SITE_URL}/dashboard?tab=transactions`;
  const sellerLink = `${SITE_URL}/dashboard?tab=transactions`;
  const listingLink = `${SITE_URL}/listing/${listing.$id}`;

  const from = { name: FROM_NAME, address: FROM_ADDRESS };

  // Buyer
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

  // Seller
  if (isValidEmail(sellerEmail) && isValidEmail(FROM_ADDRESS)) {
    await mailer.sendMail({
      from,
      to: sellerEmail,
      subject: `✅ Sold: ${label} — buyer payment received`,
      text: [
        `Good news — your item has sold: ${label}`,
        ``,
        `Buyer payment received: ${amountLabel}`,
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

  // Admin (optional)
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

    if (!DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json({ ok: false, error: "Missing listings DB/collection env config." }, { status: 500 });
    }

    const databases = getDatabases();
    if (!databases) {
      return NextResponse.json({ ok: false, error: "Appwrite client could not be initialised." }, { status: 500 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const nowTs = now.getTime();

    // ---------------------------------
    // 1) Promote queued -> live
    // ---------------------------------
    const queuedDocs = await listAllDocs({
      databases,
      dbId: DB_ID,
      colId: LISTINGS_COLLECTION_ID,
      queries: [Query.equal("status", ["queued", "approvedQueued"]), Query.orderAsc("$createdAt")],
      pageSize: 200,
      hardLimit: 5000,
    });

    let promoted = 0;

    for (const doc of queuedDocs as any[]) {
      const startTs = parseTimestamp(doc.auction_start);
      if (!startTs) continue;
      if (startTs > nowTs) continue;

      await databases.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, doc.$id, { status: "live" });
      promoted++;
    }

    // ---------------------------------
    // 2) End live auctions
    // ---------------------------------
    const liveToEndDocs = await listAllDocs({
      databases,
      dbId: DB_ID,
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
    const mailer = getMailer();

    for (const doc of liveToEndDocs as any[]) {
      const lid = doc.$id as string;

      const currentBid = getNumeric(doc.current_bid);
      const reserve = getNumeric(doc.reserve_price);
      const wantsAutoRelist = !!doc.relist_until_sold;

      const hasBid = currentBid > 0;
      const reserveMet = reserve <= 0 ? hasBid : currentBid >= reserve;

      if (hasBid && reserveMet) {
        const updated = await databases.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, lid, { status: "completed" });
        completed++;
        justCompletedForCharging.push(updated);
        continue;
      }

      if (wantsAutoRelist) {
        const { currentStart, currentEnd, nextStart, nextEnd, now: wnNow } = getAuctionWindow();

        const useNext = wnNow.getTime() > currentEnd.getTime();
        const start = useNext ? nextStart : currentStart;
        const end = useNext ? nextEnd : currentEnd;

        await databases.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, lid, {
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

      await databases.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, lid, { status: "not_sold" });
      markedNotSold++;
    }

    // ---------------------------------
    // 3) Charge winners for completed listings only
    // ---------------------------------
    if (!stripe || !BIDS_COLLECTION_ID) {
      return NextResponse.json({
        ok: true,
        now: nowIso,
        promoted,
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
          dbId: DB_ID,
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

      // Sort by timestamp desc (your intent)
      bids.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));

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
      const totalToCharge = finalBidAmount; // cameras: no extra fee
      const amountInPence = Math.round(totalToCharge * 100);

      try {
        const existing = await stripe.customers.list({ email: winnerEmail, limit: 10 });
        let customer = existing.data[0];
        if (!customer) customer = await stripe.customers.create({ email: winnerEmail });

        const paymentMethod = await pickPaymentMethodForCustomer(customer.id);

        if (!paymentMethod) {
          winnerCharges.push({
            listingId: lid,
            skipped: true,
            reason: "winner has no saved card in Stripe (must add card via payment-method page)",
            winnerEmail,
          });
          continue;
        }

        // ✅ Harden idempotency: include amount so we don't collide if totals change
        const idempotencyKey = `winner-charge-${lid}-${amountInPence}`;

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

        // ✅ CRITICAL HARDENING:
        // Only mark listing/tx/emails as paid if Stripe says succeeded.
        if (intent.status !== "succeeded") {
          winnerCharges.push({
            listingId: lid,
            charged: false,
            winnerEmail,
            paymentIntentId: intent.id,
            paymentStatus: intent.status,
            reason: `PaymentIntent not succeeded (status: ${intent.status})`,
          });
          continue;
        }

        // Update listing doc (best-effort)
        try {
          const commissionRate = getNumeric(listing.commission_rate);
          const soldPrice = finalBidAmount;
          const saleFee = commissionRate > 0 ? (soldPrice * commissionRate) / 100 : 0;
          const sellerNetAmount = Math.max(0, soldPrice - saleFee);

          await databases.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, lid, {
            buyer_email: winnerEmail,
            buyer_id: winnerUserId,

            sold_price: soldPrice,
            sale_fee: saleFee,
            seller_net_amount: sellerNetAmount,

            sale_status: "winner_charged",
            payout_status: "pending",
          });
        } catch (updateErr) {
          console.error(`Failed to update listing doc for ${lid} after charge`, updateErr);
        }

        // Load buyer profile snapshot
let buyerProfile: any = null;

if (winnerUserId && PROFILES_COLLECTION_ID) {
  try {
    buyerProfile = await databases.getDocument(
      DB_ID,
      PROFILES_COLLECTION_ID,
      winnerUserId
    );
  } catch {
    // fallback: try by email
    try {
      const found = await databases.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
        Query.equal("email", winnerEmail),
        Query.limit(1),
      ]);
      buyerProfile = found.documents[0] || null;
    } catch {
      buyerProfile = null;
    }
  }
}
        // Create transaction (pipeline starts) — only after succeeded
        const tx = await createTransactionForWinner({
  databases,
  listing,
  finalBidAmount,
  winnerEmail,
  winnerUserId,
  paymentIntentId: intent.id,
  buyerProfile,
});

        // Emails (best-effort; do not fail cron) — only after succeeded
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
        const entry: any = {
          listingId: lid,
          charged: false,
          winnerEmail,
          error: err?.message || "Stripe charge failed.",
        };
        const anyErr = err as any;
        if (anyErr?.raw?.payment_intent) {
          entry.paymentIntentId = anyErr.raw.payment_intent.id;
          entry.paymentStatus = anyErr.raw.payment_intent.status;
        }
        winnerCharges.push(entry);
      }
    }

    return NextResponse.json({
      ok: true,
      now: nowIso,
      promoted,
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