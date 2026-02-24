// app/api/transactions/create-from-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV: Appwrite (server-safe)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const project =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// Listings
const listingsDbId =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const listingsCollectionId =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// Transactions
const txDbId =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  "";

const txCollectionId =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

// -----------------------------
// ENV: SMTP / Site
// -----------------------------
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

// ✅ Camera domain, not plate
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim();

// ✅ Prefer an explicit from address if you have one
const fromEmail =
  (process.env.FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    smtpUser ||
    "admin@auctionmycamera.co.uk").trim();

// -----------------------------
// Helpers
// -----------------------------
function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(project);
  client.setKey(apiKey);
  return client;
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[create-from-sale] SMTP not fully configured. Emails will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getListingTitle(listing: any) {
  const itemTitle = String(listing?.item_title || listing?.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(listing?.brand || "").trim();
  const model = String(listing?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  return "your item";
}

function toWholePoundsNonNegative(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value < 0) return fallback;
  return Math.round(value);
}

// Schema-tolerant create/update so Appwrite schema differences don't brick the route.
async function createDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 12; i++) {
    try {
      return await databases.createDocument(dbId, colId, ID.unique(), data);
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

  // last resort minimal
  return await databases.createDocument(dbId, colId, ID.unique(), {
    listing_id: payload.listing_id,
    seller_email: payload.seller_email,
    buyer_email: payload.buyer_email || "",
    sale_price: payload.sale_price,
    payment_status: payload.payment_status || "pending",
    transaction_status: payload.transaction_status || "pending",
  });
}

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

  // minimal fallback
  return await databases.updateDocument(dbId, colId, docId, { status: payload.status });
}

