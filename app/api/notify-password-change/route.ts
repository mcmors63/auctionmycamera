import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { userEmail, fullName } = await req.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user email" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const userHtml = `
      <h3>Your password was changed on AuctionMyPlate.</h3>
      <p>If this was not you, reset your password immediately.</p>
    `;

    const adminHtml = `
      <h3>Password Changed</h3>
      <p><strong>User:</strong> ${fullName} (${userEmail})</p>
      <p>This user changed their login password.</p>
    `;

    // Send to USER
    await transporter.sendMail({
      from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: "Your Password Has Been Changed",
      html: userHtml,
    });

    // Send to ADMIN
    await transporter.sendMail({
      from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
      to: "admin@auctionmyplate.co.uk",
      subject: `Password Change: ${fullName}`,
      html: adminHtml,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ERROR notify-password-change:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
