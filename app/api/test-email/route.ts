import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Read env safely (don’t log secrets)
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const defaultTo =
  process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[test-email] SMTP not fully configured. Emails will be skipped."
    );
  }

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

// Safe wrapper so we never call sendMail with an empty "to"
async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions
) {
  const rawTo = opts.to;
  let recipients: string[] = [];

  if (typeof rawTo === "string") {
    recipients = rawTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawTo)) {
    recipients = rawTo.map(String).map((s) => s.trim()).filter(Boolean);
  }

  if (!recipients.length) {
    console.warn("[test-email] No valid recipients, skipping email.");
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log("[test-email] Sending email to:", finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
}

export async function GET(req: NextRequest) {
  try {
    // Allow ?to=you@example.com override
    const url = new URL(req.url);
    const toParam = url.searchParams.get("to") || undefined;
    const to = (toParam || defaultTo).trim();

    const envSummary = {
      hasSMTP_HOST: Boolean(smtpHost),
      hasSMTP_USER: Boolean(smtpUser),
      hasSMTP_PASS: Boolean(smtpPass),
      smtpPort,
      defaultTo: to,
      vercelEnv: process.env.VERCEL_ENV || null,
      nodeEnv: process.env.NODE_ENV || null,
    };

    console.log("[test-email] ENV SUMMARY:", envSummary);

    // If SMTP not configured, bail early
    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          ok: false,
          error: "SMTP not fully configured on server.",
          envSummary,
        },
        { status: 500 }
      );
    }

    const transporter = getTransporter();

    const result = await safeSendMail(transporter, {
      from: `"AuctionMyPlate TEST" <${smtpUser}>`,
      to,
      subject: "AuctionMyPlate test email (Vercel)",
      text: "If you can read this, SMTP works on your Vercel deployment.",
    });

    return NextResponse.json({
      ...result,
      envSummary,
    });
  } catch (err: any) {
    console.error("[test-email] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown test-email error",
      },
      { status: 500 }
    );
  }
}
