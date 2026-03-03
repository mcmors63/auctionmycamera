// app/api/buy-now/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account, Query } from "node-appwrite";
import nodemailer from "nodemailer";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// STRIPE
// -----------------------------
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || "").trim();
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// -----------------------------
// APPWRITE (server-safe envs)
// -----------------------------
const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

// Listings DB (cameras)
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

// Transactions DB (separate DB in your Appwrite)
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

// -----------------------------
// CAMERA POLICY
// -----------------------------
const EXTRA_FEE_GBP = 0;

// -----------------------------
// SMTP / EMAIL
// -----------------------------
const smtpHost = (process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").trim();

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

const FROM_EMAIL =
  (
    process.env.FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    smtpUser ||
    "no-reply@auctionmycamera.co.uk"
  ).trim();

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[buy-now] SMTP not fully configured; emails will be skipped.");
    return null;
  }
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

function escapeText(s: any) {
  return String(s ?? "").replace(/[\r\n]+/g, " ").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function moneyGBP(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

// -----------------------------
// AUTH HELPERS (Appwrite JWT via Bearer token)
// -----------------------------
function getBearerJwt(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUser(req: NextRequest) {
  const jwt = getBearerJwt(req);
  if (!jwt) return null;

  if (!endpoint || !projectId) return null;

  const c = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(c);

  try {
    const u = await account.get();
    return { userId: u.$id as string, email: String((u as any).email || "").trim() };
  } catch {
    return null;
  }
}

function getServerDatabases() {
  const c = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(c);
}

// -----------------------------
// SCHEMA TOLERANCE HELPERS
// - Strips BOTH unknown attributes AND invalid-type attributes.
// -----------------------------
function stripBadFieldFromError(data: Record<string, any>, err: any) {
  const msg = String(err?.message || "");

  // Unknown attribute: foo
  const u = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
  if (u?.[1] && u[1] in data) {
    delete data[u[1]];
    return true;
  }

  // Attribute "foo" has invalid type
  const t = msg.match(/Attribute\s+"([^"]+)"\s+has\s+invalid\s+type/i);
  if (t?.[1] && t[1] in data) {
    delete data[t[1]];
    return true;
  }

  return false;
}

async function createDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 200; i++) {
    try {
      return await databases.createDocument(dbId, colId, ID.unique(), data);
    } catch (err: any) {
      const removed = stripBadFieldFromError(data, err);
      if (removed) continue;
      throw err;
    }
  }

  // last resort: create an empty doc so we don't brick the flow
  return await databases.createDocument(dbId, colId, ID.unique(), {});
}

async function updateDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 200; i++) {
    try {
      return await databases.updateDocument(dbId, colId, docId, data);
    } catch (err: any) {
      const removed = stripBadFieldFromError(data, err);
      if (removed) continue;
      throw err;
    }
  }

  // minimal fallback
  return await databases.updateDocument(dbId, colId, docId, {});
}

