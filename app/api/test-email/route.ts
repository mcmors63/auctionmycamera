import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// SECURITY
// -----------------------------
// Set this in Vercel env (Production): TEST_EMAIL_SECRET=some-long-random-string
const TEST_EMAIL_SECRET = (process.env.TEST_EMAIL_SECRET || "").trim();

// Optional: allow sending ONLY to these emails (comma-separated), otherwise it will send only to ADMIN_EMAIL.
const TEST_EMAIL_ALLOWED_TO = (process.env.TEST_EMAIL_ALLOWED_TO || "").trim();

// -----------------------------
// SMTP (don’t log secrets)
// -----------------------------
const smtpHost = (process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").trim();

const defaultTo = (process.env.ADMIN_EMAIL || "admin@auctionmycamera.co.uk").trim();

function getTransporter() {
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

function parseRecipients(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(input)) {
    return input.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function allowedRecipients(): Set<string> {
  const base = new Set<string>();
  for (const e of parseRecipients(TEST_EMAIL_ALLOWED_TO)) base.add(e.toLowerCase());
  return base;
}

async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions
) {
  const recipients = parseRecipients(opts.to).map((x) => x.trim()).filter(Boolean);
  if (!recipients.length) {
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log("[test-email] Sending email to:", finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Require secret to prevent public abuse
    const secret = (url.searchParams.get("secret") || "").trim();
    if (!TEST_EMAIL_SECRET) {
      return NextResponse.json(
        { ok: false, error: "TEST_EMAIL_SECRET is not set on server." },
        { status: 500 }
      );
    }
    if (!secret || secret !== TEST_EMAIL_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Optional ?to= override (restricted)
    const toParam = (url.searchParams.get("to") || "").trim();

    // If allowlist not provided, force ADMIN only.
    const allow = allowedRecipients();
    let to = defaultTo;

    if (toParam) {
      if (allow.size === 0) {
        // No allowlist configured: do not allow arbitrary sends
        to = defaultTo;
      } else {
        const requested = toParam.toLowerCase();
        if (allow.has(requested)) to = toParam;
        else to = defaultTo;
      }
    }

    const envSummary = {
      hasSMTP_HOST: Boolean(smtpHost),
      hasSMTP_USER: Boolean(smtpUser),
      hasSMTP_PASS: Boolean(smtpPass),
      smtpPort,
      to,
      hasSecret: Boolean(TEST_EMAIL_SECRET),
      hasAllowlist: Boolean(TEST_EMAIL_ALLOWED_TO),
      vercelEnv: process.env.VERCEL_ENV || null,
      nodeEnv: process.env.NODE_ENV || null,
    };

    console.log("[test-email] ENV SUMMARY:", envSummary);

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { ok: false, error: "SMTP not fully configured on server.", envSummary },
        { status: 500 }
      );
    }

    const transporter = getTransporter();

    const result = await safeSendMail(transporter, {
      from: `"AuctionMyCamera TEST" <${smtpUser}>`,
      to,
      subject: "AuctionMyCamera test email (server)",
      text: "If you can read this, SMTP works on your deployment.",
    });

    return NextResponse.json({ ...result, envSummary });
  } catch (err: any) {
    console.error("[test-email] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown test-email error" },
      { status: 500 }
    );
  }
}