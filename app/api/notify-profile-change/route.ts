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

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.ADMIN_TO_EMAIL ||
  "admin@auctionmycamera.co.uk"
).trim();

const SUPPORT_EMAIL = (
  process.env.REPLY_TO_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  "support@auctionmycamera.co.uk"
).trim();

// If Stackmail cert chain ever causes issues, set:
// SMTP_TLS_REJECT_UNAUTHORIZED=false
const TLS_REJECT_UNAUTHORIZED =
  (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false";

// -----------------------------
// Helpers
// -----------------------------
function normalizeEmailAddress(input: string) {
  let v = (input || "").trim();

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
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: {
      rejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
    },
  });
}

// -----------------------------
// POST
// Body: { userEmail, fullName, changes: string[] }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = normalizeEmailAddress(String(body?.userEmail || ""));
    const fullName = String(body?.fullName || "").trim();
    const changesRaw = body?.changes;

    const changes: string[] = Array.isArray(changesRaw)
      ? changesRaw.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 50)
      : [];

    if (!userEmail || !changes.length) {
      return NextResponse.json(
        { error: "Invalid request: missing fields" },
        { status: 400 }
      );
    }

    if (!isValidEmail(userEmail)) {
      return NextResponse.json({ error: "Invalid userEmail" }, { status: 400 });
    }

    const fromAddress = normalizeEmailAddress(RAW_FROM_EMAIL);
    if (!fromAddress || !isValidEmail(fromAddress)) {
      return NextResponse.json({ error: "Invalid FROM_EMAIL server config" }, { status: 500 });
    }

    const adminTo = normalizeEmailAddress(ADMIN_EMAIL);
    if (!adminTo || !isValidEmail(adminTo)) {
      return NextResponse.json({ error: "Invalid ADMIN_EMAIL server config" }, { status: 500 });
    }

    const transporter = buildTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: "Email is not configured (SMTP env missing)" },
        { status: 500 }
      );
    }

    const safeName = escapeHtml(fullName || "User");
    const safeEmail = escapeHtml(userEmail);

    const changedList = changes.map((c) => `• ${escapeHtml(c)}`).join("<br>");

    const htmlUser = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h3 style="margin:0 0 10px 0;">Your profile was updated</h3>
        <p style="margin:0 0 10px 0;"><strong>Updated fields:</strong></p>
        <p style="margin:0 0 12px 0;">${changedList}</p>
        <p style="margin:0 0 10px 0;">
          If you did not make these changes, contact support immediately at
          <strong>${escapeHtml(SUPPORT_EMAIL)}</strong>.
        </p>
        <p style="margin:14px 0 0 0; font-size:12px; color:#666;">– AuctionMyCamera</p>
      </div>
    `;

    const htmlAdmin = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h3 style="margin:0 0 10px 0;">User Updated Profile</h3>
        <p style="margin:0 0 6px 0;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin:0 0 10px 0;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin:0 0 10px 0;"><strong>Updated fields:</strong></p>
        <p style="margin:0;">${changedList}</p>
      </div>
    `;

    // Send to USER
    await transporter.sendMail({
      from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: fromAddress },
      to: userEmail,
      subject: safeHeaderValue("Your profile has been updated"),
      html: htmlUser,
      replyTo: SUPPORT_EMAIL,
    });

    // Send to ADMIN
    await transporter.sendMail({
      from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: fromAddress },
      to: adminTo,
      subject: safeHeaderValue(`User updated profile: ${fullName || userEmail}`),
      html: htmlAdmin,
      replyTo: SUPPORT_EMAIL,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("ERROR notify-profile-change:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}