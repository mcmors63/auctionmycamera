// app/api/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Account, Permission, Role } from "node-appwrite";
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

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

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

// ✅ Admin auth options:
// Option A) browser admin calls with Authorization: Bearer <JWT> (recommended)
// Option B) server-to-server with x-admin-secret / ?secret=
const APPROVE_LISTING_SECRET = (process.env.APPROVE_LISTING_SECRET || "").trim();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@auctionmycamera.co.uk")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

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

const APPROVAL_EMAIL_BCC = (process.env.APPROVAL_EMAIL_BCC || "").trim();

function normalizeEmailAddress(input: string) {
  let v = (input || "").trim();
  const angleMatch = v.match(/<([^>]+)>/);
  if (angleMatch?.[1]) v = angleMatch[1].trim();
  v = v.replace(/^"+|"+$/g, "").trim();
  v = v.replace(/\s+/g, "");
  return v;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function getAdminDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function getAuthedUser(req: NextRequest) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) return null;

  const userClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(userClient);

  try {
    const me: any = await account.get();
    if (!me?.$id || !me?.email) return null;

    return {
      id: String(me.$id),
      email: String(me.email),
    };
  } catch {
    return null;
  }
}

function isAdminRequest(req: NextRequest, authedUser: { email: string } | null) {
  const secretHeader = (req.headers.get("x-admin-secret") || "").trim();
  const secretQuery = (req.nextUrl.searchParams.get("secret") || "").trim();

  const secretOk =
    !!APPROVE_LISTING_SECRET &&
    (secretHeader === APPROVE_LISTING_SECRET || secretQuery === APPROVE_LISTING_SECRET);

  const emailOk =
    !!authedUser?.email &&
    ADMIN_EMAILS.includes(String(authedUser.email).trim().toLowerCase());

  return secretOk || emailOk;
}

// If you ever enable Document Security (Row Security), you’ll want queued/live listings to be publicly readable.
function buildPublicReadPermissions(ownerId: string) {
  return [
    Permission.read(Role.any()),
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];
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

    const authedUser = await getAuthedUser(req);

    // ✅ Production safety: require admin auth
    if (process.env.NODE_ENV === "production" && !isAdminRequest(req, authedUser)) {
      return NextResponse.json(
        {
          error:
            "Forbidden. Admin auth required (send Authorization: Bearer <JWT> as an admin, or x-admin-secret).",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = body.listingId as string | undefined;
    if (!listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 });
    }

    const databases = getAdminDatabases();

    const listing: any = await databases.getDocument(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      listingId
    );

    // Best-effort title (camera fields first, then legacy)
    const itemTitle =
      safeString(listing.item_title, "").trim() ||
      safeString(listing.title, "").trim() ||
      safeString(listing.registration, "").trim() ||
      `Listing ${listingId}`;

    const ownerId = String(listing.owner_id || listing.ownerId || "").trim();

    const sellerEmailFromBody = safeString(body.sellerEmail, "").trim();
    const sellerEmail = sellerEmailFromBody || safeString(listing.seller_email, "").trim() || "";

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
    // Choose the correct auction window
    // ✅ If we are BEFORE the end of the current window, use currentStart/currentEnd.
    // Otherwise, use nextStart/nextEnd.
    // -----------------------------
    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow(new Date());

    const useCurrentWindow = now.getTime() < currentEnd.getTime();
    const start = useCurrentWindow ? currentStart : nextStart;
    const end = useCurrentWindow ? currentEnd : nextEnd;

    const auction_start = start.toISOString();
    const auction_end = end.toISOString();

    console.log("✅ APPROVE-LISTING auction window", {
      listingId,
      now: now.toISOString(),
      chosen: useCurrentWindow ? "currentStart/currentEnd" : "nextStart/nextEnd",
      auction_start,
      auction_end,
    });

    const updateData: Record<string, any> = {
      status: "queued",
      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNowPrice,
      interesting_fact: interestingFact,
      auction_start,
      auction_end,

      // ✅ Reset bid state on approval (prevents £0 base bid bugs)
      current_bid: null,
      bids: 0,
      highest_bidder: null,
      last_bidder: null,
      last_bid_time: null,
      bidder_email: null,
      bidder_id: null,
    };

    let updated: any;

    // Try to also make it publicly readable if Document Security is on (safe fallback)
    if (ownerId) {
      try {
        updated = await (databases as any).updateDocument(
          LISTINGS_DB_ID,
          LISTINGS_COLLECTION_ID,
          listingId,
          updateData,
          buildPublicReadPermissions(ownerId)
        );
      } catch {
        updated = await databases.updateDocument(
          LISTINGS_DB_ID,
          LISTINGS_COLLECTION_ID,
          listingId,
          updateData
        );
      }
    } else {
      updated = await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, updateData);
    }

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
          subject: safeHeaderValue("✅ Approved: your listing is queued for the weekly auction"),
          headers: {
            "X-AuctionMyCamera-Event": "listing-approved",
            "X-AuctionMyCamera-ListingId": listingId,
          },
          html: `
            <p>Good news!</p>
            <p>Your listing <strong>${safeTitle}</strong> has been approved and queued for the weekly auction.</p>
            <p><strong>Auction window (UK time):</strong><br/>
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
