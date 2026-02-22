// app/api/admin/reject-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ----- Appwrite (server) -----
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// ✅ Use camera listings env first, then legacy PLATES env as fallback
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

// ----- Email -----
// Don’t crash the route if SMTP envs aren’t set.
// Also make sender/reply-to camera-branded by default.
function getMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || "465");
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const fromEmail =
    process.env.FROM_EMAIL ||
    process.env.CONTACT_FROM_EMAIL ||
    `admin@auctionmycamera.co.uk`;

  const replyTo =
    process.env.REPLY_TO_EMAIL ||
    process.env.CONTACT_REPLY_TO_EMAIL ||
    fromEmail;

  return { transporter, fromEmail, replyTo };
}

// Simple GET for testing in browser
export async function GET() {
  return NextResponse.json({ ok: true, route: "admin/reject-listing" });
}

export async function POST(req: NextRequest) {
  try {
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error:
            "Missing Appwrite listings env. Set APPWRITE_LISTINGS_DATABASE_ID/APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    // ✅ Accept both legacy and camera naming
    const listingId = body.plateId || body.listingId || body.id;
    const sellerEmail = body.sellerEmail || body.seller_email || "";
    const title = String(body.registration || body.title || body.itemTitle || "your listing").trim();

    if (!listingId || !sellerEmail) {
      return NextResponse.json(
        { error: "Missing listingId (or plateId) or sellerEmail" },
        { status: 400 }
      );
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);

    // ✅ Update status to rejected (don’t assume other fields exist)
    const updated = await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, {
      status: "rejected",
    });

    // Try sending email, but don't fail the rejection if email breaks
    try {
      const mailer = getMailer();
      if (mailer) {
        const { transporter, fromEmail, replyTo } = mailer;

        await transporter.sendMail({
          from: `"AuctionMyCamera" <${fromEmail}>`,
          replyTo,
          to: sellerEmail,
          subject: "Update on your AuctionMyCamera listing",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
              <h1 style="color:#cc0000; font-size:22px; margin: 0 0 14px 0;">
                Listing not approved
              </h1>

              <p style="font-size:15px; color:#333; line-height:1.5;">
                We’ve reviewed <strong>${escapeHtml(title)}</strong>, and unfortunately it hasn’t been approved for auction at this time.
              </p>

              <p style="font-size:14px; color:#555; margin-top:16px; line-height:1.5;">
                If you believe this is an error or you’d like more information, reply to this email or contact us at
                <a href="mailto:${escapeHtml(replyTo)}" style="color:#1a73e8;">${escapeHtml(replyTo)}</a>.
              </p>

              <p style="font-size:14px; color:#555; margin-top:16px; line-height:1.5;">
                You can view your dashboard here:<br/>
                <a href="${SITE_URL}/dashboard" style="color:#1a73e8;">${SITE_URL}/dashboard</a>
              </p>

              <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;" />

              <p style="font-size:12px; color:#777; margin:0;">
                AuctionMyCamera © ${new Date().getFullYear()}
              </p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("reject-listing email error (rejection still successful):", emailErr);
    }

    return NextResponse.json({ ok: true, listing: updated });
  } catch (err: any) {
    console.error("reject-listing error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reject listing" },
      { status: 500 }
    );
  }
}

// Basic HTML escaping to prevent weird characters breaking emails
function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}