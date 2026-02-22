// app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
// -----------------------------
const smtpHost = (process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").trim();

// ✅ Keep FROM_EMAIL as an email address only
const FROM_EMAIL =
  (process.env.FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "no-reply@auctionmycamera.co.uk"
  ).trim();

// ✅ Display name is separate
const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

// Where admin contact messages should go
const ADMIN_EMAIL =
  (process.env.ADMIN_NOTIFICATIONS_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "admin@auctionmycamera.co.uk"
  )
    .trim()
    .toLowerCase();

const isProd = process.env.NODE_ENV === "production";

// -----------------------------
// HELPERS
// -----------------------------
function hasSmtpConfig() {
  return Boolean(smtpHost && smtpUser && smtpPass);
}

function createTransport() {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

// Prevent header injection (strip CR/LF)
function safeHeaderValue(v: unknown, fallback = "") {
  const s = String(v ?? fallback);
  return s.replace(/[\r\n]+/g, " ").trim();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -----------------------------
// POST /api/contact
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!hasSmtpConfig()) {
      const msg = "[contact] SMTP not configured.";

      if (isProd) {
        console.error(msg);
        return NextResponse.json(
          { ok: false, error: "Email is not configured on the server. Please try again later." },
          { status: 500 }
        );
      }

      console.warn(msg + " Returning ok:true in development. No email will actually be sent.");
      return NextResponse.json(
        {
          ok: true,
          devNote: "SMTP not configured; message not emailed (development environment).",
        },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const {
      name,
      email,
      subject,
      message,
    }: { name?: string; email?: string; subject?: string; message?: string } = body;

    const trimmedName = String(name || "").trim();
    const trimmedEmail = String(email || "").trim();
    const trimmedSubject = safeHeaderValue(subject, "New contact form message");
    const trimmedMessage = String(message || "").trim();

    if (!trimmedEmail || !trimmedMessage) {
      return NextResponse.json(
        { ok: false, error: "Please provide your email address and a message." },
        { status: 400 }
      );
    }

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!isValidEmail(FROM_EMAIL)) {
      console.error("[contact] Invalid FROM_EMAIL server config:", FROM_EMAIL);
      return NextResponse.json(
        { ok: false, error: "Server email configuration error. Please try again later." },
        { status: 500 }
      );
    }

    if (ADMIN_EMAIL && !isValidEmail(ADMIN_EMAIL)) {
      console.error("[contact] Invalid ADMIN email server config:", ADMIN_EMAIL);
      return NextResponse.json(
        { ok: false, error: "Server email configuration error. Please try again later." },
        { status: 500 }
      );
    }

    const transporter = createTransport();

    const adminBody = `
New contact form message from AuctionMyCamera:

Name:   ${trimmedName || "(not provided)"}
Email:  ${trimmedEmail}

Subject: ${trimmedSubject}

Message:
${trimmedMessage}
`.trim();

    // Admin email
    await transporter.sendMail({
      from: { name: FROM_NAME, address: FROM_EMAIL },
      to: ADMIN_EMAIL,
      replyTo: trimmedEmail,
      subject: `[Contact] ${trimmedSubject}`,
      text: adminBody,
    });

    // Optional confirmation to user (non-blocking)
    transporter
      .sendMail({
        from: { name: FROM_NAME, address: FROM_EMAIL },
        to: trimmedEmail,
        subject: "We’ve received your message – AuctionMyCamera",
        text: `
Hi${trimmedName ? " " + trimmedName : ""},

Thanks for getting in touch with AuctionMyCamera.
We've received your message and will get back to you as soon as we can.

For your reference, this is what you sent:

----------------------------------------
Subject: ${trimmedSubject}

${trimmedMessage}
----------------------------------------

Regards,
AuctionMyCamera
`.trim(),
      })
      .catch((err) => {
        console.error("[contact] Failed to send confirmation to user:", err);
      });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[contact] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Something went wrong sending your message. Please try again." },
      { status: 500 }
    );
  }
}