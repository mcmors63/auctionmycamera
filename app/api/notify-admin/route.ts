import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { registration, reserve_price, seller_email, plate_type, expiry_date } = await req.json();

    // ✅ Setup mail transporter
   // ✅ Setup mail transporter for Stackmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // Stackmail requires SSL on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Allow self-signed certs occasionally issued by Stackmail
    rejectUnauthorized: false,
  },
});


    // ✅ Format email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; padding:20px; background:#fff8e1; border-radius:8px;">
        <h2 style="color:#d97706;">New Plate Submission – Awaiting Approval</h2>
        <p>A new registration has been submitted on <strong>auctionmyplate.co.uk</strong> and requires admin review.</p>

        <table style="width:100%; margin-top:10px; border-collapse:collapse;">
          <tr><td style="padding:6px 0;"><strong>Registration:</strong></td><td>${registration}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Reserve Price:</strong></td><td>£${reserve_price}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Plate Type:</strong></td><td>${plate_type || "Not specified"}</td></tr>
          ${expiry_date ? `<tr><td style="padding:6px 0;"><strong>Expiry Date:</strong></td><td>${expiry_date}</td></tr>` : ""}
          <tr><td style="padding:6px 0;"><strong>Seller Email:</strong></td><td>${seller_email}</td></tr>
        </table>

        <p style="margin-top:20px;">Log into the admin panel to review and approve this listing.</p>

        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk"}/admin-login"
          style="display:inline-block;margin-top:10px;padding:10px 18px;background:#d97706;color:#fff;text-decoration:none;border-radius:6px;">
          Go to Admin Panel
        </a>

        <p style="margin-top:30px;font-size:12px;color:#666;">This is an automated message from AuctionMyPlate.co.uk.</p>
      </div>
    `;

    // ✅ Send to admin
    await transporter.sendMail({
      from: `"Auction My Plate" <${process.env.SMTP_USER}>`,
      to: "admin@auctionmyplate.co.uk",
      subject: `New Plate Submitted: ${registration}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin notification failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