/**
 * Body:
 * {
 *   listingId: string;    // listings doc $id
 *   buyerEmail: string;
 *   finalPrice: number;   // £ amount (whole pounds integer)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !project || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    if (!listingsDbId || !txDbId) {
      return NextResponse.json(
        { error: "Missing DB env. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_TRANSACTIONS_DATABASE_ID." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = String(body.listingId || "").trim();
    const buyerEmail = String(body.buyerEmail || "").trim();
    const finalPrice = Number(body.finalPrice);

    console.log("[create-from-sale] Incoming", { listingId, buyerEmail, finalPrice });

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }
    if (!buyerEmail) {
      return NextResponse.json({ error: "buyerEmail is required" }, { status: 400 });
    }
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return NextResponse.json({ error: "finalPrice must be a positive number" }, { status: 400 });
    }
    // ✅ Settlement logic expects whole pounds; enforce it at the boundary.
    if (!Number.isInteger(finalPrice)) {
      return NextResponse.json(
        { error: "finalPrice must be a whole pounds integer (e.g. 250)" },
        { status: 400 }
      );
    }

    const client = getAppwriteClient();
    const databases = new Databases(client);

    // 1) Load the listing
    const listing: any = await databases.getDocument(listingsDbId, listingsCollectionId, listingId);

    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim();
    if (!sellerEmail) {
      console.warn("[create-from-sale] Listing has no seller email. Seller email will be skipped.");
    }

    const itemTitle = getListingTitle(listing);

    // 2) Settlement (camera logic)
    const listingFee = toWholePoundsNonNegative(listing?.listing_fee, 0);

    const commissionRateOverride =
      typeof listing?.commission_rate === "number" && Number.isFinite(listing.commission_rate) && listing.commission_rate >= 0
        ? listing.commission_rate
        : undefined;

    const settlement = calculateSettlement(finalPrice, {
      listingFee,
      commissionRateOverride,
    });

    const nowIso = new Date().toISOString();

    // 3) Create transaction (schema-tolerant)
    const txDoc = await createDocSchemaTolerant(databases, txDbId, txCollectionId, {
      listing_id: listing.$id,
      seller_email: sellerEmail || null,
      buyer_email: buyerEmail,

      item_title: itemTitle,
      sale_price: finalPrice,

      commission_rate: settlement.commissionRate,
      commission_amount: settlement.commissionAmount,
      seller_payout: settlement.sellerPayout,

      listing_fee: settlement.listingFeeApplied,

      payment_status: "pending",
      transaction_status: "awaiting_payment",

      created_at: nowIso,
      updated_at: nowIso,
    });

    console.log("[create-from-sale] Created transaction", { txId: txDoc.$id });

    // 4) Mark listing as sold (schema-tolerant)
    await updateDocSchemaTolerant(databases, listingsDbId, listingsCollectionId, listing.$id, {
      status: "sold",
      sold_price: finalPrice,
      current_bid: finalPrice,
    });

    // 5) Emails (best-effort)
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[create-from-sale] SMTP not configured – skipping emails.");
    } else {
      const prettyPrice = finalPrice.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
      const prettyCommission = settlement.commissionAmount.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyPayout = settlement.sellerPayout.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const dashboardUrl = `${siteUrl}/dashboard?tab=transactions`;

      // Buyer email
      try {
        await transporter.sendMail({
          from: `"AuctionMyCamera" <${fromEmail}>`,
          to: buyerEmail,
          subject: `Next steps for your purchase on AuctionMyCamera`,
          text: [
            `Thank you — your purchase is now in progress.`,
            ``,
            `Item: ${itemTitle}`,
            `Final price: ${prettyPrice}`,
            ``,
            `You can track this in your dashboard:`,
            dashboardUrl,
            ``,
            `AuctionMyCamera.co.uk`,
          ].join("\n"),
          html: `
            <p>Thank you — your purchase is now in progress.</p>
            <p>
              <strong>Item:</strong> ${escapeHtml(itemTitle)}<br/>
              <strong>Final price:</strong> ${escapeHtml(prettyPrice)}
            </p>
            <p>
              Track this in your dashboard:<br/>
              <a href="${dashboardUrl}">${dashboardUrl}</a>
            </p>
            <p>AuctionMyCamera.co.uk</p>
          `,
        });
      } catch (buyerErr) {
        console.error("[create-from-sale] Buyer email failed:", buyerErr);
      }

      // Seller email
      try {
        if (sellerEmail) {
          await transporter.sendMail({
            from: `"AuctionMyCamera" <${fromEmail}>`,
            to: sellerEmail,
            subject: `Sold: ${itemTitle} on AuctionMyCamera`,
            text: [
              `Good news!`,
              ``,
              `Your item has sold on AuctionMyCamera.`,
              `Item: ${itemTitle}`,
              `Sale price: ${prettyPrice}`,
              `Commission (${settlement.commissionRate}%): ${prettyCommission}`,
              `Expected payout (after fees): ${prettyPayout}`,
              ``,
              `Track progress in your dashboard:`,
              dashboardUrl,
              ``,
              `AuctionMyCamera.co.uk`,
            ].join("\n"),
            html: `
              <p>Good news!</p>
              <p>Your item has sold on AuctionMyCamera.</p>
              <p>
                <strong>Item:</strong> ${escapeHtml(itemTitle)}<br/>
                <strong>Sale price:</strong> ${escapeHtml(prettyPrice)}<br/>
                <strong>Commission (${settlement.commissionRate}%):</strong> ${escapeHtml(prettyCommission)}<br/>
                <strong>Expected payout (after fees):</strong> ${escapeHtml(prettyPayout)}
              </p>
              <p>
                Track progress in your dashboard:<br/>
                <a href="${dashboardUrl}">${dashboardUrl}</a>
              </p>
              <p>AuctionMyCamera.co.uk</p>
            `,
          });
        }
      } catch (sellerErr) {
        console.error("[create-from-sale] Seller email failed:", sellerErr);
      }

      // Admin email (optional)
      try {
        if (adminEmail) {
          await transporter.sendMail({
            from: `"AuctionMyCamera" <${fromEmail}>`,
            to: adminEmail,
            subject: `New sale created: ${itemTitle}`,
            text: [
              `A sale transaction has been created.`,
              ``,
              `Item: ${itemTitle}`,
              `Sale price: ${prettyPrice}`,
              `Commission (${settlement.commissionRate}%): ${prettyCommission}`,
              `Seller payout (expected): ${prettyPayout}`,
              ``,
              `Seller: ${sellerEmail || "N/A"}`,
              `Buyer: ${buyerEmail}`,
              `Transaction ID: ${txDoc.$id}`,
            ].join("\n"),
          });
        }
      } catch (adminErr) {
        console.error("[create-from-sale] Admin email failed:", adminErr);
      }
    }

    return NextResponse.json({ success: true, transactionId: txDoc.$id }, { status: 200 });
  } catch (err: any) {
    console.error("[create-from-sale] error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create transaction" }, { status: 500 });
  }
}