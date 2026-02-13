import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { registration, seller_email } = await req.json();

    if (!seller_email || !registration) {
      return NextResponse.json(
        { error: "Missing registration or seller_email" },
        { status: 400 }
      );
    }

    // ✅ Configure transporter (update these values in .env.local)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"Auction My Plate" <${process.env.SMTP_USER}>`,
      to: seller_email,
      subject: `✅ Your number plate ${registration} has been approved!`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:auto;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#eab308;">Your number plate is now approved!</h2>
          <p>Hi there,</p>
          <p>Great news — your plate <strong>${registration}</strong> has been approved and will soon appear in our weekly auction listings.</p>
          <p>You can check its progress anytime in your <a href="https://auctionmyplate.co.uk/dashboard" style="color:#2563eb;text-decoration:none;">Seller Dashboard</a>.</p>
          <hr style="margin:20px 0;">
          <p style="font-size:12px;color:#888;">Auction My Plate © 2025 — Helping you sell your cherished number plates easily.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Approval email sent to ${seller_email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send approval email" },
      { status: 500 }
    );
  }
}
