import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// Where sellers land to see status
const SELLER_DASHBOARD_PATH = (process.env.SELLER_DASHBOARD_PATH || "/dashboard").trim();
const SELLER_DASHBOARD_URL = `${SITE_URL}${
  SELLER_DASHBOARD_PATH.startsWith("/") ? "" : "/"
}${SELLER_DASHBOARD_PATH}`;

// If Stackmail cert chain ever causes issues, set:
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

  v = v.replace(/^"+|"+$/g, "").trim();
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

function buildTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 SSL, 587 STARTTLS
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
// POST
// Accepts legacy payload: { registration, seller_email }
// Also supports camera-ish: { item_title } etc.
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const sellerEmail = normalizeEmailAddress(String(body?.seller_email || body?.sellerEmail || ""));
    const registration = String(body?.registration || "").trim(); // legacy label
    const itemTitle = String(body?.item_title || body?.title || "").trim(); // camera label (optional)

    const displayTitle = itemTitle || registration;

    if (!sellerEmail || !displayTitle) {
      return NextResponse.json(
        { error: "Missing registration/item title or seller_email" },
        { status: 400 }
      );
    }

    if (!isValidEmail(sellerEmail)) {
      return NextResponse.json({ error: "Invalid seller_email" }, { status: 400 });
    }

    const fromAddress = normalizeEmailAddress(RAW_FROM_EMAIL);
    if (!fromAddress || !isValidEmail(fromAddress)) {
      return NextResponse.json({ error: "Invalid FROM_EMAIL server config" }, { status: 500 });
    }

    const transporter = buildTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: "Email is not configured (SMTP env missing)" },
        { status: 500 }
      );
    }

    const safeTitle = escapeHtml(displayTitle);

    await transporter.sendMail({
      from: {
        name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"),
        address: fromAddress,
      },
      to: sellerEmail,
      subject: safeHeaderValue(`✅ Your listing has been approved: ${displayTitle}`),
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:auto;border:1px solid #eee;border-radius:10px;line-height:1.5;">
          <h2 style="color:#111827;margin:0 0 10px 0;">Your listing is approved</h2>
          <p style="margin:0 0 10px 0;">Hi there,</p>
          <p style="margin:0 0 12px 0;">
            Good news — your listing <strong>${safeTitle}</strong> has been approved and will appear in our auctions.
          </p>
          <p style="margin:0 0 14px 0;">
            You can track progress in your Seller Dashboard:
            <a href="${escapeHtml(SELLER_DASHBOARD_URL)}" style="color:#2563eb;text-decoration:underline;">
              ${escapeHtml(SELLER_DASHBOARD_URL)}
            </a>
          </p>
          <hr style="margin:18px 0;">
          <p style="font-size:12px;color:#666;margin:0;">AuctionMyCamera © 2026 — Buy and sell camera gear with confidence.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error sending approval email:", error);
    return NextResponse.json({ error: "Failed to send approval email" }, { status: 500 });
  }
}