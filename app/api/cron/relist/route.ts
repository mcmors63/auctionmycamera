// app/api/cron/relist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (prefer server vars, fall back to NEXT_PUBLIC where needed)
// -----------------------------
const endpoint =
  (process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    ""
  ).trim();

const projectId =
  (process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    ""
  ).trim();

const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

// Cron secret (required)
const cronSecret = (process.env.CRON_SECRET || process.env.AUCTION_CRON_SECRET || "").trim();

// DB / Collections
const DB_ID =
  (process.env.APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
    ""
  ).trim();

const LISTINGS_COLLECTION_ID =
  (process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
    ""
  ).trim();

// Site URL (camera default)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// SMTP
const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.SMTP_PASS || "").trim();

// IMPORTANT: use an address your SMTP provider will actually allow sending from
const FROM_ADDRESS = (
  process.env.FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  SMTP_USER ||
  "no-reply@auctionmycamera.co.uk"
).trim();

const FROM_NAME = (process.env.FROM_NAME || "AuctionMyCamera").trim();

// -----------------------------
// Mail (created once)
// -----------------------------
const mailEnabled = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

const transporter = mailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // ✅ 465 secure, 587 not
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

// -----------------------------
// Time formatting (London)
// -----------------------------
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

// -----------------------------
// Helpers
// -----------------------------
function safeHeaderValue(v: unknown, fallback = "") {
  const s = String(v ?? fallback);
  return s.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getItemLabel(doc: any) {
  const itemTitle = String(doc?.item_title || doc?.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(doc?.brand || "").trim();
  const model = String(doc?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ").trim();
  if (bm) return bm;

  const reg = String(doc?.registration || "").trim();
  if (reg) return reg;

  const gearType = String(doc?.gear_type || doc?.type || "").trim();
  if (gearType) return gearType;

  return "your listing";
}

function isSold(doc: any) {
  const saleStatus = String(doc.sale_status || "").toLowerCase();
  return (
    (doc.sold_price !== null && doc.sold_price !== undefined) ||
    saleStatus.includes("sold") ||
    saleStatus.includes("complete") ||
    saleStatus.includes("winner") ||
    saleStatus.includes("charged")
  );
}

function isWithdrawAfter(doc: any) {
  return (
    Boolean(doc.withdraw_after) ||
    Boolean(doc.withdraw_after_auction) ||
    Boolean(doc.withdraw_after_sale) ||
    Boolean(doc.withdraw_after_current) // you use this field in dashboard
  );
}

function isAuthed(req: NextRequest) {
  // Vercel Cron: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${cronSecret}`;
  if (cronSecret && auth === expected) return true;

  // Fallback for manual testing
  const secret =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-cron-secret") ||
    "";

  return Boolean(cronSecret) && secret === cronSecret;
}

async function sendRelistedEmail(params: {
  sellerEmail: string;
  itemLabel: string;
  start: Date;
  end: Date;
  listingId: string;
}) {
  if (!transporter) return;

  const { sellerEmail, itemLabel, start, end } = params;

  const subject = safeHeaderValue(`Update: ${itemLabel} didn’t sell — we’ve re-listed it`);

  const dashboardLink = `${SITE_URL}/dashboard`;

  // Match your style: Monday 01:00 / Sunday 23:00
  const startLabel = fmtLondonTimeLabel(start);
  const endLabel = fmtLondonTimeLabel(end);

  const text = `Hi,

Your item "${itemLabel}" didn’t sell in the last auction, so we’ve automatically re-listed it for the next weekly auction (because you selected “Keep listing until sold”).

Next auction window (UK time):
Start: ${startLabel}
End:   ${endLabel} (with 5-minute soft close)

You can view your listing and change your relist/withdraw settings here:
${dashboardLink}

— AuctionMyCamera Team`;

  const html = `
    <p>Hi,</p>
    <p>Your item <strong>${escapeHtml(itemLabel)}</strong> didn’t sell in the last auction, so we’ve automatically re-listed it for the next weekly auction (because you selected <strong>“Keep listing until sold”</strong>).</p>
    <p><strong>Next auction window (UK time):</strong><br/>
      Start: ${escapeHtml(startLabel)}<br/>
      End: ${escapeHtml(endLabel)} <em>(with 5-minute soft close)</em>
    </p>
    <p>
      You can view your listing and change your relist/withdraw settings here:<br/>
      <a href="${escapeHtml(dashboardLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    dashboardLink
  )}</a>
    </p>
    <p>— AuctionMyCamera Team</p>
  `;

  await transporter.sendMail({
    from: { name: safeHeaderValue(FROM_NAME, "AuctionMyCamera"), address: FROM_ADDRESS },
    to: sellerEmail,
    subject,
    text,
    html,
  });
}

// -----------------------------
// Appwrite (admin)
// -----------------------------
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new Databases(client);

// -----------------------------
// GET /api/cron/relist
// -----------------------------
export async function GET(req: NextRequest) {
  try {
    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET is not set in environment variables" },
        { status: 500 }
      );
    }

    if (!isAuthed(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ ok: false, error: "Missing Appwrite server env config." }, { status: 500 });
    }

    if (!DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Appwrite listings DB/collection env. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const { now, currentStart, currentEnd, nextStart, nextEnd } = getAuctionWindow();
    const nowMs = now.getTime();

    // -------------------------------------------------------
    // 1) ACTIVATE: queued -> live when inside its own window
    // -------------------------------------------------------
    let scannedQueued = 0;
    let activated = 0;

    // Extra monitoring counters (pure logging, no logic change)
    let queuedSkippedSold = 0;
    let queuedSkippedWithdrawn = 0;
    let queuedSkippedMissingWindow = 0;
    let queuedSkippedBadWindow = 0;
    let queuedSkippedNotInWindow = 0;

    {
      let cursor: string | undefined;

      while (true) {
        const queries: string[] = [
          Query.equal("status", "queued"),
          Query.orderAsc("$id"),
          Query.limit(100),
        ];
        if (cursor) queries.push(Query.cursorAfter(cursor));

        const page = await db.listDocuments(DB_ID, LISTINGS_COLLECTION_ID, queries);
        if (!page.documents.length) break;

        scannedQueued += page.documents.length;

        for (const doc of page.documents as any[]) {
          if (isSold(doc)) {
            queuedSkippedSold++;
            continue;
          }
          if (isWithdrawAfter(doc)) {
            queuedSkippedWithdrawn++;
            continue;
          }

          const startIso = doc.auction_start;
          const endIso = doc.auction_end;
          if (!startIso || !endIso) {
            queuedSkippedMissingWindow++;
            continue;
          }

          const startMs = Date.parse(startIso);
          const endMs = Date.parse(endIso);
          if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
            queuedSkippedBadWindow++;
            continue;
          }

          // If we are inside THIS listing's window, it should be live
          if (nowMs >= startMs && nowMs < endMs) {
            await db.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, doc.$id, { status: "live" });
            activated++;
          } else {
            queuedSkippedNotInWindow++;
          }
        }

        cursor = page.documents[page.documents.length - 1].$id;
        if (page.documents.length < 100) break;
      }
    }

    // -------------------------------------------------------
    // 2) RELIST: ended -> next/current window + reset weekly bid state
    //    + SEND EMAIL (only when relisted)
    // -------------------------------------------------------
    let scannedRelist = 0;
    let relisted = 0;
    let relistEmailsSent = 0;
    let relistEmailsFailed = 0;
    let relistEmailsSkipped = 0;

    // Extra monitoring counters (pure logging, no logic change)
    let relistSkippedSold = 0;
    let relistSkippedWithdrawn = 0;
    let relistSkippedMissingEnd = 0;
    let relistSkippedBadEnd = 0;
    let relistSkippedNotEndedYet = 0;
    let relistSkippedMissingSeller = 0;

    {
      let cursor: string | undefined;

      while (true) {
        const queries: string[] = [
          Query.equal("relist_until_sold", true),
          Query.orderAsc("$id"),
          Query.limit(100),
        ];
        if (cursor) queries.push(Query.cursorAfter(cursor));

        const page = await db.listDocuments(DB_ID, LISTINGS_COLLECTION_ID, queries);
        if (!page.documents.length) break;

        scannedRelist += page.documents.length;

        for (const doc of page.documents as any[]) {
          if (isSold(doc)) {
            relistSkippedSold++;
            continue;
          }
          if (isWithdrawAfter(doc)) {
            relistSkippedWithdrawn++;
            continue;
          }

          const auctionEndIso = doc.auction_end;
          if (!auctionEndIso) {
            relistSkippedMissingEnd++;
            continue;
          }

          const endMs = Date.parse(auctionEndIso);
          if (Number.isNaN(endMs)) {
            relistSkippedBadEnd++;
            continue;
          }

          // Only relist those that have truly ended
          if (nowMs <= endMs) {
            relistSkippedNotEndedYet++;
            continue;
          }

          // IMPORTANT:
          // - If we're after this week's Sunday end, write NEXT window
          // - Otherwise keep within the current weekly window (rare edge)
          const useNext = nowMs > currentEnd.getTime();
          const start = useNext ? nextStart : currentStart;
          const end = useNext ? nextEnd : currentEnd;

          // queued until start, then activation pass flips it to live
          const newStatus = nowMs >= start.getTime() && nowMs < end.getTime() ? "live" : "queued";

          await db.updateDocument(DB_ID, LISTINGS_COLLECTION_ID, doc.$id, {
            status: newStatus,
            auction_start: start.toISOString(),
            auction_end: end.toISOString(),

            // reset weekly bid state
            current_bid: null,
            highest_bidder: null,
            last_bidder: null,
            last_bid_time: null,
            bids: 0,
            bidder_email: null,
            bidder_id: null,
          });

          relisted++;

          // ✅ Email seller (best-effort; do not fail cron if SMTP is down)
          const sellerEmail = String(doc.seller_email || doc.sellerEmail || "").trim();

          if (!sellerEmail) {
            relistEmailsSkipped++;
            relistSkippedMissingSeller++;
            continue;
          }

          if (!mailEnabled) {
            relistEmailsSkipped++;
            continue;
          }

          try {
            await sendRelistedEmail({
              sellerEmail,
              itemLabel: getItemLabel(doc),
              start,
              end,
              listingId: doc.$id,
            });
            relistEmailsSent++;
          } catch (mailErr) {
            console.error("[cron/relist] Failed to send relist email for", doc.$id, mailErr);
            relistEmailsFailed++;
          }
        }

        cursor = page.documents[page.documents.length - 1].$id;
        if (page.documents.length < 100) break;
      }
    }

    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      mailEnabled,

      // Activation
      scannedQueued,
      activated,
      queuedSkips: {
        sold: queuedSkippedSold,
        withdrawn: queuedSkippedWithdrawn,
        missingWindow: queuedSkippedMissingWindow,
        badWindow: queuedSkippedBadWindow,
        notInWindow: queuedSkippedNotInWindow,
      },

      // Relist
      scannedRelist,
      relisted,
      relistEmailsSent,
      relistEmailsFailed,
      relistEmailsSkipped,
      relistSkips: {
        sold: relistSkippedSold,
        withdrawn: relistSkippedWithdrawn,
        missingEnd: relistSkippedMissingEnd,
        badEnd: relistSkippedBadEnd,
        notEndedYet: relistSkippedNotEndedYet,
        missingSeller: relistSkippedMissingSeller,
      },

      // Window visibility (monitoring)
      window: {
        currentStart: currentStart.toISOString(),
        currentEnd: currentEnd.toISOString(),
        nextStart: nextStart.toISOString(),
        nextEnd: nextEnd.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[cron/relist] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}