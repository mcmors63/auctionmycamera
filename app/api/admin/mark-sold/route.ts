// app/api/admin/mark-sold/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side for DB writes)
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

// Listings
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// Transactions
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.APPWRITE_TRANSACTIONS_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DB_ID ||
  LISTINGS_DB_ID;

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.APPWRITE_TRANSACTIONS_TABLE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID ||
  "transactions";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

// Admin email (summary notifications)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@auctionmycamera.co.uk").trim().toLowerCase();

// -----------------------------
// Helpers
// -----------------------------
function getServerDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || "465");
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const fromEmail =
    process.env.FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    "admin@auctionmycamera.co.uk";

  const replyTo =
    process.env.REPLY_TO_EMAIL ||
    process.env.CONTACT_REPLY_TO_EMAIL ||
    fromEmail;

  return { transporter, fromEmail, replyTo, smtpUser: user };
}

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

  const minimal: Record<string, any> = {};
  if (has(payload, "status")) minimal.status = payload.status;
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

// -----------------------------
// POST /api/admin/mark-sold
// Body: { plateId OR listingId, finalPrice, buyerEmail }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    // ✅ Real admin gate: session-based
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID || !TX_DB_ID || !TX_COLLECTION_ID) {
      return NextResponse.json({ error: "Server DB configuration incomplete." }, { status: 500 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = body?.plateId || body?.listingId || body?.id;
    const finalPrice = body?.finalPrice;
    const buyerEmail = String(body?.buyerEmail || "").trim();

    if (!listingId || finalPrice == null) {
      return NextResponse.json(
        { error: "listingId (or plateId) and finalPrice are required." },
        { status: 400 }
      );
    }

    const salePrice = toNumber(finalPrice);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return NextResponse.json({ error: "finalPrice must be a positive number." }, { status: 400 });
    }

    const databases = getServerDatabases();
    if (!databases) {
      return NextResponse.json({ error: "Server Appwrite client could not be initialised." }, { status: 500 });
    }

    // 1) Load listing
    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim();
    if (!sellerEmail) {
      return NextResponse.json({ error: "Listing has no seller email. Cannot create transaction." }, { status: 500 });
    }

    const itemTitle =
      String(listing?.item_title || listing?.title || "").trim() ||
      [listing?.brand, listing?.model].filter(Boolean).join(" ").trim() ||
      "your item";

    // 2) Simple money defaults
    const commissionRateRaw =
      typeof listing?.commission_rate === "number" ? listing.commission_rate : undefined;
    const listingFeeRaw =
      typeof listing?.listing_fee === "number" ? listing.listing_fee : undefined;

    const commissionRate =
      typeof commissionRateRaw === "number" && commissionRateRaw >= 0 ? commissionRateRaw : 10;
    const listingFee =
      typeof listingFeeRaw === "number" && listingFeeRaw >= 0 ? listingFeeRaw : 0;

    const commissionAmount = Math.round((salePrice * commissionRate) / 100);
    const sellerPayout = Math.max(0, salePrice - commissionAmount - listingFee);

    const nowIso = new Date().toISOString();

    // 3) Create transaction
    const txPayload: Record<string, any> = {
      listing_id: String(listing.$id),
      seller_email: sellerEmail,
      buyer_email: buyerEmail || "",

      item_title: itemTitle,
      sale_price: salePrice,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,

      payment_status: "pending",
      transaction_status: "pending",

      created_at: nowIso,
      updated_at: nowIso,
    };

    const txDoc = await createDocSchemaTolerant(databases, TX_DB_ID, TX_COLLECTION_ID, txPayload);

    // 4) Update listing as sold
    const listingUpdate: Record<string, any> = { status: "sold" };

    if (has(listing, "current_bid")) listingUpdate.current_bid = salePrice;
    if (has(listing, "currentBid")) listingUpdate.currentBid = salePrice;
    if (has(listing, "sold_price")) listingUpdate.sold_price = salePrice;
    if (has(listing, "soldPrice")) listingUpdate.soldPrice = salePrice;

    await updateDocSchemaTolerant(
      databases,
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      String(listing.$id),
      listingUpdate
    );

    // 5) Emails (best-effort)
    try {
      const mailer = getMailer();
      if (mailer) {
        const { transporter, fromEmail, replyTo, smtpUser } = mailer;

        const dashboardLink = `${SITE_URL}/dashboard`;
        const salePriceText = salePrice.toLocaleString("en-GB");
        const payoutText = sellerPayout.toLocaleString("en-GB");

        await transporter.sendMail({
          from: `"AuctionMyCamera" <${smtpUser || fromEmail}>`,
          replyTo,
          to: sellerEmail,
          subject: `🎉 Sold: ${itemTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
              <h1 style="margin:0 0 12px 0; font-size:20px; color:#0f766e;">Your item has sold</h1>
              <p style="font-size:15px; color:#333; line-height:1.5;">
                <strong>${escapeHtml(itemTitle)}</strong> has been marked as sold for <strong>£${salePriceText}</strong>.
              </p>
              <p style="font-size:14px; color:#555; line-height:1.5;">
                Expected payout (after commission/fees): <strong>£${payoutText}</strong>.
              </p>
              <p style="font-size:14px; color:#555;">
                Track progress in your dashboard:<br/>
                <a href="${dashboardLink}" style="color:#1a73e8;">${dashboardLink}</a>
              </p>
              <hr style="margin:20px 0;border:none;border-top:1px solid #ddd;" />
              <p style="font-size:12px; color:#777; margin:0;">AuctionMyCamera © ${new Date().getFullYear()}</p>
            </div>
          `,
        });

        if (buyerEmail) {
          await transporter.sendMail({
            from: `"AuctionMyCamera" <${smtpUser || fromEmail}>`,
            replyTo,
            to: buyerEmail,
            subject: `Purchase recorded: ${itemTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
                <h1 style="margin:0 0 12px 0; font-size:20px; color:#0f766e;">Your purchase</h1>
                <p style="font-size:15px; color:#333; line-height:1.5;">
                  Your purchase of <strong>${escapeHtml(itemTitle)}</strong> has been recorded at <strong>£${salePriceText}</strong>.
                </p>
                <p style="font-size:14px; color:#555;">If you need help, reply to this email.</p>
                <hr style="margin:20px 0;border:none;border-top:1px solid #ddd;" />
                <p style="font-size:12px; color:#777; margin:0;">AuctionMyCamera © ${new Date().getFullYear()}</p>
              </div>
            `,
          });
        }

        if (ADMIN_EMAIL) {
          await transporter.sendMail({
            from: `"AuctionMyCamera" <${smtpUser || fromEmail}>`,
            replyTo,
            to: ADMIN_EMAIL,
            subject: `Sold recorded: ${itemTitle} (£${salePriceText})`,
            html: `
              <p>A listing was marked as sold.</p>
              <ul>
                <li><strong>Item:</strong> ${escapeHtml(itemTitle)}</li>
                <li><strong>Sale price:</strong> £${salePriceText}</li>
                <li><strong>Seller:</strong> ${escapeHtml(sellerEmail)}</li>
                <li><strong>Buyer:</strong> ${escapeHtml(buyerEmail || "not provided")}</li>
                <li><strong>Transaction ID:</strong> ${escapeHtml(String(txDoc.$id))}</li>
              </ul>
            `,
          });
        }
      }
    } catch (mailErr) {
      console.error("mark-sold email warning (sale still recorded):", mailErr);
    }

    return NextResponse.json({ ok: true, transaction: txDoc }, { status: 200 });
  } catch (err: any) {
    console.error("MARK-SOLD API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to mark listing as sold and create transaction." },
      { status: 500 }
    );
  }
}