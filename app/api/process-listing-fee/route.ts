// app/api/process-listing-fee/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🧮 Helper: Determine fee based on reserve price (PROVISIONAL)
// Keep identical behaviour for now, but this route does NOT charge a card unless you wire Stripe.
function calculateListingFee(reserve: number): number {
  if (reserve < 5000) return 5;
  if (reserve < 10000) return 10;
  if (reserve < 25000) return 15;
  if (reserve < 50000) return 25;
  return 50;
}

// -----------------------------
// ENV (safe reads)
// -----------------------------
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

// From address should be ONLY an email address (no "Name <...>")
const RAW_FROM_EMAIL =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "";

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// Optional: set SMTP_TLS_REJECT_UNAUTHORIZED=false if your SMTP cert chain is problematic
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

// Prevent header injection via subjects/names (strip CR/LF)
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

function formatAuctionStart(auctionStart: unknown) {
  const iso = String(auctionStart || "").trim();
  if (!iso) return "TBC";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "TBC";
  return new Date(ms).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
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
// POST /api/process-listing-fee
// Body (legacy compatible):
// { registration, reserve_price, seller_email, auction_start }
// Also accepts camera fields if present: { item_title, title }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const sellerEmail = normalizeEmailAddress(String(body?.seller_email || body?.sellerEmail || ""));
    const reserveRaw = body?.reserve_price ?? body?.reservePrice;
    const reserve = Number(reserveRaw);

    // Legacy label vs camera label
    const registration = String(body?.registration || "").trim();
    const itemTitle = String(body?.item_title || body?.title || "").trim();
    const displayTitle = itemTitle || registration;

    const auctionStart = body?.auction_start ?? body?.auctionStart;

    if (!displayTitle || !sellerEmail || !Number.isFinite(reserve)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidEmail(sellerEmail)) {
      return NextResponse.json({ error: "Invalid seller_email" }, { status: 400 });
    }

    const fromAddress = normalizeEmailAddress(RAW_FROM_EMAIL);
    if (!fromAddress || !isValidEmail(fromAddress)) {
      console.error("❌ Invalid FROM email address (server config)", { RAW_FROM_EMAIL, fromAddress });
      return NextResponse.json(
        { error: "Invalid FROM email address (server config). Fix FROM_EMAIL." },
        { status: 500 }
      );
    }

    const transporter = buildTransporter();
    if (!transporter) {
      console.error("❌ Missing SMTP config for /api/process-listing-fee", {
        SMTP_HOST: !!SMTP_HOST,
        SMTP_USER: !!SMTP_USER,
        SMTP_PASS: !!SMTP_PASS,
      });
      return NextResponse.json(
        { error: "Email is not configured (SMTP env missing)" },
        { status: 500 }
      );
    }

    const listingFee = calculateListingFee(reserve);

    // ✅ HONEST log: this route does not charge anything unless Stripe is implemented.
    console.log(
      `[process-listing-fee] Provisional fee calculated (£${listingFee}) for "${displayTitle}". No payment processed in this route.`
    );

    const safeTitle = escapeHtml(displayTitle);
    const whenLabel = escapeHtml(formatAuctionStart(auctionStart));

    await transporter.sendMail({
      from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: fromAddress },
      to: sellerEmail,
      subject: safeHeaderValue(`Listing approved: ${displayTitle}`),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 640px; margin: 0 auto;">
          <h2 style="margin:0 0 10px 0;">Your listing has been approved</h2>

          <p style="margin:0 0 10px 0;">
            Your listing <strong>${safeTitle}</strong> has been approved for auction.
          </p>

          <p style="margin:0 0 10px 0;">
            <strong>Listing fee:</strong> £${escapeHtml(String(listingFee))}
          </p>

          <p style="margin:0 0 12px 0;">
            <strong>Auction start:</strong> ${whenLabel}
          </p>

          <p style="margin:0 0 12px 0;">
            You can track progress in your dashboard on <strong>${escapeHtml(SITE_URL)}</strong>.
          </p>

          <hr style="margin:18px 0; border:none; border-top:1px solid #eee;" />

          <p style="margin:0; font-size:12px; color:#666;">
            AuctionMyCamera — Buy and sell camera gear with confidence.
          </p>

          <p style="margin:6px 0 0 0; font-size:12px; color:#666;">
            Note: This email confirms approval. Payment processing is handled separately.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Fee £${listingFee} calculated and email sent.`,
      listingFee,
      paymentProcessed: false, // ✅ explicit truth
    });
  } catch (err: any) {
    console.error("❌ /api/process-listing-fee error:", err);
    return NextResponse.json(
      { error: "Failed to process listing fee", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}