import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// APPWRITE CONFIG
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID || // fallback
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID || // fallback
  "plates";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/$/, "");

// -----------------------------
function getDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// -----------------------------
// POST /api/approve-listing
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const listingId = body.listingId;

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const databases = getDatabases();

    const listing: any = await databases.getDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId
    );

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Admin-adjusted prices
    const starting_price = toNumber(body.starting_price, listing.starting_price);
    const reserve_price = toNumber(body.reserve_price, listing.reserve_price);
    const buy_now = toNumber(body.buy_now, listing.buy_now);

    // Choose auction window
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();

    const useCurrentUpcoming = now.getTime() < currentStart.getTime();
    const start = useCurrentUpcoming ? currentStart : nextStart;
    const end = useCurrentUpcoming ? currentEnd : nextEnd;

    const updated = await databases.updateDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId,
      {
        status: "queued",
        starting_price,
        reserve_price,
        buy_now,
        auction_start: start.toISOString(),
        auction_end: end.toISOString(),
      }
    );

    // -----------------------------
    // Optional seller email
    // -----------------------------
    try {
      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        listing.seller_email
      ) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const itemTitle =
          listing.item_title ||
          [listing.brand, listing.model].filter(Boolean).join(" ") ||
          "your item";

        await transporter.sendMail({
          from: `"AuctionMyCamera" <${process.env.SMTP_USER}>`,
          to: listing.seller_email,
          subject: `✅ Approved: ${itemTitle} is now in Coming Soon`,
          html: `
            <p>Good news!</p>
            <p>Your listing <strong>${itemTitle}</strong> has been approved and queued for auction.</p>
            <p>
              Start: ${start.toLocaleString("en-GB")}<br/>
              End: ${end.toLocaleString("en-GB")}
            </p>
            <p>View your dashboard:<br/>
            <a href="${SITE_URL}/dashboard">${SITE_URL}/dashboard</a></p>
            <p>— AuctionMyCamera Team</p>
          `,
        });
      }
    } catch (emailErr) {
      console.error("Email failed (approval still successful):", emailErr);
    }

    return NextResponse.json({ ok: true, listing: updated });
  } catch (err: any) {
    console.error("Approve error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to approve listing" },
      { status: 500 }
    );
  }
}