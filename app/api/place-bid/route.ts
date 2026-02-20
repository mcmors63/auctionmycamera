// app/api/place-bid/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID, Account, Query } from "node-appwrite";
import nodemailer from "nodemailer";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite setup (SERVER-SAFE env)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

// Listings DB/collection (camera-first, legacy fallback)
const DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "";

// Bids collection
const BIDS_COLLECTION =
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  "bids";

// Profiles DB/collection (for Stripe gating)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";

const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

// Admin client for DB reads/writes
const adminClient =
  endpoint && projectId && apiKey
    ? new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
    : null;

const databases = adminClient ? new Databases(adminClient) : null;

// -----------------------------
// Stripe (server-side)
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-11-17.clover" as any })
  : null;

// -----------------------------
// Email setup (re-uses global SMTP env)
// -----------------------------
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.FROM_EMAIL ||
  process.env.SMTP_FROM ||
  process.env.CONTACT_FROM_EMAIL ||
  "";

// lazy-created transporter so we don't create it on every request
let mailTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!SMTP_HOST || !EMAIL_FROM) {
    console.warn("[place-bid] Email disabled: SMTP_HOST or EMAIL_FROM not set in env.");
    return null;
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT || 587,
      secure: SMTP_PORT === 465,
      auth:
        SMTP_USER && SMTP_PASS
          ? {
              user: SMTP_USER,
              pass: SMTP_PASS,
            }
          : undefined,
    });
  }
  return mailTransporter;
}

// -----------------------------
// Auth helpers (JWT required)
// -----------------------------
function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUser(req: Request) {
  const jwt = getBearer(req);
  if (!jwt) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }

  if (!endpoint || !projectId) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Server missing Appwrite config." }, { status: 500 }),
    };
  }

  try {
    const sessionClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(sessionClient);
    const user = await account.get();
    return { ok: true as const, user };
  } catch (e) {
    console.warn("[place-bid] auth failed:", e);
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    };
  }
}

// -----------------------------
// Types
// -----------------------------
type Listing = {
  $id: string;
  status?: string;
  registration?: string; // legacy plates field (harmless if absent)
  item_title?: string;
  title?: string;
  brand?: string;
  model?: string;

  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  // seller email fields vary; we probe in sendBidEmails
  [key: string]: any;
};

function getListingName(l: Listing) {
  const t = String(l.item_title || l.title || "").trim();
  if (t) return t;
  const bm = [l.brand, l.model].filter(Boolean).join(" ").trim();
  if (bm) return bm;
  const reg = String(l.registration || "").trim();
  if (reg) return reg;
  return "your item";
}

// -----------------------------
// Schema-tolerant update (profiles cache)
// -----------------------------
async function updateDocSchemaTolerant(
  db: Databases,
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 12; i++) {
    try {
      return await db.updateDocument(dbId, colId, docId, data);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const m = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
      if (m?.[1]) {
        delete data[m[1]];
        continue;
      }
      throw err;
    }
  }

  // If schema is extremely minimal, just stop silently.
  return null;
}

// -----------------------------
// Stripe gating: require saved card
// -----------------------------
async function requireCardOnFileOr403(opts: { email: string }) {
  const { email } = opts;

  // If Stripe isn’t configured, don’t brick bidding silently — but do fail loudly.
  if (!stripe) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      ),
    };
  }

  // Profiles must be configured to do the customer lookup reliably.
  if (!databases || !PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          error:
            "Profiles database is not configured on the server (cannot verify payment method).",
        },
        { status: 500 }
      ),
    };
  }

  // Find profile by email
  const profRes = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
    Query.equal("email", email),
    Query.limit(1),
  ]);
  const profile: any = profRes.documents?.[0] || null;

  const stripeCustomerId = String(profile?.stripe_customer_id || "").trim();

  if (!stripeCustomerId) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          error: "Please add a card before you can bid.",
          code: "card_required",
        },
        { status: 403 }
      ),
    };
  }

  // Check Stripe for at least 1 card
  const pms = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
    limit: 1,
  });

  const hasCard = Array.isArray(pms.data) && pms.data.length > 0;

  if (!hasCard) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          error: "Please add a card before you can bid.",
          code: "card_required",
        },
        { status: 403 }
      ),
    };
  }

  // Optional: cache in profile if your schema supports it (safe, schema-tolerant)
  try {
    const pmId = pms.data[0]?.id || null;
    if (profile?.$id) {
      await updateDocSchemaTolerant(databases, PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
        stripe_has_card: true,
        stripe_default_payment_method_id: pmId,
      });
    }
  } catch (e) {
    // Don’t block bidding on cache failure
    console.warn("[place-bid] profile cache update skipped:", e);
  }

  return { ok: true as const, profile };
}

