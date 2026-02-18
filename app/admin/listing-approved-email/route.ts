// app/api/admin/listing-approved-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;

// Prefer your real camera domain + camera-from address
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

const fromEmail =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  "admin@auctionmycamera.co.uk";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const to = String(body?.to || "").trim();
    // Backwards compatible: some callers may still send "registration"
    const title = String(body?.title || body?.item_title || body?.listing_title || body?.registration || "").trim();

    if (!to || !title) {
      return NextResponse.json(
        { error: "Missing 'to' or listing title in body (expected 'title' or legacy 'registration')." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #d6b45f; font-size: 26px; margin: 0 0 14px;">
          Your listing is now approved
        </h1>

        <p style="font-size: 15px; color: #333; margin: 0 0 10px;">Hi there,</p>

        <p style="font-size: 15px; color: #333; margin: 0 0 14px;">
          Good news — your listing <strong>${esc(title)}</strong> has been approved and will soon appear in our weekly auctions.
        </p>

        <p style="font-size: 15px; color: #333; margin: 0 0 14px;">
          You can check progress anytime in your
          <a href="${SITE_URL}/dashboard" style="color: #2563eb; text-decoration: underline;">Seller Dashboard</a>.
        </p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          AuctionMyCamera © ${new Date().getFullYear()} — buy and sell camera gear with weekly auctions.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject: "Your AuctionMyCamera listing is approved",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("listing-approved-email error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
