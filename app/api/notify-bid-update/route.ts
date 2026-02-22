// app/api/notify-bid-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (safe reads)
// -----------------------------
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

// Listings DB/Collection (server-safe fallbacks)
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// Email
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const RAW_FROM_EMAIL =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "";

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

// If you ever get SMTP cert-chain weirdness, set:
// SMTP_TLS_REJECT_UNAUTHORIZED=false
const TLS_REJECT_UNAUTHORIZED =
  (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false";

// -----------------------------
// Helpers
// -----------------------------
function normalizeEmailAddress(input: string) {
  let v = (input || "").trim();

  // If someone pasted: Name <email@domain>
  const angleMatch = v.match(/<([^>]+)>/);
  if (angleMatch?.[1]) v = angleMatch[1].trim();

  // Remove surrounding quotes
  v = v.replace(/^"+|"+$/g, "").trim();

  // Remove stray spaces
  v = v.replace(/\s+/g, "");

  return v;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeHeaderValue(v: unknown, fallback = "") {
  const s = String(v ?? fallback);
  return s.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(s: unknown) {
  const v = String(s ?? "");
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function moneyGBP(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "£0";
  return `£${n.toLocaleString("en-GB")}`;
}

function getAdminDatabases() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

function buildTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
    },
  });
}

// -----------------------------
// POST /api/notify-bid-update
// Body: { listingId, newBid, bidderEmail }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        { ok: false, error: "Listings DB/Collection env missing." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId || "").trim();
    const bidderEmail = normalizeEmailAddress(String(body?.bidderEmail || ""));
    const newBidRaw = body?.newBid;

    const newBid = Number(newBidRaw);

    if (!listingId || !Number.isFinite(newBid) || newBid <= 0 || !bidderEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing/invalid fields: listingId, newBid, bidderEmail" },
        { status: 400 }
      );
    }

    if (!isValidEmail(bidderEmail)) {
      return NextResponse.json({ ok: false, error: "Invalid bidderEmail" }, { status: 400 });
    }

    const fromAddress = normalizeEmailAddress(RAW_FROM_EMAIL);
    if (!fromAddress || !isValidEmail(fromAddress)) {
      return NextResponse.json(
        { ok: false, error: "Invalid FROM_EMAIL server config." },
        { status: 500 }
      );
    }

    const transporter = buildTransporter();
    if (!transporter) {
      return NextResponse.json(
        { ok: false, error: "Email is not configured (SMTP env missing)." },
        { status: 500 }
      );
    }

    const databases = getAdminDatabases();

    // ✅ Load listing data
    const listing: any = await databases.getDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId
    );

    // Seller email (support both snake_case and camelCase)
    const sellerEmail = normalizeEmailAddress(
      String(listing?.seller_email || listing?.sellerEmail || "")
    );

    // Previous bidder fields (support multiple names to avoid schema issues)
    const previousBidder = normalizeEmailAddress(
      String(listing?.last_bidder || listing?.highest_bidder || listing?.lastBidder || "")
    );

    // Listing label (camera first, legacy fallback)
    const title =
      String(listing?.item_title || listing?.title || listing?.registration || "Listing").trim();

    const safeTitle = escapeHtml(title);

    // Optional links (do not assume routes; keep generic & safe)
    const listingUrl = `${SITE_URL}/listings/${encodeURIComponent(listingId)}`;
    const dashboardUrl = `${SITE_URL}/dashboard`;

    // -----------------------------
    // Email: to seller
    // -----------------------------
    if (sellerEmail && isValidEmail(sellerEmail)) {
      const subject = safeHeaderValue(`New bid received: ${title}`);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin:0 0 10px 0;">New bid received</h2>
          <p style="margin:0 0 10px 0;">
            Your listing <strong>${safeTitle}</strong> just received a new bid of
            <strong>${escapeHtml(moneyGBP(newBid))}</strong>.
          </p>
          <p style="margin:0 0 12px 0;">
            Bidder: <strong>${escapeHtml(bidderEmail)}</strong>
          </p>
          <p style="margin:0 0 12px 0;">
            View your dashboard for details:
            <a href="${escapeHtml(dashboardUrl)}" style="color:#2563eb; text-decoration:underline;">
              ${escapeHtml(dashboardUrl)}
            </a>
          </p>
          <p style="margin:14px 0 0 0; font-size:12px; color:#666;">– AuctionMyCamera</p>
        </div>
      `;

      await transporter.sendMail({
        from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: fromAddress },
        to: sellerEmail,
        subject,
        html,
      });
    }

    // -----------------------------
    // Email: outbid notice to previous highest bidder
    // -----------------------------
    if (previousBidder && previousBidder !== bidderEmail && isValidEmail(previousBidder)) {
      const subject = safeHeaderValue(`You’ve been outbid: ${title}`);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin:0 0 10px 0;">You’ve been outbid</h2>
          <p style="margin:0 0 10px 0;">
            Your bid on <strong>${safeTitle}</strong> has been beaten.
          </p>
          <p style="margin:0 0 12px 0;">
            The new highest bid is <strong>${escapeHtml(moneyGBP(newBid))}</strong>.
          </p>
          <p style="margin:0 0 12px 0;">
            View the listing:
            <a href="${escapeHtml(listingUrl)}" style="color:#2563eb; text-decoration:underline;">
              ${escapeHtml(listingUrl)}
            </a>
          </p>
          <p style="margin:14px 0 0 0; font-size:12px; color:#666;">– AuctionMyCamera</p>
        </div>
      `;

      await transporter.sendMail({
        from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: fromAddress },
        to: previousBidder,
        subject,
        html,
      });
    }

    return NextResponse.json({ ok: true, message: "Notifications sent" });
  } catch (err: any) {
    console.error("notify-bid-update error:", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}