// app/api/relist-plate/route.ts
import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV helpers (DO NOT throw at module load)
// -----------------------------
function env(name: string) {
  return (process.env[name] || "").trim();
}

function requireEnv(name: string) {
  const v = env(name);
  if (!v) return null;
  return v;
}

// -----------------------------
// Appwrite (server/admin) setup
// -----------------------------
function getDatabasesOrNull() {
  const endpoint =
    env("APPWRITE_ENDPOINT") || env("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const projectId = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  const apiKey = requireEnv("APPWRITE_API_KEY");

  if (!endpoint || !projectId || !apiKey) return null;

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// -----------------------------
// Listings DB/collection (NO plates fallbacks)
// -----------------------------
function getListingsTarget() {
  const dbId =
    env("APPWRITE_LISTINGS_DATABASE_ID") ||
    env("NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID");

  const collectionId =
    env("APPWRITE_LISTINGS_COLLECTION_ID") ||
    env("NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID");

  return { dbId, collectionId };
}

// -----------------------------
// Email helpers (best-effort)
// -----------------------------
const SITE_URL = (env("NEXT_PUBLIC_SITE_URL") || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

const SMTP_HOST = env("SMTP_HOST");
const SMTP_PORT = env("SMTP_PORT");
const SMTP_USER = env("SMTP_USER");
const SMTP_PASS = env("SMTP_PASS");

const FROM_EMAIL =
  env("CONTACT_FROM_EMAIL") ||
  SMTP_USER ||
  "no-reply@auctionmycamera.co.uk";

function fmtLondonTimeLabel(d: Date) {
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function createTransporterOrNull() {
  const enabled = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
  if (!enabled) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function titleFromDoc(doc: any) {
  const itemTitle = String(doc?.item_title || doc?.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(doc?.brand || "").trim();
  const model = String(doc?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  if (bm) return bm;

  return "your listing";
}

// -----------------------------
// Route
// -----------------------------
export async function POST(req: Request) {
  try {
    const databases = getDatabasesOrNull();
    if (!databases) {
      return NextResponse.json(
        {
          error:
            "Server Appwrite config missing. Ensure NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_ENDPOINT are set.",
        },
        { status: 500 }
      );
    }

    const { dbId, collectionId } = getListingsTarget();
    if (!dbId || !collectionId) {
      return NextResponse.json(
        {
          error:
            "Listings DB/collection env missing. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId || "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // Load listing
    const doc: any = await databases.getDocument(dbId, collectionId, listingId);

    const status = String(doc?.status || "").toLowerCase();

    // ✅ HARD SAFETY: only allow relist from NOT_SOLD (same as your plate logic)
    if (status !== "not_sold") {
      return NextResponse.json(
        {
          error: "This listing cannot be relisted because it is not marked as not_sold.",
          currentStatus: status || "(missing)",
        },
        { status: 400 }
      );
    }

    // Auction window
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();
    const nowMs = now.getTime();

    const useNext = nowMs > currentEnd.getTime();
    const start = useNext ? nextStart : currentStart;
    const end = useNext ? nextEnd : currentEnd;

    const newStatus =
      nowMs >= start.getTime() && nowMs < end.getTime() ? "live" : "queued";

    // Schema-tolerant reset payload (camera listings may not have all bid fields)
    const updateData: Record<string, any> = {
      status: newStatus,
      auction_start: start.toISOString(),
      auction_end: end.toISOString(),

      // reset common bid state
      current_bid: null,
      bids: 0,
    };

    // Optional fields if they exist
    if (Object.prototype.hasOwnProperty.call(doc, "highest_bidder")) updateData.highest_bidder = null;
    if (Object.prototype.hasOwnProperty.call(doc, "last_bidder")) updateData.last_bidder = null;
    if (Object.prototype.hasOwnProperty.call(doc, "last_bid_time")) updateData.last_bid_time = null;
    if (Object.prototype.hasOwnProperty.call(doc, "bidder_email")) updateData.bidder_email = null;
    if (Object.prototype.hasOwnProperty.call(doc, "bidder_id")) updateData.bidder_id = null;

    // Keep relist flag if present
    if (Object.prototype.hasOwnProperty.call(doc, "relist_until_sold")) {
      updateData.relist_until_sold = !!doc?.relist_until_sold;
    }

    const updated = await databases.updateDocument(dbId, collectionId, listingId, updateData);

    // Best-effort email to seller (if present)
    const sellerEmail = String(doc?.seller_email || doc?.sellerEmail || "").trim();
    const transporter = createTransporterOrNull();

    if (transporter && sellerEmail) {
      const dashboardLink = `${SITE_URL}/dashboard`;
      const startLabel = fmtLondonTimeLabel(start);
      const endLabel = fmtLondonTimeLabel(end);

      try {
        await transporter.sendMail({
          from: `"AuctionMyCamera" <${FROM_EMAIL}>`,
          to: sellerEmail,
          subject: `Update: ${titleFromDoc(doc)} has been re-listed`,
          text: `Hi,

Your listing "${titleFromDoc(doc)}" has been re-listed for the next auction window.

Next auction window (UK time):
Start: ${startLabel}
End:   ${endLabel}

Manage your listing here:
${dashboardLink}

— AuctionMyCamera Team`,
        });
      } catch (mailErr) {
        console.error("[relist-listing] Email send failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error("Relist error:", error);
    return NextResponse.json(
      { error: "Failed to relist listing", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}