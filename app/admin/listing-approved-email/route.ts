// app/api/admin/listing-approved-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const fromEmail = process.env.FROM_EMAIL || "admin@auctionmyplate.co.uk";

export async function POST(req: NextRequest) {
  try {
    const { to, registration } = await req.json();

    if (!to || !registration) {
      return NextResponse.json(
        { error: "Missing 'to' or 'registration' in body" },
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
        <h1 style="color: #f5a800; font-size: 28px; margin-bottom: 16px;">
          Your number plate is now approved!
        </h1>
        <p style="font-size: 16px; color: #333;">Hi there,</p>
        <p style="font-size: 16px; color: #333;">
          Great news — your plate
          <strong>${registration}</strong>
          has been approved and will soon appear in our weekly auction listings.
        </p>
        <p style="font-size: 16px; color: #333;">
          You can check its progress anytime in your
          <a href="https://auctionmyplate.co.uk/dashboard" style="color: #2563eb;">Seller Dashboard</a>.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">
          Auction My Plate © 2025 — Helping you sell your cherished number plates easily.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject: "Your number plate is now approved!",
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
