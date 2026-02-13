// app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV
// -----------------------------
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT
  ? parseInt(process.env.SMTP_PORT, 10)
  : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const fromEmail =
  process.env.FROM_EMAIL || "AuctionMyPlate <no-reply@auctionmyplate.co.uk>";
const adminEmail =
  process.env.ADMIN_NOTIFICATIONS_EMAIL || "admin@auctionmyplate.co.uk";

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
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

// -----------------------------
// POST /api/contact
// -----------------------------
export async function POST(req: Request) {
  try {
    // 🔐 If SMTP is missing, behave differently in dev vs prod
    if (!hasSmtpConfig()) {
      const msg = "[contact] SMTP not configured.";

      if (isProd) {
        // In production: fail loudly so you notice misconfig
        console.error(msg);
        return NextResponse.json(
          {
            ok: false,
            error:
              "Email is not configured on the server. Please try again later.",
          },
          { status: 500 }
        );
      }

      // In development: log warning but pretend success
      console.warn(
        msg +
          " Returning ok:true in development. No email will actually be sent."
      );
      return NextResponse.json(
        {
          ok: true,
          devNote:
            "SMTP not configured; message not emailed (development environment).",
        },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      subject,
      message,
    }: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    } = body;

    if (!email || !message) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please provide your email address and a message.",
        },
        { status: 400 }
      );
    }

    const trimmedName = (name || "").trim();
    const trimmedEmail = email.trim();
    const trimmedSubject =
      (subject && subject.trim()) || "New contact form message";
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return NextResponse.json(
        { ok: false, error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    const transporter = createTransport();

    const adminBody = `
New contact form message from AuctionMyPlate:

Name:   ${trimmedName || "(not provided)"}
Email:  ${trimmedEmail}

Subject: ${trimmedSubject}

Message:
${trimmedMessage}
`.trim();

    // Send to admin
    await transporter.sendMail({
      from: fromEmail,
      to: adminEmail,
      replyTo: trimmedEmail,
      subject: `[Contact] ${trimmedSubject}`,
      text: adminBody,
    });

    // Optional: confirmation to user (non-blocking)
    if (trimmedEmail) {
      const userBody = `
Hi${trimmedName ? " " + trimmedName : ""},

Thanks for getting in touch with AuctionMyPlate. 
We've received your message and will get back to you as soon as we can.

For your reference, this is what you sent:

----------------------------------------
Subject: ${trimmedSubject}

${trimmedMessage}
----------------------------------------

Regards,
AuctionMyPlate
`.trim();

      transporter
        .sendMail({
          from: fromEmail,
          to: trimmedEmail,
          subject: "We’ve received your message – AuctionMyPlate",
          text: userBody,
        })
        .catch((err) => {
          console.error("[contact] Failed to send confirmation to user:", err);
        });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[contact] Fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Something went wrong sending your message. Please try again.",
      },
      { status: 500 }
    );
  }
}
