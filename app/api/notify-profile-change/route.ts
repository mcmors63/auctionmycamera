import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { userEmail, fullName, changes } = await req.json();

    if (!userEmail || !changes || changes.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: missing fields" },
        { status: 400 }
      );
    }

    // TRANSPORT
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const changedList = changes.map((c: string) => `• ${c}`).join("<br>");

    const htmlUser = `
      <h3>Your profile was updated on AuctionMyPlate.</h3>
      <p><strong>Updated fields:</strong></p>
      <p>${changedList}</p>
      <p>If you did not make these changes, contact support immediately.</p>
    `;

    const htmlAdmin = `
      <h3>User Updated Profile</h3>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Updated fields:</strong></p>
      <p>${changedList}</p>
    `;

    // Send to USER
    await transporter.sendMail({
      from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: "Your Profile Has Been Updated",
      html: htmlUser,
    });

    // Send to ADMIN
    await transporter.sendMail({
      from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
      to: "admin@auctionmyplate.co.uk",
      subject: `User Updated Profile: ${fullName}`,
      html: htmlAdmin,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ERROR notify-profile-change:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
