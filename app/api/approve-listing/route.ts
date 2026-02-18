// app/api/auction-scheduler/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, Query, ID } from "node-appwrite";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";

// -----------------------------
// APPWRITE SETUP
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// BIDS collection (same DB)
const BIDS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BIDS_COLLECTION_ID ||
  process.env.APPWRITE_BIDS_COLLECTION_ID ||
  "";

// TRANSACTIONS collection (same DB)
const TRANSACTIONS_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "";

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

// -----------------------------
// STRIPE
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2025-11-17.clover" as any })
  : null;

// -----------------------------
// EMAIL
// -----------------------------
function getMailer() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
}

function fmtLondon(d: Date) {
  return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
}

// -----------------------------
// SMALL HELPERS
// -----------------------------
function getNumeric(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseTimestamp(ts: any): number {
  if (!ts || typeof ts !== "string") return 0;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? t : 0;
}

// -----------------------------
// Helper: create transaction doc
// Cameras: NO DVLA fee logic.
// -----------------------------
async function createTransactionForWinner(params: {
  listing: any;
  finalBidAmount: number; // winning bid amount (GBP)
  winnerEmail: string;
  paymentIntentId: string;
}) {
  if (!TRANSACTIONS_COLLECTION_ID) {
    console.warn(
      "No TRANSACTIONS_COLLECTION_ID configured; skipping transaction creation."
    );
    return;
  }

  const { listing, finalBidAmount, winnerEmail, paymentIntentId } = params;

  const nowIso = new Date().toISOString();

  const listingId = String(listing.$id || "");
  const title = (listing.item_title as string | undefined) || (listing.registration as string | undefined) || "";
  const sellerEmail = (listing.seller_email as string | undefined) || "";

  const commissionRate = getNumeric(listing.commission_rate); // e.g. 10 = 10%
  const salePriceInt = Math.round(finalBidAmount);

  const commissionAmount = Math.round(
    commissionRate > 0 ? (salePriceInt * commissionRate) / 100 : 0
  );

  const sellerPayout = Math.max(0, salePriceInt - commissionAmount);

  const data: Record<string, any> = {
    listing_id: listingId,
    seller_email: sellerEmail,
    buyer_email: winnerEmail,

    sale_price: salePriceInt,

    commission_rate: commissionRate,
    commission_amount: commissionAmount,

    seller_payout: sellerPayout,

    transaction_status: "pending_documents",
    created_at: nowIso,

    payment_status: "paid",
    registration: title,
    stripe_payment_intent_id: paymentIntentId,
  };

  try {
    await databases.createDocument(DB_ID, TRANSACTIONS_COLLECTION_ID, ID.unique(), data);
  } catch (err) {
    console.error(
      "Failed to create transaction document for listing",
      listingId,
      err
    );
  }
}

// -----------------------------
// GET = manual scheduler run
// -----------------------------
export async function GET() {
  const winnerCharges: any[] = [];

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const nowTs = now.getTime();

    // ---------------------------------
    // 1) Promote queued -> live
    // ---------------------------------
    const queuedRes = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
      Query.equal("status", ["queued", "approvedQueued"]),
      Query.limit(200),
    ]);

    let promoted = 0;

    for (const doc of queuedRes.documents as any[]) {
      const startTs = parseTimestamp(doc.auction_start);
      if (startTs && startTs > nowTs) continue;

      await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, doc.$id, {
        status: "live",
      });
      promoted++;
    }

    // ---------------------------------
    // 2) End live auctions
    // ---------------------------------
    const liveRes = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
      Query.equal("status", "live"),
      Query.lessThanEqual("auction_end", nowIso),
      Query.limit(200),
    ]);

    let completed = 0;
    let markedNotSold = 0;
    let relisted = 0;
    let relistEmailsSent = 0;

    const justCompletedForCharging: any[] = [];
    const mailer = getMailer();

    for (const doc of liveRes.documents as any[]) {
      const lid = doc.$id as string;

      const currentBid = getNumeric(doc.current_bid);
      const reserve = getNumeric(doc.reserve_price);
      const wantsAutoRelist = !!doc.relist_until_sold;

      const hasBid = currentBid > 0;
      const reserveMet = reserve <= 0 ? hasBid : currentBid >= reserve;

      if (hasBid && reserveMet) {
        const updated = await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, lid, {
          status: "completed",
        });
        completed++;
        justCompletedForCharging.push(updated);
        continue;
      }

      if (wantsAutoRelist) {
        const { currentStart, currentEnd, nextStart, nextEnd, now: wnNow } =
          getAuctionWindow();

        const useNext = wnNow.getTime() > currentEnd.getTime();
        const start = useNext ? nextStart : currentStart;
        const end = useNext ? nextEnd : currentEnd;

        await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, lid, {
          status: "queued",
          auction_start: start.toISOString(),
          auction_end: end.toISOString(),

          current_bid: null,
          highest_bidder: null,
          last_bidder: null,
          last_bid_time: null,
          bids: 0,
          bidder_email: null,
          bidder_id: null,
        });

        relisted++;

        const sellerEmail = (doc.seller_email as string | undefined) || "";
        const title = (doc.item_title as string | undefined) || (doc.registration as string | undefined) || "your listing";

        if (mailer && sellerEmail) {
          try {
            const fromEmail = process.env.SMTP_USER || "no-reply@auctionmycamera.co.uk";

            await mailer.sendMail({
              from: `"AuctionMyCamera" <${fromEmail}>`,
              to: sellerEmail,
              subject: `✅ ${title} has been re-listed`,
              text: `Your listing ${title} did not sell this week, so we have automatically re-listed it for the next auction window.

Start: ${fmtLondon(start)}
End:   ${fmtLondon(end)}

— AuctionMyCamera Team`,
            });

            relistEmailsSent++;
          } catch (mailErr) {
            console.error("Failed to send auto-relist email:", mailErr);
          }
        }

        continue;
      }

      await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, lid, {
        status: "not_sold",
      });
      markedNotSold++;
    }

    // ---------------------------------
    // 3) Charge winners for SOLD listings only
    // Cameras: charge winning bid only (no DVLA logic)
    // ---------------------------------
    if (!stripe || !BIDS_COLLECTION_ID) {
      return NextResponse.json({
        ok: true,
        now: nowIso,
        promoted,
        completed,
        markedNotSold,
        relisted,
        relistEmailsSent,
        winnerCharges: [],
        note: "Stripe or BIDS collection not configured – skipped winner charging.",
      });
    }

    for (const listing of justCompletedForCharging) {
      const lid = listing.$id as string;

      const currentBid = getNumeric(listing.current_bid);
      const reserve = getNumeric(listing.reserve_price);

      if (!currentBid || currentBid <= 0) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "no bids / current_bid is 0" });
        continue;
      }

      if (reserve > 0 && currentBid < reserve) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: `reserve not met (bid=${currentBid}, reserve=${reserve})`,
        });
        continue;
      }

      // ---- Load bids for this listing ----
      let bidsRes;
      try {
        bidsRes = await databases.listDocuments(DB_ID, BIDS_COLLECTION_ID, [
          Query.equal("listing_id", lid),
          Query.limit(1000),
        ]);
      } catch (err) {
        console.error(
          `Failed to list bids for listing ${lid}. Check BIDS indexes/attributes.`,
          err
        );
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "failed to load bids (Appwrite error)",
        });
        continue;
      }

      const bids = (bidsRes.documents as any[]) || [];
      if (!bids.length) {
        winnerCharges.push({
          listingId: lid,
          skipped: true,
          reason: "no bids found in BIDS collection",
        });
        continue;
      }

      bids.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));
      const winningBid = bids[0];

      const rawAmount =
        winningBid.amount !== undefined ? winningBid.amount : winningBid.bid_amount;

      const winningAmount = getNumeric(rawAmount);
      const winnerEmail = winningBid.bidder_email || "";

      if (!winnerEmail) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "winning bid has no bidder_email" });
        continue;
      }

      if (!winningAmount || winningAmount <= 0) {
        winnerCharges.push({ listingId: lid, skipped: true, reason: "winning bid has invalid amount" });
        continue;
      }

      const finalBidAmount = winningAmount || currentBid;
      const totalToCharge = finalBidAmount;
      const amountInPence = Math.round(totalToCharge * 100);

      try {
        const existing = await stripe.customers.list({ email: winnerEmail, limit: 1 });

        let customer = existing.data[0];
        if (!customer) {
          customer = await stripe.customers.create({ email: winnerEmail });
        }

        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: "card",
          limit: 1,
        });

        if (!paymentMethods.data.length) {
          winnerCharges.push({
            listingId: lid,
            skipped: true,
            reason: "winner has no saved card in Stripe (must add card via payment-method page)",
            winnerEmail,
          });
          continue;
        }

        const paymentMethod = paymentMethods.data[0];
        const idempotencyKey = `winner-charge-${lid}`;

        const label = listing.item_title || listing.registration || listing.listing_id || lid;
        const description = `Auction winner - ${label}`;

        const intent = await stripe.paymentIntents.create(
          {
            amount: amountInPence,
            currency: "gbp",
            customer: customer.id,
            payment_method: paymentMethod.id,
            confirm: true,
            off_session: true,
            description,
            metadata: {
              listingId: lid,
              winnerEmail,
              type: "auction_winner",
              finalBidAmount: String(finalBidAmount),
            },
          },
          { idempotencyKey }
        );

        // Update listing document (best-effort)
        try {
          const commissionRate = getNumeric(listing.commission_rate);
          const soldPrice = finalBidAmount;
          const saleFee = commissionRate > 0 ? (soldPrice * commissionRate) / 100 : 0;

          const sellerNetAmount = Math.max(0, soldPrice - saleFee);

          const buyerId = listing.buyer_id || listing.highest_bidder || null;

          await databases.updateDocument(DB_ID, PLATES_COLLECTION_ID, lid, {
            buyer_email: winnerEmail,
            buyer_id: buyerId,
            sold_price: soldPrice,
            sale_fee: saleFee,
            seller_net_amount: sellerNetAmount,
            sale_status: "winner_charged",
            payout_status: "pending",
          });
        } catch (updateErr) {
          console.error(
            `Failed to update listing doc for ${lid} after charge`,
            updateErr
          );
        }

        await createTransactionForWinner({
          listing,
          finalBidAmount,
          winnerEmail,
          paymentIntentId: intent.id,
        });

        winnerCharges.push({
          listingId: lid,
          charged: true,
          winnerEmail,
          bid: finalBidAmount,
          totalCharged: totalToCharge,
          paymentIntentId: intent.id,
          paymentStatus: intent.status,
        });
      } catch (err: any) {
        console.error(`Stripe error charging winner for listing ${lid}:`, err);
        const entry: any = {
          listingId: lid,
          charged: false,
          winnerEmail,
          error: err?.message || "Stripe charge failed.",
        };
        const anyErr = err as any;
        if (anyErr?.raw?.payment_intent) {
          entry.paymentIntentId = anyErr.raw.payment_intent.id;
          entry.paymentStatus = anyErr.raw.payment_intent.status;
        }
        winnerCharges.push(entry);
      }
    }

    return NextResponse.json({
      ok: true,
      now: nowIso,
      promoted,
      completed,
      markedNotSold,
      relisted,
      relistEmailsSent,
      winnerCharges,
    });
  } catch (err: any) {
    console.error("auction-scheduler error", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
