// app/api/admin/reject-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// ----- Appwrite (server) -----
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// ----- Email -----
const SMTP_HOST = process.env.SMTP_HOST!;
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER!;
const SMTP_PASS = process.env.SMTP_PASS!;
const FROM_EMAIL = process.env.FROM_EMAIL || "admin@auctionmyplate.co.uk";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Simple GET for testing in browser
export async function GET() {
  return NextResponse.json({ ok: true, route: "reject-listing" });
}

export async function POST(req: NextRequest) {
  try {
    const { plateId, registration, sellerEmail } = await req.json();

    if (!plateId || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing plateId or sellerEmail" },
        { status: 400 }
      );
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    // Update status to rejected
    const updated = await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      plateId,
      { status: "rejected" }
    );

    // Try sending email, but don't fail if it breaks
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: sellerEmail,
        subject: "Your number plate listing was not approved",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
            <h1 style="color:#cc0000; font-size:24px; margin-bottom:16px;">
              Update on your listing
            </h1>

            <p style="font-size:16px; color:#333;">Hi there,</p>

            <p style="font-size:16px; color:#333; line-height:1.5;">
              We’ve reviewed your plate ${
                registration || "listing"
              }, and unfortunately it hasn’t been approved for auction at this time.
            </p>

            <p style="font-size:14px; color:#555; margin-top:16px; line-height:1.5;">
              If you believe this is an error or would like more information,
              please contact our team at
              <a href="mailto:admin@auctionmyplate.co.uk" style="color:#1a73e8;">
                admin@auctionmyplate.co.uk
              </a>
              and quote your registration.
            </p>

            <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;" />

            <p style="font-size:12px; color:#777;">
              AuctionMyPlate.co.uk © 2025.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("reject-listing email error:", err);
    }

    return NextResponse.json({ ok: true, plate: updated });
  } catch (err: any) {
    console.error("reject-listing error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reject listing" },
      { status: 500 }
    );
  }
}
