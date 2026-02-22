// app/api/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// APPWRITE CONFIG (server-safe for DB writes)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// -----------------------------
function getDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
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

function escapeHtml(s: unknown) {
  const v = String(s ?? "");
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtLondon(d: Date) {
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "full",
    timeStyle: "short",
  });
}

// -----------------------------
// POST /api/approve-listing
// Body: { listingId, starting_price, reserve_price, buy_now* }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    // ✅ Real admin gate: session-based
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error:
            "Server is missing Appwrite listings env. Set APPWRITE_LISTINGS_DATABASE_ID/APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const databases = getDatabases();
    if (!databases) {
      return NextResponse.json(
        { error: "Server Appwrite config missing (endpoint/project/apiKey)." },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = body?.listingId;
    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const listing: any = await databases.getDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId
    );

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Choose auction window
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();

    const useCurrentUpcoming = now.getTime() < currentStart.getTime();
    const start = useCurrentUpcoming ? currentStart : nextStart;
    const end = useCurrentUpcoming ? currentEnd : nextEnd;

    // Schema-tolerant update payload
    const updateData: Record<string, any> = {
      status: "queued",
      auction_start: start.toISOString(),
      auction_end: end.toISOString(),
    };

    // starting price
    if (has(listing, "starting_price")) {
      updateData.starting_price = toNumber(body.starting_price, listing.starting_price);
    } else if (has(listing, "startingPrice")) {
      updateData.startingPrice = toNumber(
        body.starting_price ?? body.startingPrice,
        listing.startingPrice
      );
    }

    // reserve price
    if (has(listing, "reserve_price")) {
      updateData.reserve_price = toNumber(body.reserve_price, listing.reserve_price);
    } else if (has(listing, "reservePrice")) {
      updateData.reservePrice = toNumber(
        body.reserve_price ?? body.reservePrice,
        listing.reservePrice
      );
    }

    // buy now (only write if field exists)
    const incomingBuyNow =
      body.buy_now ??
      body.buy_now_price ??
      body.buyNow ??
      body.buyNowPrice ??
      undefined;

    if (has(listing, "buy_now")) {
      updateData.buy_now =
        incomingBuyNow === undefined ? listing.buy_now : toNumber(incomingBuyNow, listing.buy_now);
    } else if (has(listing, "buy_now_price")) {
      updateData.buy_now_price =
        incomingBuyNow === undefined
          ? listing.buy_now_price
          : toNumber(incomingBuyNow, listing.buy_now_price);
    }

    const updated = await databases.updateDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId,
      updateData
    );

    // -----------------------------
    // Optional seller email (best-effort)
    // -----------------------------
    try {
      const sellerEmail = String(listing.seller_email || listing.sellerEmail || "").trim();

      const smtpHost = (process.env.SMTP_HOST || "").trim();
      const smtpUser = (process.env.SMTP_USER || "").trim();
      const smtpPass = (process.env.SMTP_PASS || "").trim();
      const smtpPort = Number(process.env.SMTP_PORT || "465");
      const smtpSecure = smtpPort === 465;

      const tlsRejectUnauthorized =
        (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false";

      const fromEmail =
        process.env.FROM_EMAIL ||
        process.env.CONTACT_FROM_EMAIL ||
        smtpUser ||
        "admin@auctionmycamera.co.uk";

      const replyTo =
        process.env.REPLY_TO_EMAIL ||
        process.env.CONTACT_REPLY_TO_EMAIL ||
        fromEmail;

      if (smtpHost && smtpUser && smtpPass && sellerEmail) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: tlsRejectUnauthorized },
        });

        const itemTitle =
          String(listing.item_title || listing.title || "").trim() ||
          [listing.brand, listing.model].filter(Boolean).join(" ").trim() ||
          "your item";

        await transporter.sendMail({
          from: `"AuctionMyCamera" <${fromEmail}>`,
          replyTo,
          to: sellerEmail,
          subject: `✅ Approved: ${itemTitle} is now in Coming Soon`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
              <p>Good news!</p>
              <p>Your listing <strong>${escapeHtml(itemTitle)}</strong> has been approved and queued for auction.</p>
              <p>
                <strong>Start (UK time):</strong> ${escapeHtml(fmtLondon(start))}<br/>
                <strong>End (UK time):</strong> ${escapeHtml(fmtLondon(end))}
              </p>
              <p>View your dashboard:<br/>
              <a href="${SITE_URL}/dashboard">${SITE_URL}/dashboard</a></p>
              <p>— AuctionMyCamera Team</p>
            </div>
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