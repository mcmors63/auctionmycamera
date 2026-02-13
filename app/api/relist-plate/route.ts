import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV helpers
// -----------------------------
function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

// -----------------------------
// Appwrite (server/admin) setup
// -----------------------------
const client = new Client()
  .setEndpoint(
    (
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      ""
    ).trim()
  )
  .setProject(requiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(requiredEnv("APPWRITE_API_KEY"));

const databases = new Databases(client);

// Plates DB/collection (prefer server env, fall back to NEXT_PUBLIC)
const PLATES_DB_ID = (
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  ""
).trim();

const PLATES_COLLECTION_ID = (
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  ""
).trim();

if (!PLATES_DB_ID) throw new Error("APPWRITE_PLATES_DATABASE_ID is not set");
if (!PLATES_COLLECTION_ID)
  throw new Error("APPWRITE_PLATES_COLLECTION_ID is not set");

// -----------------------------
// Email helpers (Stackmail style)
// -----------------------------
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = (process.env.SMTP_PORT || "").trim();
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.SMTP_PASS || "").trim();

const FROM_EMAIL =
  (process.env.CONTACT_FROM_EMAIL || "").trim() ||
  SMTP_USER ||
  "no-reply@auctionmyplate.co.uk";

function fmtLondonTimeLabel(d: Date) {
  // Example: "Monday 01:00"
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
    secure: true, // Stackmail 465
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// -----------------------------
// Route
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId || "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // ✅ Load the listing from Appwrite (do NOT trust client-provided email/registration)
    const doc: any = await databases.getDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId
    );

    const status = String(doc?.status || "").toLowerCase();
    const sellerEmail = String(doc?.seller_email || "").trim();
    const registration = String(doc?.registration || "").trim();
    const relistUntilSold = !!doc?.relist_until_sold;

    if (!sellerEmail || !registration) {
      return NextResponse.json(
        { error: "Listing is missing seller_email or registration" },
        { status: 400 }
      );
    }

    // ✅ HARD SAFETY: only allow relist from NOT_SOLD
    // This prevents resetting bids/timer during a live auction.
    if (status !== "not_sold") {
      return NextResponse.json(
        {
          error:
            "This listing cannot be relisted because it is not marked as not_sold.",
          currentStatus: status || "(missing)",
        },
        { status: 400 }
      );
    }

    // ✅ Compute the correct auction window (do NOT change helper logic)
    const { now, currentStart, currentEnd, nextStart, nextEnd } =
      getAuctionWindow();
    const nowMs = now.getTime();

    // If current week already ended, relist into NEXT week
    const useNext = nowMs > currentEnd.getTime();
    const start = useNext ? nextStart : currentStart;
    const end = useNext ? nextEnd : currentEnd;

    // Typically queued for next start; live if relisted during window
    const newStatus =
      nowMs >= start.getTime() && nowMs < end.getTime() ? "live" : "queued";

    // ✅ Update listing window + status + reset bid state
    const updated = await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      listingId,
      {
        status: newStatus,
        auction_start: start.toISOString(),
        auction_end: end.toISOString(),

        // Reset weekly bid state
        current_bid: null,
        highest_bidder: null,
        last_bidder: null,
        last_bid_time: null,
        bids: 0,
        bidder_email: null,
        bidder_id: null,

        // Keep seller preference as-is
        relist_until_sold: relistUntilSold,
      }
    );

    // ✅ Send confirmation email (best-effort; do not fail API if SMTP is down)
    const transporter = createTransporterOrNull();
    if (transporter) {
      const dashboardLink = `${SITE_URL}/dashboard`;
      const startLabel = fmtLondonTimeLabel(start);
      const endLabel = fmtLondonTimeLabel(end);

      try {
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${FROM_EMAIL}>`,
          to: sellerEmail,
          subject: `Update: ${registration} has been re-listed`,
          text: `Hi,

Your plate ${registration} has been re-listed for the next weekly auction.

Next auction window (UK time):
Start: ${startLabel}
End:   ${endLabel} (with 5-minute soft close)

Manage your listing here:
${dashboardLink}

— AuctionMyPlate Team`,
        });
      } catch (mailErr) {
        console.error("[relist-plate] Email send failed:", mailErr);
        // do not fail the relist if email fails
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error("Relist error:", error);
    return NextResponse.json(
      {
        error: "Failed to relist plate",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
