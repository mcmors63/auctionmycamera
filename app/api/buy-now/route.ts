// app/api/buy-now/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account } from "node-appwrite";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// Stripe (VERIFY)
// -----------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// -----------------------------
// ENV / APPWRITE
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

const DVLA_FEE_GBP = 80;

const LEGACY_BUYER_PAYS_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

// -----------------------------
// AUTH HELPERS (Appwrite JWT)
// -----------------------------
function getBearerJwt(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUser(req: NextRequest) {
  const jwt = getBearerJwt(req);
  if (!jwt) return null;

  const c = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(c);

  try {
    const u = await account.get();
    return { userId: u.$id as string, email: (u as any).email as string };
  } catch {
    return null;
  }
}

// -----------------------------
// SMTP
// -----------------------------
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

function getAppwriteDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[buy-now] SMTP not fully configured, emails will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

// -----------------------------
// POST /api/buy-now
// Body: { listingId, paymentIntentId, totalCharged }
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

    const body = await req.json().catch(() => ({} as any));

    const listingId = body.listingId as string | undefined;
    const paymentIntentId = body.paymentIntentId as string | undefined;
    const totalChargedRaw = body.totalCharged;

    if (!listingId || !paymentIntentId) {
      return NextResponse.json({ error: "listingId and paymentIntentId are required." }, { status: 400 });
    }

    const totalCharged = Number(totalChargedRaw);
    if (!Number.isFinite(totalCharged) || totalCharged <= 0) {
      return NextResponse.json({ error: "totalCharged must be a positive number." }, { status: 400 });
    }

    const expectedAmountPence = Math.round(totalCharged * 100);

    // 0) VERIFY STRIPE PAYMENT INTENT (MUST be succeeded + match listing + amount)
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!pi || (pi.currency || "").toLowerCase() !== "gbp") {
      return NextResponse.json({ error: "Invalid payment intent." }, { status: 400 });
    }

    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: `Payment not completed (status: ${pi.status}).` }, { status: 400 });
    }

    if (pi.amount !== expectedAmountPence) {
      return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
    }

    const metaListingId = (pi.metadata?.listingId || pi.metadata?.listing_id || "").trim();
    if (metaListingId && metaListingId !== listingId) {
      return NextResponse.json({ error: "Payment metadata mismatch (listingId)." }, { status: 400 });
    }

    // Best-effort buyer match
    const buyerEmail = authed.email;
    const metaBuyerEmail = (pi.metadata?.buyerEmail || "").trim().toLowerCase();
    if (metaBuyerEmail && metaBuyerEmail !== buyerEmail.toLowerCase()) {
      return NextResponse.json({ error: "Payment metadata mismatch (buyer)." }, { status: 403 });
    }

    if (pi.customer && typeof pi.customer === "string") {
      try {
        const c = await stripe.customers.retrieve(pi.customer);
        if (!("deleted" in c) && c.email && c.email.toLowerCase() !== buyerEmail.toLowerCase()) {
          return NextResponse.json({ error: "Payment customer does not match buyer." }, { status: 403 });
        }
      } catch {
        // ignore
      }
    }

    if (!DB_ID || !PLATES_COLLECTION_ID || !TX_COLLECTION_ID) {
      return NextResponse.json({ error: "Server configuration missing for database/collections." }, { status: 500 });
    }

    const databases = getAppwriteDatabases();

    // 1) Load listing
    const listing = await databases.getDocument(DB_ID, PLATES_COLLECTION_ID, listingId);

    const currentStatus = String((listing as any).status || "");
    if (currentStatus === "sold") {
      return NextResponse.json({ error: "This listing is already sold." }, { status: 409 });
    }

    const reg = ((listing as any).registration as string) || "Unknown";
    const sellerEmail = (listing as any).seller_email as string | undefined;
    const commissionRateFromListing = (listing as any).commission_rate as number | undefined;

    if (!sellerEmail) {
      return NextResponse.json({ error: "Listing has no seller_email set." }, { status: 400 });
    }

    // 2) Decide who pays DVLA fee (SERVER ENFORCED)
    const isLegacyBuyerPays = LEGACY_BUYER_PAYS_IDS.has(listing.$id);
    const buyerPaysTransferFee = isLegacyBuyerPays;
    const dvlaFeeChargedToBuyer = buyerPaysTransferFee ? DVLA_FEE_GBP : 0;

    if (buyerPaysTransferFee && totalCharged < DVLA_FEE_GBP) {
      return NextResponse.json({ error: "Legacy listing totalCharged is invalid (must include DVLA fee)." }, { status: 400 });
    }

    // 3) Plate sale price (plate-only)
    const salePrice = Math.max(0, totalCharged - dvlaFeeChargedToBuyer);

    // 4) Settlement
    const settlement = calculateSettlement(salePrice);

    const commissionRate =
      typeof commissionRateFromListing === "number" && commissionRateFromListing > 0
        ? commissionRateFromListing
        : settlement.commissionRate;

    const commissionAmount = settlement.commissionAmount;
    const sellerPayoutBeforeDvla = settlement.sellerPayout;

    const sellerDvlaDeduction = buyerPaysTransferFee ? 0 : DVLA_FEE_GBP;
    const sellerPayout = Math.max(0, sellerPayoutBeforeDvla - sellerDvlaDeduction);

    const dvlaFee = DVLA_FEE_GBP;
    const nowIso = new Date().toISOString();

    // 5) Create transaction doc
    const txDoc = await databases.createDocument(DB_ID, TX_COLLECTION_ID, ID.unique(), {
      listing_id: listing.$id,
      registration: reg,
      seller_email: sellerEmail,
      buyer_email: buyerEmail,

      sale_price: salePrice,

      commission_rate: commissionRate,
      commission_amount: commissionAmount,

      seller_payout: sellerPayout,
      dvla_fee: dvlaFee,

      payment_status: "paid",
      transaction_status: "awaiting_documents",
      stripe_payment_intent_id: paymentIntentId,

      created_at: nowIso,
      updated_at: nowIso,

      seller_docs_requested: true,
      seller_docs_received: false,
      seller_payment_transferred: false,
      seller_process_complete: false,

      buyer_info_requested: true,
      buyer_info_received: false,
      buyer_tax_mot_validated: false,
      buyer_payment_taken: true,
      buyer_transfer_complete: false,

      documents: [],
    });

    // 6) Mark plate as sold
    await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, listing.$id, {
      status: "sold",
      sold_price: salePrice,
      buyer_email: buyerEmail,
      sale_status: "sold_buy_now",
      payout_status: "pending",
    });

    const updatedListing = await databases.getDocument(DB_ID, PLATES_COLLECTION_ID, listing.$id);

    // 7) Emails (best-effort)
    const transporter = getTransporter();
    if (transporter) {
      const prettySale = salePrice.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
      const prettyCommission = commissionAmount.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
      const prettyPayout = sellerPayout.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
      const prettyDvla = dvlaFee.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

      const sellerDashboardUrl = `${siteUrl}/dashboard?tab=transactions`;
      const buyerDashboardUrl = `${siteUrl}/dashboard?tab=purchases`;
      const adminTxUrl = `${siteUrl}/admin?tab=transactions`;

      const dvlaAdminLine = buyerPaysTransferFee
        ? `DVLA fee (charged to buyer): ${prettyDvla}`
        : `DVLA fee (included seller-side; deducted from payout): ${prettyDvla}`;

      const dvlaSellerLine = buyerPaysTransferFee
        ? `DVLA assignment fee (paid by buyer): ${prettyDvla}`
        : `DVLA assignment fee (covered seller-side): ${prettyDvla}`;

      const dvlaBuyerLine = buyerPaysTransferFee
        ? `A DVLA paperwork fee of ${prettyDvla} has also been charged.`
        : `No additional DVLA paperwork fee was added at checkout (transfer handling is included seller-side).`;

      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: ADMIN_EMAIL,
          subject: `Buy Now – ${reg} purchased`,
          text: `Buy Now purchase

Plate: ${reg}
Plate sale price: ${prettySale}
Buyer: ${buyerEmail}
Seller: ${sellerEmail}

Commission: ${prettyCommission}
${dvlaAdminLine}
Seller payout (expected): ${prettyPayout}

Transaction ID: ${txDoc.$id}

Admin dashboard: ${adminTxUrl}
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send admin email:", err);
      }

      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: sellerEmail,
          subject: `🎉 Your plate ${reg} has sold via Buy Now`,
          text: `Good news!

Your registration ${reg} has been sold via Buy Now on AuctionMyPlate for ${prettySale}.

Our commission (${commissionRate}%): ${prettyCommission}
${dvlaSellerLine}
Amount due to you (subject to successful transfer): ${prettyPayout}

You can track this sale in your dashboard:
${sellerDashboardUrl}

Thank you for using AuctionMyPlate.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send seller celebration email:", err);
      }

      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: buyerEmail,
          subject: `You’ve bought ${reg} via Buy Now`,
          text: `Thank you for your purchase.

You’ve successfully bought registration ${reg} on AuctionMyPlate for ${prettySale}.
${dvlaBuyerLine}

You can track this purchase in your dashboard:
${buyerDashboardUrl}

Thank you for using AuctionMyPlate.co.uk.
`,
        });
      } catch (err) {
        console.error("[buy-now] Failed to send buyer email:", err);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        transactionId: txDoc.$id,
        buyerPaysTransferFee,
        policy: buyerPaysTransferFee ? "legacy_buyer_pays" : "new_seller_pays",
        updatedListing,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[buy-now] fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error in Buy Now. Please contact support." },
      { status: 500 }
    );
  }
}
