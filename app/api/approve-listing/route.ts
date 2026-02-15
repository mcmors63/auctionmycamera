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

// ✅ Keep backwards compatibility with cloned AuctionMyPlate env names
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

// ✅ Keep backwards compatibility with cloned AuctionMyPlate collection name
const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
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
  "no-reply@auctionmycamera.co.uk";

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

const REPLY_TO_EMAIL = (
  process.env.REPLY_TO_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  "support@auctionmycamera.co.uk"
).trim();

// Optional: set this in Vercel if you want a copy of every approval email
// e.g. APPROVAL_EMAIL_BCC=admin@auctionmycamera.co.uk
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

// Prevent header injection via subjects/names (strip CR/LF)
function safeHeaderValue(v: unknown, fallback = "") {
  const s = String(v ?? fallback);
  return s.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(s: unknown) {
  const v = String(s ?? "");
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    // Load existing listing (may still be the old “plates” document shape)
    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    // Best-effort title (new camera fields first, then legacy)
    const itemTitle =
      safeString(listing.item_title, "").trim() ||
      safeString(listing.title, "").trim() ||
      safeString(listing.registration, "").trim() ||
      `Listing ${listingId}`;

    const sellerEmailFromBody = safeString(body.sellerEmail, "").trim();
    const sellerEmail = sellerEmailFromBody || safeString(listing.seller_email, "").trim() || "";

    // Normalise fields (use admin input if provided, else keep existing)
    const startingPrice = toNumberOrFallback(
      body.starting_price,
      typeof listing.starting_price === "number" ? listing.starting_price : 0
    );

    const reservePrice = toNumberOrFallback(
      body.reserve_price,
      typeof listing.reserve_price === "number" ? listing.reserve_price : 0
    );

    const buyNowPrice = toNumberOrFallback(
      body.buy_now,
      typeof listing.buy_now === "number" ? listing.buy_now : 0
    );

    const interestingFactRaw = safeString(body.interesting_fact, "").trim();
    const interestingFact =
      interestingFactRaw.length > 0 ? interestingFactRaw : safeString(listing.interesting_fact, "");

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
    const updated = await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, {
      status: "queued",
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNowPrice,
      interesting_fact: interestingFact,
      auction_start,
      auction_end,
    });

    // -----------------------------
    // Email seller (non-fatal)
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
      } else if (!isValidEmail(String(sellerEmail))) {
        console.warn("⚠️ Skipping approval email (invalid sellerEmail).", { listingId, sellerEmail });
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

        const safeTitle = escapeHtml(itemTitle);
        const dashboardLink = `${SITE_URL}/dashboard`;

        const info = await transporter.sendMail({
          from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: FROM_ADDRESS },
          to: String(sellerEmail),
          ...(APPROVAL_EMAIL_BCC ? { bcc: APPROVAL_EMAIL_BCC } : {}),
          ...(isValidEmail(REPLY_TO_EMAIL) ? { replyTo: REPLY_TO_EMAIL } : {}),
          subject: safeHeaderValue("✅ Approved: your listing is queued for the next auction"),
          headers: {
            "X-AuctionMyCamera-Event": "listing-approved",
            "X-AuctionMyCamera-ListingId": listingId,
          },
          html: `
            <p>Good news!</p>
            <p>Your listing <strong>${safeTitle}</strong> has been approved and queued for the next weekly auction.</p>
            <p><strong>Next auction window (UK time):</strong><br/>
              Start: ${escapeHtml(fmtLondon(start))}<br/>
              End: ${escapeHtml(fmtLondon(end))}
            </p>
            <p>You can view and manage your listings here:</p>
            <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              dashboardLink
            )}</a></p>
            <p>— AuctionMyCamera Team</p>
          `,
        });

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
    }

    return NextResponse.json({ ok: true, listing: updated, email: emailStatus }, { status: 200 });
  } catch (err: any) {
    console.error("❌ APPROVE-LISTING error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to approve listing." },
      { status: 500 }
    );
  }
}