// -----------------------------
// LISTING HELPERS
// -----------------------------
function getBuyNowPriceGBP(listing: any): number {
  const a = listing?.buy_now_price;
  const b = listing?.buy_now;
  const c = listing?.buyNowPrice;
  const d = listing?.buyNow;

  const n =
    typeof a === "number"
      ? a
      : typeof b === "number"
      ? b
      : typeof c === "number"
      ? c
      : typeof d === "number"
      ? d
      : NaN;

  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

function getItemTitle(listing: any): string {
  const t = String(listing?.item_title || listing?.title || "").trim();
  if (t) return t;
  const brand = String(listing?.brand || "").trim();
  const model = String(listing?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  return bm || "your item";
}

// -----------------------------
// POST /api/buy-now
// Body: { listingId, paymentIntentId }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 500 });
    }

    const authed = await requireAuthedUser(req);
    if (!authed?.email || !authed.userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json({ error: "Server listings DB/collection configuration missing." }, { status: 500 });
    }

    if (!TX_DB_ID || !TX_COLLECTION_ID) {
      return NextResponse.json({ error: "Server transactions DB/collection configuration missing." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({} as any));
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
    const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

    if (!listingId || !paymentIntentId) {
      return NextResponse.json({ error: "listingId and paymentIntentId are required." }, { status: 400 });
    }

    const databases = getServerDatabases();

    // Idempotency guard (transactions DB)
    try {
      const existingTx = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
        Query.equal("stripe_payment_intent_id", paymentIntentId),
        Query.limit(1),
      ]);

      if (existingTx.documents?.length) {
        return NextResponse.json(
          { ok: true, alreadyProcessed: true, transactionId: (existingTx.documents[0] as any).$id },
          { status: 200 }
        );
      }
    } catch (e) {
      console.warn("[buy-now] Could not query existing transaction by stripe_payment_intent_id", e);
    }

    // 1) Load listing (listings DB)
    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    const currentStatus = String(listing?.status || "").trim().toLowerCase();
    if (currentStatus === "sold") return NextResponse.json({ error: "This listing is already sold." }, { status: 409 });
    if (currentStatus === "completed")
      return NextResponse.json({ error: "This listing has completed via auction." }, { status: 409 });

    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim();
    if (!sellerEmail) return NextResponse.json({ error: "Listing has no seller email set." }, { status: 400 });

    // 2) Buy Now price from listing
    const buyNowPrice = getBuyNowPriceGBP(listing);
    if (!buyNowPrice) return NextResponse.json({ error: "This listing does not have a valid Buy Now price." }, { status: 400 });

    const expectedTotal = buyNowPrice + EXTRA_FEE_GBP;
    const expectedAmountPence = Math.round(expectedTotal * 100);

    // 3) Verify Stripe PI
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!pi || (pi.currency || "").toLowerCase() !== "gbp") return NextResponse.json({ error: "Invalid payment intent." }, { status: 400 });
    if (pi.status !== "succeeded") return NextResponse.json({ error: `Payment not completed (status: ${pi.status}).` }, { status: 400 });
    if (pi.amount !== expectedAmountPence) return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });

    const metaListingId = String(pi.metadata?.listingId || pi.metadata?.listing_id || "").trim();
    if (metaListingId && metaListingId !== listingId) return NextResponse.json({ error: "Payment metadata mismatch (listingId)." }, { status: 400 });

    const buyerEmail = authed.email.trim();
    if (!buyerEmail || !isValidEmail(buyerEmail)) return NextResponse.json({ error: "Authenticated user has no valid email." }, { status: 400 });

    const metaBuyerEmail = String(pi.metadata?.buyerEmail || pi.metadata?.buyer_email || "").trim().toLowerCase();
    if (metaBuyerEmail && metaBuyerEmail !== buyerEmail.toLowerCase())
      return NextResponse.json({ error: "Payment metadata mismatch (buyer)." }, { status: 403 });

    // best-effort customer match
    if (pi.customer && typeof pi.customer === "string") {
      try {
        const c = await stripe.customers.retrieve(pi.customer);
        if (!("deleted" in c) && c.email && c.email.toLowerCase() !== buyerEmail.toLowerCase()) {
          return NextResponse.json({ error: "Payment customer does not match buyer." }, { status: 403 });
        }
      } catch {}
    }

    // 4) Settlement
    const commissionRate =
      typeof listing?.commission_rate === "number" && listing.commission_rate >= 0 ? listing.commission_rate : 10;

    const listingFee =
      typeof listing?.listing_fee === "number" && listing.listing_fee >= 0 ? listing.listing_fee : 0;

    const salePrice = buyNowPrice; // GBP
    const commissionAmount = Math.round((salePrice * commissionRate) / 100);
    const sellerPayout = Math.max(0, salePrice - commissionAmount - listingFee);

    const nowIso = new Date().toISOString();
    const itemTitle = getItemTitle(listing);

    // ✅ Camera transaction payload ONLY (no old plate workflow flags)
    const txPayload: Record<string, any> = {
      listing_id: listing.$id,
      item_title: itemTitle,
      seller_email: sellerEmail,
      buyer_email: buyerEmail,
      buyer_id: authed.userId,

      sale_price: salePrice,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,

      payment_status: "paid",
      transaction_status: "dispatch_pending",

      stripe_payment_intent_id: paymentIntentId,

      created_at: nowIso,
      updated_at: nowIso,
    };

    const txDoc: any = await createDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txPayload);

    // 6) Mark listing sold (listings DB)
    await updateDocSchemaTolerant(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listing.$id, {
      status: "sold",
      sold_price: salePrice,
      buyer_email: buyerEmail,
      buyer_id: authed.userId,
      sale_status: "sold_buy_now",
      payout_status: "pending",
      updated_at: nowIso,
    });

    const updatedListing = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listing.$id);

    // 7) Emails (best-effort)
    const transporter = getTransporter();
    if (transporter) {
      const prettySale = moneyGBP(salePrice);
      const prettyCommission = moneyGBP(commissionAmount);
      const prettyPayout = moneyGBP(sellerPayout);

      const sellerDashboardUrl = `${siteUrl}/dashboard?tab=transactions`;
      const buyerDashboardUrl = `${siteUrl}/dashboard?tab=purchases`;
      const adminTxUrl = `${siteUrl}/admin`;

      const from = { name: FROM_NAME, address: FROM_EMAIL };

      try {
        if (ADMIN_EMAIL && isValidEmail(ADMIN_EMAIL)) {
          await transporter.sendMail({
            from,
            to: ADMIN_EMAIL,
            subject: `Buy Now – ${escapeText(itemTitle)} purchased`,
            text: `Buy Now purchase

Item: ${itemTitle}
Sale price: ${prettySale}
Buyer: ${buyerEmail}
Seller: ${sellerEmail}

Commission (${commissionRate}%): ${prettyCommission}
Seller payout (expected): ${prettyPayout}

Transaction ID: ${txDoc.$id}

Admin dashboard: ${adminTxUrl}
`,
          });
        }
      } catch (err) {
        console.error("[buy-now] Failed to send admin email:", err);
      }

      try {
        await transporter.sendMail({
          from,
          to: sellerEmail,
          subject: `🎉 Your item has sold via Buy Now`,
          text: `Good news!

Your item "${itemTitle}" has been sold via Buy Now on AuctionMyCamera for ${prettySale}.

Our commission (${commissionRate}%): ${prettyCommission}
Amount due to you (subject to completion steps): ${prettyPayout}

Track progress in your dashboard:
${sellerDashboardUrl}

Thank you for using AuctionMyCamera.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send seller email:", err);
      }

      try {
        await transporter.sendMail({
          from,
          to: buyerEmail,
          subject: `Your Buy Now purchase is confirmed`,
          text: `Thank you for your purchase.

You’ve successfully bought "${itemTitle}" via Buy Now for ${prettySale}.

Track this purchase in your dashboard:
${buyerDashboardUrl}

Thank you for using AuctionMyCamera.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send buyer email:", err);
      }
    }

    return NextResponse.json({ ok: true, transactionId: txDoc.$id, updatedListing }, { status: 200 });
  } catch (err: any) {
    console.error("[buy-now] fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error in Buy Now. Please contact support." },
      { status: 500 }
    );
  }
}