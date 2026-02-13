// app/api/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side)
// -----------------------------
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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
  /\/$/,
  ""
);

// Sender address MUST be email-only (display name handled separately)
const RAW_FROM_EMAIL =
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "no-reply@auctionmyplate.co.uk";

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyPlate").trim();

const REPLY_TO_EMAIL = (
  process.env.REPLY_TO_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  "support@auctionmyplate.co.uk"
).trim();

// Optional: set this in Vercel if you want a copy of every approval email
// e.g. APPROVAL_EMAIL_BCC=admin@auctionmyplate.co.uk
const APPROVAL_EMAIL_BCC = (process.env.APPROVAL_EMAIL_BCC || "").trim();

function normalizeEmailAddress(input: string) {
  let v = (input || "").trim();

  // If someone pasted: Name <email@domain>
  const angleMatch = v.match(/<([^>]+)>/);
  if (angleMatch?.[1]) v = angleMatch[1].trim();

  // Remove surrounding quotes
  v = v.replace(/^"+|"+$/g, "").trim();

  // Remove whitespace inside
  v = v.replace(/\s+/g, "");

  return v;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const FROM_ADDRESS = normalizeEmailAddress(RAW_FROM_EMAIL);

function getDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function toNumberOrFallback(value: any, fallback: number) {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value: any, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function fmtLondon(d: Date) {
  return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
}

// -----------------------------
// POST /api/approve-listing
// Body: { listingId, sellerEmail?, interesting_fact?, starting_price?, reserve_price?, buy_now? }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ APPROVE-LISTING: Missing Appwrite config");
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = body.listingId as string | undefined;
    if (!listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 });
    }

    const databases = getDatabases();

    // Load existing plate
    const plate: any = await databases.getDocument(PLATES_DB_ID, PLATES_COLLECTION_ID, listingId);

    const registration = safeString(plate.registration, "").trim();
    const sellerEmailFromBody = safeString(body.sellerEmail, "").trim();
    const sellerEmail = sellerEmailFromBody || safeString(plate.seller_email, "").trim() || "";

    // Normalise fields (use admin input if provided, else keep existing)
    const startingPrice = toNumberOrFallback(
      body.starting_price,
      typeof plate.starting_price === "number" ? plate.starting_price : 0
    );

    const reservePrice = toNumberOrFallback(
      body.reserve_price,
      typeof plate.reserve_price === "number" ? plate.reserve_price : 0
    );

    const buyNowPrice = toNumberOrFallback(
      body.buy_now,
      typeof plate.buy_now === "number" ? plate.buy_now : 0
    );

    const interestingFactRaw = safeString(body.interesting_fact, "").trim();
    const interestingFact =
      interestingFactRaw.length > 0 ? interestingFactRaw : safeString(plate.interesting_fact, "");

    // Basic sanity checks
    if (reservePrice > 0 && startingPrice > 0 && startingPrice >= reservePrice) {
      return NextResponse.json(
        { error: "Starting price must be lower than reserve price." },
        { status: 400 }
      );
    }

    if (buyNowPrice > 0) {
      const minBuyNow = Math.max(reservePrice || 0, startingPrice || 0);
      if (buyNowPrice < minBuyNow) {
        return NextResponse.json(
          { error: "Buy Now price cannot be lower than the reserve price or starting price." },
          { status: 400 }
        );
      }
    }

    // -----------------------------
    // Choose the NEXT UPCOMING auction window safely
    // -----------------------------
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();

    const useCurrentUpcoming = now.getTime() < currentStart.getTime();
    const start = useCurrentUpcoming ? currentStart : nextStart;
    const end = useCurrentUpcoming ? currentEnd : nextEnd;

    const auction_start = start.toISOString();
    const auction_end = end.toISOString();

    console.log("✅ APPROVE-LISTING auction window", {
      listingId,
      now: now.toISOString(),
      chosen: useCurrentUpcoming ? "currentStart/currentEnd" : "nextStart/nextEnd",
      auction_start,
      auction_end,
    });

    // Approve & queue for the upcoming auction
    const updated = await databases.updateDocument(PLATES_DB_ID, PLATES_COLLECTION_ID, listingId, {
      status: "queued",
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNowPrice,
      interesting_fact: interestingFact,
      auction_start,
      auction_end,
    });

    // -----------------------------
    // Email seller (non-fatal) + logging to prove it was sent
    // -----------------------------
    let emailStatus: {
      attempted: boolean;
      sent: boolean;
      messageId?: string;
      accepted?: string[];
      rejected?: string[];
      error?: string;
    } = { attempted: false, sent: false };

    try {
      const hasSmtp =
        !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

      const smtpPort = Number(process.env.SMTP_PORT || "465");
      const secure = smtpPort === 465;

      if (!sellerEmail) {
        console.warn("⚠️ Skipping approval email (missing sellerEmail).", { listingId });
      } else if (!hasSmtp) {
        console.warn("⚠️ Skipping approval email (SMTP not fully configured).", {
          listingId,
          SMTP_HOST: !!process.env.SMTP_HOST,
          SMTP_USER: !!process.env.SMTP_USER,
          SMTP_PASS: !!process.env.SMTP_PASS,
        });
      } else if (!isValidEmail(FROM_ADDRESS)) {
        console.error("❌ Invalid FROM email address. Fix FROM_EMAIL in env.", {
          raw: RAW_FROM_EMAIL,
          normalized: FROM_ADDRESS,
        });
      } else {
        emailStatus.attempted = true;

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: smtpPort,
          secure,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const regText = registration || "your registration";
        const dashboardLink = `${SITE_URL}/dashboard`;

        const info = await transporter.sendMail({
          from: { name: FROM_NAME, address: FROM_ADDRESS },
          to: sellerEmail,
          // Optional safety net: get a copy of every approval email
          ...(APPROVAL_EMAIL_BCC ? { bcc: APPROVAL_EMAIL_BCC } : {}),
          replyTo: REPLY_TO_EMAIL,
          subject: `✅ Approved: ${regText} is now in Coming Soon`,
          headers: {
            "X-AuctionMyPlate-Event": "listing-approved",
            "X-AuctionMyPlate-ListingId": listingId,
          },
          html: `
            <p>Good news!</p>
            <p>Your number plate <strong>${regText}</strong> has been approved and is now listed in <strong>Coming Soon</strong>.</p>
            <p><strong>Next auction window:</strong><br/>
              Start: ${fmtLondon(start)}<br/>
              End: ${fmtLondon(end)}
            </p>
            <p>You can view and manage your listing here:</p>
            <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
            <p>— AuctionMyPlate Team</p>
          `,
        });

        // This is your proof in logs that SMTP accepted it
        emailStatus.sent = true;
        emailStatus.messageId = info.messageId;
        emailStatus.accepted = (info.accepted || []).map(String);
        emailStatus.rejected = (info.rejected || []).map(String);

        console.log("✅ Approval email handed to SMTP", {
          listingId,
          sellerEmail,
          messageId: info.messageId,
          accepted: emailStatus.accepted,
          rejected: emailStatus.rejected,
          response: info.response,
        });
      }
    } catch (mailErr: any) {
      emailStatus.sent = false;
      emailStatus.error = mailErr?.message || "Unknown email error";
      console.error("❌ Failed to send approval email:", {
        listingId,
        sellerEmail,
        error: emailStatus.error,
      });
      // never fail the approval because email failed
    }

    return NextResponse.json({ ok: true, plate: updated, email: emailStatus }, { status: 200 });
  } catch (err: any) {
    console.error("❌ APPROVE-LISTING error:", err);
    return NextResponse.json({ error: err?.message || "Failed to approve listing." }, { status: 500 });
  }
}
