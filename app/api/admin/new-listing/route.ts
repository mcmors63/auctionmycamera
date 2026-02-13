// app/api/admin/new-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// SMTP CONFIG (same as /api/test-email)
// -----------------------------
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || "465");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

// IMPORTANT:
// FROM_EMAIL must be ONLY an email address (e.g. admin@auctionmyplate.co.uk)
// Display name is handled separately via FROM_NAME.
const rawFromAddress =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER; // fall back to login

const fromName = (process.env.FROM_NAME || "AuctionMyPlate Admin").trim();

// Optional: where replies should go
const replyTo =
  (process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || "support@auctionmyplate.co.uk").trim();

function normalizeEmailAddress(input: string) {
  // Handles common bad values like:
  // - "Name <email@domain>"
  // - <email@domain>
  // - "email@domain"
  // - whitespace / invisible junk
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
  // simple sanity check; enough to catch obvious bad values
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const fromAddress = normalizeEmailAddress(rawFromAddress || "");

// Build a safe "from" object (prevents Yahoo rejecting exotic local-part formats)
const from = {
  name: fromName,
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
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { plateId, registration, sellerEmail, reserve_price, starting_price, buy_now } = body;

    if (!plateId || !registration || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing plateId, registration or sellerEmail" },
        { status: 400 }
      );
    }

    // Hard fail if mail config is missing — prevents sending malformed headers.
    if (!host || !user || !pass || !rawFromAddress || !transporter) {
      console.error("❌ Missing email env vars in /api/admin/new-listing", {
        SMTP_HOST: !!host,
        SMTP_USER: !!user,
        SMTP_PASS: !!pass,
        FROM_EMAIL: !!rawFromAddress,
      });
      return NextResponse.json({ error: "Email is not configured on the server" }, { status: 500 });
    }

    // Hard fail if FROM_EMAIL is malformed.
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

    const adminTo = "admin@auctionmyplate.co.uk";

    // -------- Admin email --------
    const adminSubject = `New plate submitted: ${registration}`;
    const adminHtml = `
      <h2>New Listing Submitted</h2>
      <p>A seller has submitted a new plate for approval.</p>
      <ul>
        <li><strong>Plate ID:</strong> ${plateId}</li>
        <li><strong>Registration:</strong> ${registration}</li>
        <li><strong>Seller:</strong> ${sellerEmail}</li>
        <li><strong>Reserve:</strong> £${reserve_price ?? "0"}</li>
        <li><strong>Starting price:</strong> £${starting_price ?? "0"}</li>
        <li><strong>Buy Now:</strong> £${buy_now ?? "0"}</li>
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
    const sellerSubject = `Your plate has been submitted: ${registration}`;
    const sellerHtml = `
      <h2>Thanks for listing your plate!</h2>
      <p>We have received your listing for <strong>${registration}</strong>.</p>
      <p>Our team will review it shortly. You will receive another email once it has been approved and queued for auction.</p>
      <p>If you did not create this listing, please contact us immediately at support@auctionmyplate.co.uk.</p>
      <p>– AuctionMyPlate.co.uk</p>
    `;

    await transporter.sendMail({
      from,
      to: sellerEmail,
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
