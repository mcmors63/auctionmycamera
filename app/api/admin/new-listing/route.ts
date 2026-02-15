// app/api/admin/new-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// SMTP CONFIG
// -----------------------------
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || "465");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

// FROM_EMAIL must be ONLY an email address (e.g. admin@auctionmycamera.co.uk)
// Display name is handled separately via FROM_NAME.
const rawFromAddress =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER; // fall back to login

// Brand defaults (camera)
const fromName = (process.env.FROM_NAME || "AuctionMyCamera Admin").trim();

// Optional: where replies should go
const replyTo = (
  process.env.REPLY_TO_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  "support@auctionmycamera.co.uk"
).trim();

// Admin inbox
const adminTo = (
  process.env.ADMIN_EMAIL ||
  process.env.ADMIN_TO_EMAIL ||
  "admin@auctionmycamera.co.uk"
).trim();

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

function moneyGBP(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "£0";
  return `£${n.toLocaleString("en-GB")}`;
}

const fromAddress = normalizeEmailAddress(rawFromAddress || "");

// Build a safe "from" object
const from = {
  name: safeHeaderValue(fromName, "AuctionMyCamera Admin"),
  address: fromAddress,
};

const transporter =
  host && user && pass
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587
        auth: { user, pass },
      })
    : null;

// -----------------------------
// POST handler
// Accepts BOTH shapes:
// 1) legacy plate payload: { plateId, registration, sellerEmail, reserve_price, starting_price, buy_now }
// 2) camera payload: { listingId, item_title, sellerEmail, gear_type, era, condition, brand, model, reserve_price, starting_price, buy_now }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Common fields
    const sellerEmail = body?.sellerEmail || body?.seller_email || body?.email;

    // Camera-ish
    const listingId = body?.listingId || body?.listing_id || body?.plateId; // fallback
    const itemTitle = body?.item_title || body?.title || body?.registration || "New listing";
    const gearType = body?.gear_type || body?.gearType;
    const era = body?.era;
    const condition = body?.condition;
    const brand = body?.brand;
    const model = body?.model;

    // Prices
    const reserve = body?.reserve_price ?? body?.reservePrice ?? 0;
    const starting = body?.starting_price ?? body?.startingPrice ?? 0;
    const buyNow = body?.buy_now ?? body?.buyNow ?? 0;

    if (!listingId || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing listingId (or plateId) and sellerEmail" },
        { status: 400 }
      );
    }

    // Hard fail if mail config is missing
    if (!host || !user || !pass || !rawFromAddress || !transporter) {
      console.error("❌ Missing email env vars in /api/admin/new-listing", {
        SMTP_HOST: !!host,
        SMTP_USER: !!user,
        SMTP_PASS: !!pass,
        FROM_EMAIL: !!rawFromAddress,
      });
      return NextResponse.json(
        { error: "Email is not configured on the server" },
        { status: 500 }
      );
    }

    // Hard fail if FROM_EMAIL is malformed
    if (!isValidEmail(fromAddress)) {
      console.error("❌ Invalid FROM email address (fix your env var FROM_EMAIL)", {
        rawFromAddress,
        normalized: fromAddress,
      });
      return NextResponse.json(
        { error: "Invalid FROM email address (server config). Fix FROM_EMAIL." },
        { status: 500 }
      );
    }

    if (!isValidEmail(String(sellerEmail))) {
      return NextResponse.json({ error: "Invalid sellerEmail" }, { status: 400 });
    }

    // Decide “camera vs legacy” based on presence of camera-ish fields
    const looksLikeCamera =
      !!body?.item_title ||
      !!body?.gear_type ||
      !!body?.gearType ||
      !!body?.brand ||
      !!body?.model ||
      !!body?.era ||
      !!body?.condition;

    const safeTitle = escapeHtml(itemTitle);
    const safeSeller = escapeHtml(sellerEmail);

    // -------- Admin email --------
    const adminSubject = safeHeaderValue(
      looksLikeCamera ? `New gear submitted: ${itemTitle}` : `New listing submitted: ${itemTitle}`
    );

    const adminHtml = `
      <h2>New Listing Submitted</h2>
      <p>A seller has submitted a new listing for review.</p>
      <ul>
        <li><strong>Listing ID:</strong> ${escapeHtml(listingId)}</li>
        <li><strong>Title:</strong> ${safeTitle}</li>
        ${
          looksLikeCamera
            ? `
              <li><strong>Type:</strong> ${escapeHtml(gearType || "—")}</li>
              <li><strong>Era:</strong> ${escapeHtml(era || "—")}</li>
              <li><strong>Condition:</strong> ${escapeHtml(condition || "—")}</li>
              <li><strong>Brand:</strong> ${escapeHtml(brand || "—")}</li>
              <li><strong>Model:</strong> ${escapeHtml(model || "—")}</li>
            `
            : ``
        }
        <li><strong>Seller:</strong> ${safeSeller}</li>
        <li><strong>Reserve:</strong> ${escapeHtml(moneyGBP(reserve))}</li>
        <li><strong>Starting price:</strong> ${escapeHtml(moneyGBP(starting))}</li>
        <li><strong>Buy Now:</strong> ${escapeHtml(moneyGBP(buyNow))}</li>
      </ul>
      <p>Log in to the admin dashboard to review and approve this listing.</p>
    `;

    await transporter.sendMail({
      from,
      to: adminTo,
      subject: adminSubject,
      html: adminHtml,
      replyTo,
    });

    // -------- Seller email --------
    const sellerSubject = safeHeaderValue(`Your listing has been submitted: ${itemTitle}`);

    const sellerHtml = `
      <h2>Thanks — we’ve received your listing</h2>
      <p>We have received your listing for <strong>${safeTitle}</strong>.</p>
      <p>Our team will review it shortly. You will receive another email once it has been approved and queued for auction.</p>
      <p>If you did not create this listing, please contact us immediately at <strong>${escapeHtml(
        replyTo
      )}</strong>.</p>
      <p>– AuctionMyCamera.co.uk</p>
    `;

    await transporter.sendMail({
      from,
      to: String(sellerEmail),
      subject: sellerSubject,
      html: sellerHtml,
      replyTo,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ /api/admin/new-listing error:", err);
    return NextResponse.json({ error: "Failed to send new listing emails" }, { status: 500 });
  }
}