// -----------------------------
// Emails
// -----------------------------
async function sendBidEmails(options: { listing: Listing; bidAmount: number; bidderEmail: string }) {
  const { listing, bidAmount, bidderEmail } = options;

  const transporter = getTransporter();
  if (!transporter) return;

  const itemName = getListingName(listing);
  const amountLabel = `£${bidAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const sellerEmail =
    listing.seller_email ||
    listing.sellerEmail ||
    listing.owner_email ||
    listing.ownerEmail ||
    null;

  // Bidder confirmation
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: bidderEmail,
      subject: `Bid placed: ${itemName} (${amountLabel})`,
      text: [
        `Thank you for your bid on ${itemName}.`,
        "",
        `Bid amount: ${amountLabel}`,
        "",
        `If you're the highest bidder when the auction ends, you'll be contacted with the next steps.`,
        "",
        "If you did not place this bid, please contact support immediately.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("[place-bid] Failed to send bidder email:", err);
  }

  if (!sellerEmail) return;

  // Seller notification
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: sellerEmail,
      subject: `New bid on your listing: ${itemName}`,
      text: [
        `A new bid has been placed on your listing: ${itemName}.`,
        "",
        `Bid amount: ${amountLabel}`,
        "",
        `Log in to AuctionMyCamera to view the auction status.`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[place-bid] Failed to send seller email:", err);
  }
}

// -----------------------------
// Bid increment helper
// -----------------------------
function getBidIncrement(current: number): number {
  if (current < 100) return 5;
  if (current < 500) return 10;
  if (current < 1000) return 25;
  if (current < 5000) return 50;
  if (current < 10000) return 100;
  if (current < 25000) return 250;
  if (current < 50000) return 500;
  return 1000;
}

// -----------------------------
// POST /api/place-bid
// Body: { listingId, amount }
// Auth: Authorization: Bearer <Appwrite JWT>
// -----------------------------
export async function POST(req: Request) {
  try {
    // Server sanity
    if (!databases || !DB_ID || !LISTINGS_COLLECTION) {
      return NextResponse.json(
        { error: "Server configuration missing (Appwrite DB/collections)." },
        { status: 500 }
      );
    }

    // Require logged-in user
    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const bidderEmail = (auth.user as any)?.email as string | undefined;
    const bidderId = (auth.user as any)?.$id as string | undefined;

    if (!bidderEmail || !bidderId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // ✅ Stripe gating (card required)
    const gate = await requireCardOnFileOr403({ email: bidderEmail });
    if (!gate.ok) return gate.res;

    const body = await req.json().catch(() => ({} as any));
    const listingId = body?.listingId as string | undefined;
    const amountRaw = body?.amount;

    if (!listingId || amountRaw == null) {
      return NextResponse.json({ error: "Missing listingId or amount." }, { status: 400 });
    }

    const bidAmount =
      typeof amountRaw === "string" ? parseFloat(amountRaw) : Number(amountRaw);

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
    }

    // Load listing
    const listing = (await databases.getDocument(DB_ID, LISTINGS_COLLECTION, listingId)) as unknown as Listing;

    if (!listing || (listing.status || "").toLowerCase() !== "live") {
      return NextResponse.json({ error: "Auction is not live." }, { status: 400 });
    }

    // Soft close safety check
    const now = new Date();
    const nowMs = now.getTime();
    const auctionEnd = listing.auction_end ?? listing.end_time ?? null;

    let newAuctionEnd: string | null = null;

    if (auctionEnd) {
      const endMs = Date.parse(auctionEnd);

      if (Number.isFinite(endMs)) {
        if (endMs <= nowMs) {
          return NextResponse.json({ error: "Auction has already ended." }, { status: 400 });
        }

        const remainingMs = endMs - nowMs;
        const SOFT_CLOSE_WINDOW_MINUTES = 5;
        const SOFT_CLOSE_EXTENSION_MINUTES = 5;

        const softCloseWindowMs = SOFT_CLOSE_WINDOW_MINUTES * 60 * 1000;
        const softCloseExtensionMs = SOFT_CLOSE_EXTENSION_MINUTES * 60 * 1000;

        if (remainingMs > 0 && remainingMs <= softCloseWindowMs) {
          const extendedEnd = new Date(nowMs + softCloseExtensionMs);
          newAuctionEnd = extendedEnd.toISOString();
        }
      }
    }

    // Minimum bid
    const effectiveBaseBid =
      listing.current_bid != null
        ? Number(listing.current_bid)
        : Number(listing.starting_price ?? 0);

    const increment = getBidIncrement(effectiveBaseBid);
    const minimumAllowed = effectiveBaseBid + increment;

    if (bidAmount < minimumAllowed) {
      return NextResponse.json(
        { error: `Minimum bid is £${minimumAllowed.toLocaleString("en-GB")}` },
        { status: 400 }
      );
    }

    // Bid history doc (non-fatal)
    let bidDoc: any = null;

    if (BIDS_COLLECTION) {
      try {
        bidDoc = await databases.createDocument(DB_ID, BIDS_COLLECTION, ID.unique(), {
          listing_id: listing.$id,
          amount: bidAmount,
          timestamp: now.toISOString(),
          bidder_email: bidderEmail,
          bidder_id: bidderId,
        });
      } catch (err) {
        console.error("[place-bid] Failed to create bid document:", err);
      }
    }

    // Update listing
    const newBidsCount = typeof listing.bids === "number" ? listing.bids + 1 : 1;

    const updatePayload: Record<string, any> = {
      current_bid: bidAmount,
      bids: newBidsCount,
      highest_bidder: bidderEmail,
      bidder_email: bidderEmail,
      bidder_id: bidderId,
      last_bid_time: now.toISOString(),
    };

    if (newAuctionEnd) {
      updatePayload.auction_end = newAuctionEnd;
    }

    const updatedListing = await databases.updateDocument(DB_ID, LISTINGS_COLLECTION, listing.$id, updatePayload);

    // Emails (non-fatal)
    try {
      await sendBidEmails({ listing, bidAmount, bidderEmail });
    } catch (err) {
      console.error("[place-bid] Unexpected error in sendBidEmails:", err);
    }

    return NextResponse.json({ ok: true, updatedListing, bidDoc });
  } catch (err: any) {
    console.error("[place-bid] route fatal error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error placing bid. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}