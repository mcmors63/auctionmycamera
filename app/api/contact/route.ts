// app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
// -----------------------------
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

// ✅ Camera defaults (fixes leftover AuctionMyPlate branding)
const fromEmail =
  process.env.FROM_EMAIL || "AuctionMyCamera <no-reply@auctionmycamera.co.uk>";

const adminEmail =
  process.env.ADMIN_NOTIFICATIONS_EMAIL || "admin@auctionmycamera.co.uk";

const isProd = process.env.NODE_ENV === "production";

// -----------------------------
// SIMPLE IN-MEMORY RATE LIMIT (best-effort on serverless)
// -----------------------------
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getClientIp(req: Request) {
  // Vercel / proxies
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function rateLimit(req: Request) {
  // Allow 5 requests per 10 minutes per IP (best-effort)
  const key = `contact:${getClientIp(req)}`;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 5;

  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }

  if (existing.count >= limit) {
    return { ok: false as const, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { ok: true as const };
}

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
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function cleanOneLine(input: string, max = 140) {
  return (input || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);
}

function isValidEmail(email: string) {
  // Simple sanity check (not perfect, but prevents obvious garbage)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -----------------------------
// POST /api/contact
// -----------------------------
export async function POST(req: Request) {
  try {
    // Best-effort rate limit
    const rl = rateLimit(req);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many messages. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    // 🔐 If SMTP is missing, behave differently in dev vs prod
    if (!hasSmtpConfig()) {
      const msg = "[contact] SMTP not configured.";

      if (isProd) {
        console.error(msg);
        return NextResponse.json(
          { ok: false, error: "Email is not configured on the server. Please try again later." },
          { status: 500 }
        );
      }

      console.warn(
        msg + " Returning ok:true in development. No email will actually be sent."
      );
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
      topic, // optional (your new UI can add it later without breaking)
    }: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      topic?: string;
    } = body;

    const trimmedName = (name || "").trim().slice(0, 80);
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedSubject = cleanOneLine(subject || "", 140) || "New contact form message";
    const trimmedTopic = cleanOneLine(topic || "", 80);
    const trimmedMessage = (message || "").trim();

    if (!trimmedEmail || !trimmedMessage) {
      return NextResponse.json(
        { ok: false, error: "Please provide your email address and a message." },
        { status: 400 }
      );
    }

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Please add a little more detail so we can help properly." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "Your message is too long. Please shorten it and try again." },
        { status: 400 }
      );
    }

    const transporter = createTransport();

    const adminBody = `
New contact form message from AuctionMyCamera.co.uk

Name:    ${trimmedName || "(not provided)"}
Email:   ${trimmedEmail}
Topic:   ${trimmedTopic || "(not provided)"}
Subject: ${trimmedSubject}

Message:
${trimmedMessage}

---
Meta:
IP: ${getClientIp(req)}
UA: ${cleanOneLine(req.headers.get("user-agent") || "", 220) || "(unknown)"}
`.trim();

    // Send to admin
    await transporter.sendMail({
      from: fromEmail,
      to: adminEmail,
      replyTo: trimmedEmail,
      subject: `[Contact] ${trimmedSubject}`,
      text: adminBody,
    });

    // Confirmation to user (non-blocking)
    const userBody = `
Hi${trimmedName ? " " + trimmedName : ""},

Thanks for getting in touch with AuctionMyCamera.
We’ve received your message and will get back to you as soon as we can.

For your reference, this is what you sent:

----------------------------------------
Subject: ${trimmedSubject}
${trimmedTopic ? `Topic: ${trimmedTopic}\n` : ""}
${trimmedMessage}
----------------------------------------

Regards,
AuctionMyCamera
`.trim();

    transporter
      .sendMail({
        from: fromEmail,
        to: trimmedEmail,
        subject: "We’ve received your message – AuctionMyCamera",
        text: userBody,
      })
      .catch((err) => {
        console.error("[contact] Failed to send confirmation to user:", err);
      });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[contact] Fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Something went wrong sending your message. Please try again.",
      },
      { status: 500 }
    );
  }
}
