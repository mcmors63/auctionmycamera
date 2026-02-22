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
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/$/,
  ""
);

// -----------------------------
function getDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function toNumber(value: any, fallback: any = 0) {
  const n = Number(value);
  if (Number.isFinite(n)) return n;

  const fb = Number(fallback);
  return Number.isFinite(fb) ? fb : 0;
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

// -----------------------------
// POST /api/approve-listing
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error:
            "Server is missing Appwrite listings env. Set APPWRITE_LISTINGS_DATABASE_ID/APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const listingId = body.listingId;

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const databases = getDatabases();

    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Choose auction window
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();

    const useCurrentUpcoming = now.getTime() < currentStart.getTime();
    const start = useCurrentUpcoming ? currentStart : nextStart;
    const end = useCurrentUpcoming ? currentEnd : nextEnd;

    // Build a schema-tolerant update payload:
    // Only write fields that exist on the document to avoid "Unknown attribute" errors,
    // and NEVER overwrite buy now to 0 just because the admin UI didn't send it.
    const updateData: Record<string, any> = {
      status: "queued",
      auction_start: start.toISOString(),
      auction_end: end.toISOString(),
    };

    // starting price
    if (has(listing, "starting_price")) {
      updateData.starting_price = toNumber(body.starting_price, listing.starting_price);
    } else if (has(listing, "startingPrice")) {
      updateData.startingPrice = toNumber(body.starting_price ?? body.startingPrice, listing.startingPrice);
    }

    // reserve price
    if (has(listing, "reserve_price")) {
      updateData.reserve_price = toNumber(body.reserve_price, listing.reserve_price);
    } else if (has(listing, "reservePrice")) {
      updateData.reservePrice = toNumber(body.reserve_price ?? body.reservePrice, listing.reservePrice);
    }

    // buy now (support both schemas, and only write if we actually have a value OR the field exists)
    // IMPORTANT: AdminClient does NOT send buy_now currently, so we must preserve what's in the listing.
    const incomingBuyNow =
      body.buy_now ??
      body.buy_now_price ??
      body.buyNow ??
      body.buyNowPrice ??
      undefined;

    if (has(listing, "buy_now")) {
      // Only update if we were given a value; otherwise keep existing
      updateData.buy_now =
        incomingBuyNow === undefined ? listing.buy_now : toNumber(incomingBuyNow, listing.buy_now);
    } else if (has(listing, "buy_now_price")) {
      updateData.buy_now_price =
        incomingBuyNow === undefined ? listing.buy_now_price : toNumber(incomingBuyNow, listing.buy_now_price);
    }

    const updated = await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, updateData);

    // -----------------------------
    // Optional seller email
    // -----------------------------
    try {
      const sellerEmail = listing.seller_email || listing.sellerEmail || "";

      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && sellerEmail) {
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
          listing.title ||
          [listing.brand, listing.model].filter(Boolean).join(" ") ||
          "your item";

        await transporter.sendMail({
          from: `"AuctionMyCamera" <${process.env.SMTP_USER}>`,
          to: sellerEmail,
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
    return NextResponse.json({ error: err?.message || "Failed to approve listing" }, { status: 500 });
  }
}