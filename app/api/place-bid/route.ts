// app/api/place-bid/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, ID, Account, Query } from "node-appwrite";
import nodemailer from "nodemailer";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// Appwrite setup (SERVER-SAFE env)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

// ✅ IMPORTANT: use LISTINGS if present, otherwise fall back to old PLATES env
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

const BIDS_COLLECTION =
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  "bids";

// Admin client for database reads/writes
const adminClient =
  endpoint && projectId && apiKey
    ? new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
    : null;

const databases = adminClient ? new Databases(adminClient) : null;

// -----------------------------
// Stripe (server)
// -----------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Optional profiles cache (to store stripe_customer_id)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";
const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

function getProfilesDbOrNull() {
  if (!endpoint || !projectId || !apiKey || !PROFILES_DB_ID || !PROFILES_COLLECTION_ID) return null;

  const c = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { databases: new Databases(c) };
}

async function findProfileByEmail(aw: Databases, email: string) {
  const res = await aw.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
    Query.equal("email", email),
    Query.limit(1),
  ]);
  return (res.documents[0] as any) || null;
}

async function hasSavedCardForEmail(email: string): Promise<{ has: boolean; customerId?: string | null }> {
  if (!stripe) {
    return { has: false, customerId: null };
  }

  const aw = getProfilesDbOrNull();
  let profile: any | null = null;
  let stripeCustomerId: string | null = null;

  if (aw) {
    try {
      profile = await findProfileByEmail(aw.databases, email);
      stripeCustomerId = profile?.stripe_customer_id || null;
    } catch (e) {
      console.warn("[place-bid] profile lookup skipped:", e);
    }
  }

  const hasCard = async (customerId: string) => {
    const pm = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    return pm.data.length > 0;
  };

  if (stripeCustomerId) {
    try {
      const ok = await hasCard(stripeCustomerId);
      if (ok) return { has: true, customerId: stripeCustomerId };
    } catch (e) {
      console.warn("[place-bid] cached customer card check failed:", stripeCustomerId, e);
    }
  }

  const customers = await stripe.customers.list({ email, limit: 10 });
  for (const c of customers.data) {
    try {
      const ok = await hasCard(c.id);
      if (ok) {
        if (aw && profile?.$id && profile.stripe_customer_id !== c.id) {
          try {
            await aw.databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
              stripe_customer_id: c.id,
            });
          } catch (syncErr) {
            console.warn("[place-bid] failed to sync stripe_customer_id:", syncErr);
          }
        }
        return { has: true, customerId: c.id };
      }
    } catch (e) {
      console.warn("[place-bid] customer card check failed:", c.id, e);
    }
  }

  return { has: false, customerId: null };
}

// -----------------------------
// Email setup
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

  item_title?: string | null;
  brand?: string | null;
  model?: string | null;
  registration?: string;

  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  [key: string]: any;
};

async function sendBidEmails(options: { listing: Listing; bidAmount: number; bidderEmail: string }) {
  const { listing, bidAmount, bidderEmail } = options;

  const transporter = getTransporter();
  if (!transporter) return;

  const title =
    (listing.item_title || "").trim() ||
    [listing.brand, listing.model].filter(Boolean).join(" ").trim() ||
    listing.registration ||
    "your listing";

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

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: bidderEmail,
      subject: `Bid placed on ${title}: ${amountLabel}`,
      text: [
        `Thank you for your bid on ${title}.`,
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

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: sellerEmail,
      subject: `New bid on your listing: ${title}`,
      text: [
        `A new bid has been placed on: ${title}.`,
        "",
        `Bid amount: ${amountLabel}`,
        "",
        `Log in to view the current bids and auction status.`,
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
    if (!databases || !DB_ID || !LISTINGS_COLLECTION) {
      return NextResponse.json(
        { error: "Server configuration missing (Appwrite DB/collections)." },
        { status: 500 }
      );
    }

    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const bidderEmail = (auth.user as any)?.email as string | undefined;
    const bidderId = (auth.user as any)?.$id as string | undefined;

    if (!bidderEmail || !bidderId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const pm = await hasSavedCardForEmail(bidderEmail);
    if (!pm.has) {
      return NextResponse.json(
        {
          error: "You must add a card before you can bid.",
          code: "no_payment_method",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const listingId = body?.listingId as string | undefined;
    const amountRaw = body?.amount;

    if (!listingId || amountRaw == null) {
      return NextResponse.json({ error: "Missing listingId or amount." }, { status: 400 });
    }

    const bidAmount = typeof amountRaw === "string" ? parseFloat(amountRaw) : Number(amountRaw);

    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount." }, { status: 400 });
    }

    // Load listing
    const listing = (await databases.getDocument(DB_ID, LISTINGS_COLLECTION, listingId)) as unknown as Listing;

    if (!listing || (listing.status || "").toLowerCase() !== "live") {
      return NextResponse.json({ error: "Auction is not live." }, { status: 400 });
    }

    // Soft close
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

    // Minimum allowed bid
    const effectiveBaseBid =
      listing.current_bid != null ? Number(listing.current_bid) : Number(listing.starting_price ?? 0);

    const increment = getBidIncrement(effectiveBaseBid);
    const minimumAllowed = effectiveBaseBid + increment;

    if (bidAmount < minimumAllowed) {
      return NextResponse.json(
        { error: `Minimum bid is £${minimumAllowed.toLocaleString("en-GB")}` },
        { status: 400 }
      );
    }

    // Create bid history doc (non-fatal if fails)
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
      console.error("[place-bid] sendBidEmails error:", err);
    }

    return NextResponse.json({ ok: true, updatedListing, bidDoc });
  } catch (err: any) {
    console.error("[place-bid] route fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error placing bid. Please try again." },
      { status: 500 }
    );
  }
}