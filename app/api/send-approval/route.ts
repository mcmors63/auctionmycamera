import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { to, registration } = await req.json();

    // ✅ Set up transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Send HTML email
    await transporter.sendMail({
      from: `"Auction My Plate" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your listing ${registration} has been approved!`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color:#fff8e1; padding:20px; border-radius:10px;">
          <h2 style="color:#d97706;">Your number plate has been approved!</h2>
          <p>Dear Seller,</p>
          <p>Your number plate <strong>${registration}</strong> has been approved by our team and will appear in the <strong>next live auction</strong>.</p>
          <p>We’ll notify you again when the auction begins.</p>
          <p>Thank you for using <strong>AuctionMyPlate.co.uk</strong>!</p>
          <hr style="margin-top:20px; border:0; border-top:1px solid #fcd34d;" />
          <p style="font-size:13px; color:#666;">This is an automated message, please do not reply.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email send failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
