// app/api/transactions/create-from-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV: Appwrite (server-safe first, then fallbacks)
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

// Keep your default, but allow override
const listingsCollectionId =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// Transactions
const txDbId =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  "";

// Keep your default, but allow override
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

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

const adminEmail =
  (process.env.ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    "admin@auctionmycamera.co.uk"
  )
    .trim()
    .toLowerCase();

// -----------------------------
// Helpers
// -----------------------------
function getAppwriteClient() {
  if (!endpoint || !project || !apiKey) return null;

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

function escapeHtml(input: any) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safe wrapper so we never call sendMail with an empty "to"
 */
async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions,
  label: string
) {
  const rawTo = opts.to;
  let recipients: string[] = [];

  if (typeof rawTo === "string") {
    recipients = rawTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawTo)) {
    recipients = rawTo.map(String).map((s) => s.trim()).filter(Boolean);
  }

  if (!recipients.length) {
    console.warn(`[create-from-sale] ${label}: no valid recipients, skipping email.`);
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log(`[create-from-sale] Sending ${label} email to:`, finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Create a document but automatically remove unknown attributes if the schema is stricter than expected.
 */
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

  // minimal fallback
  return await databases.createDocument(dbId, colId, ID.unique(), {
    listing_id: payload.listing_id,
    seller_email: payload.seller_email,
    buyer_email: payload.buyer_email,
    sale_price: payload.sale_price,
    payment_status: payload.payment_status || "pending",
    transaction_status: payload.transaction_status || "pending",
    created_at: payload.created_at,
    updated_at: payload.updated_at,
  });
}

/**
 * Update a document but remove unknown attributes if schema rejects them.
 */
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
  const minimal: Record<string, any> = {};
  if (has(payload, "status")) minimal.status = payload.status;
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

function getListingTitle(listing: any) {
  const itemTitle = String(listing?.item_title || listing?.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(listing?.brand || "").trim();
  const model = String(listing?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  if (bm) return bm;

  const legacyReg = String(listing?.registration || listing?.reg_number || "").trim();
  if (legacyReg) return legacyReg;

  const gearType = String(listing?.gear_type || listing?.type || "").trim();
  if (gearType) return `${gearType} listing`;

  return "your item";
}

/**
 * Body:
 * {
 *   listingId: string;   // listings doc $id
 *   buyerEmail: string;
 *   finalPrice: number;  // e.g. 1250 for £1,250
 * }
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = body.listingId as string | undefined;
    const buyerEmail = String(body.buyerEmail || "").trim();
    const finalPrice = Number(body.finalPrice);

    console.log("[create-from-sale] Incoming", { listingId, buyerEmail, finalPrice });

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    if (!buyerEmail) {
      return NextResponse.json({ error: "buyerEmail is required" }, { status: 400 });
    }

    if (!finalPrice || !Number.isFinite(finalPrice) || finalPrice <= 0) {
      return NextResponse.json({ error: "finalPrice must be a positive number" }, { status: 400 });
    }

    if (!listingsDbId || !txDbId) {
      return NextResponse.json(
        {
          error:
            "Server DB env missing. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_TRANSACTIONS_DATABASE_ID (or NEXT_PUBLIC fallbacks).",
        },
        { status: 500 }
      );
    }

    const client = getAppwriteClient();
    if (!client) {
      return NextResponse.json(
        { error: "Server Appwrite config missing (endpoint/project/apiKey)." },
        { status: 500 }
      );
    }

    const databases = new Databases(client);

    // 1) Load listing
    const listing: any = await databases.getDocument(listingsDbId, listingsCollectionId, listingId);

    const itemTitle = getListingTitle(listing);
    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim();

    console.log("[create-from-sale] Loaded listing", {
      listingId: listing?.$id,
      itemTitle,
      sellerEmail: sellerEmail || null,
    });

    // 2) Settlement (CAMERA POLICY: no DVLA fee)
    // We still use calculateSettlement() because it gives commission tiers + payout.
    // But we must force dvlaFeeOverride to 0 and fee payer to seller so nothing extra is deducted/added.
    const settlement = calculateSettlement(finalPrice, {
      listingId: String(listing?.$id || ""),
      dvlaFeeOverride: 0,
      dvlaFeePayer: "seller",
      // listingFee could be wired later if you add it to camera listings
    });

    const commissionRate = settlement.commissionRate;
    const commissionAmount = settlement.commissionAmount;
    const sellerPayout = Math.max(0, settlement.sellerPayout);

    const nowIso = new Date().toISOString();

    // 3) Create transaction (schema-tolerant)
    const txDoc = await createDocSchemaTolerant(databases, txDbId, txCollectionId, {
      listing_id: String(listing.$id),
      item_title: itemTitle,

      seller_email: sellerEmail || null,
      buyer_email: buyerEmail,

      sale_price: finalPrice,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,

      payment_status: "pending",
      transaction_status: "awaiting_payment",

      // optional fields (will be dropped automatically if schema doesn't support them)
      documents: [],
      created_at: nowIso,
      updated_at: nowIso,
    });

    console.log("[create-from-sale] Created transaction", { txId: txDoc.$id });

    // 4) Mark listing as sold (schema-tolerant)
    const listingUpdate: Record<string, any> = { status: "sold" };
    if (has(listing, "sold_price")) listingUpdate.sold_price = finalPrice;
    if (has(listing, "soldPrice")) listingUpdate.soldPrice = finalPrice;
    if (has(listing, "current_bid")) listingUpdate.current_bid = finalPrice;
    if (has(listing, "currentBid")) listingUpdate.currentBid = finalPrice;

    await updateDocSchemaTolerant(
      databases,
      listingsDbId,
      listingsCollectionId,
      String(listing.$id),
      listingUpdate
    );

    // 5) Emails (buyer, seller, admin) – best effort, non-fatal
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[create-from-sale] SMTP not configured – skipping all emails.");
    } else {
      const prettyPrice = finalPrice.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyCommission = commissionAmount.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyPayout = sellerPayout.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const dashboardUrl = `${siteUrl}/dashboard?tab=transactions`;

      // Buyer email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyCamera" <${smtpUser}>`,
            to: buyerEmail,
            subject: `Next steps for your purchase on AuctionMyCamera`,
            text: [
              `Thank you — your purchase is now in progress.`,
              ``,
              `Item: ${itemTitle}`,
              `Final price: ${prettyPrice}`,
              ``,
              `We’ll guide you through the next steps and notify you when dispatch/tracking is available.`,
              ``,
              `View this transaction in your dashboard:`,
              dashboardUrl,
              ``,
              `AuctionMyCamera.co.uk`,
            ].join("\n"),
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <p>Thank you — your purchase is now in progress.</p>
                <p>
                  <strong>Item:</strong> ${escapeHtml(itemTitle)}<br/>
                  <strong>Final price:</strong> ${escapeHtml(prettyPrice)}
                </p>
                <p>
                  We’ll guide you through the next steps and notify you when dispatch/tracking is available.
                </p>
                <p>
                  View this transaction in your dashboard:<br/>
                  <a href="${dashboardUrl}">${dashboardUrl}</a>
                </p>
                <p>AuctionMyCamera.co.uk</p>
              </div>
            `,
          },
          "buyer"
        );
      } catch (buyerErr) {
        console.error("[create-from-sale] Buyer email failed:", buyerErr);
      }

      // Seller email
      try {
        if (sellerEmail) {
          await safeSendMail(
            transporter,
            {
              from: `"AuctionMyCamera" <${smtpUser}>`,
              to: sellerEmail,
              subject: `Sold: ${itemTitle} on AuctionMyCamera`,
              text: [
                `Good news!`,
                ``,
                `Your item has sold on AuctionMyCamera.`,
                ``,
                `Item: ${itemTitle}`,
                `Final price: ${prettyPrice}`,
                `Our commission (${commissionRate}%): ${prettyCommission}`,
                `Expected payout (subject to completion): ${prettyPayout}`,
                ``,
                `Track this sale and next steps in your dashboard:`,
                dashboardUrl,
                ``,
                `AuctionMyCamera.co.uk`,
              ].join("\n"),
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                  <p>Good news!</p>
                  <p>Your item has sold on AuctionMyCamera.</p>
                  <p>
                    <strong>Item:</strong> ${escapeHtml(itemTitle)}<br/>
                    <strong>Final price:</strong> ${escapeHtml(prettyPrice)}<br/>
                    <strong>Our commission (${commissionRate}%):</strong> ${escapeHtml(prettyCommission)}<br/>
                    <strong>Expected payout (subject to completion):</strong> ${escapeHtml(prettyPayout)}
                  </p>
                  <p>
                    Track this sale in your dashboard:<br/>
                    <a href="${dashboardUrl}">${dashboardUrl}</a>
                  </p>
                  <p>AuctionMyCamera.co.uk</p>
                </div>
              `,
            },
            "seller"
          );
        } else {
          console.warn("[create-from-sale] No seller_email on listing, seller email skipped.");
        }
      } catch (sellerErr) {
        console.error("[create-from-sale] Seller email failed:", sellerErr);
      }

      // Admin email
      try {
        if (adminEmail) {
          await safeSendMail(
            transporter,
            {
              from: `"AuctionMyCamera" <${smtpUser}>`,
              to: adminEmail,
              subject: `New sale created: ${itemTitle}`,
              text: [
                `A sale transaction has been created.`,
                ``,
                `Item: ${itemTitle}`,
                `Sale price: ${prettyPrice}`,
                `Commission (${commissionRate}%): ${prettyCommission}`,
                `Seller payout (expected): ${prettyPayout}`,
                ``,
                `Seller: ${sellerEmail || "N/A"}`,
                `Buyer: ${buyerEmail}`,
                ``,
                `Transaction ID: ${txDoc.$id}`,
              ].join("\n"),
            },
            "admin"
          );
        }
      } catch (adminErr) {
        console.error("[create-from-sale] Admin email failed:", adminErr);
      }
    }

    return NextResponse.json({ success: true, transactionId: txDoc.$id }, { status: 200 });
  } catch (err: any) {
    console.error("[create-from-sale] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}