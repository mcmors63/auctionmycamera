// app/api/transactions/create-from-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";
import { calculateSettlement } from "@/lib/calculateSettlement";

export const runtime = "nodejs";

// -----------------------------
// ENV: Appwrite
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Plates
const platesDbId = process.env.APPWRITE_PLATES_DATABASE_ID!;
const platesCollectionId = process.env.APPWRITE_PLATES_COLLECTION_ID || "plates";

// Transactions
const txDbId = process.env.APPWRITE_TRANSACTIONS_DATABASE_ID!;
const txCollectionId = process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// -----------------------------
// ENV: SMTP / Site
// -----------------------------
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
  /\/+$/,
  ""
);
const adminEmail = process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

// -----------------------------
// DVLA policy
// -----------------------------
const DVLA_FEE_GBP = 80;

/**
 * IMPORTANT:
 * These are the TWO legacy listings that must remain "buyer pays £80".
 * These must be the Appwrite document IDs (listing $id values).
 */
const LEGACY_BUYER_PAYS_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

// -----------------------------
// Helpers
// -----------------------------
function getAppwriteClient() {
  const client = new Client();
  client.setEndpoint(endpoint);
  client.setProject(project);
  client.setKey(apiKey);
  return client;
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[create-from-sale] SMTP not fully configured. Emails will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Safe wrapper so we never call sendMail with an empty "to"
 */
async function safeSendMail(
  transporter: nodemailer.Transporter,
  opts: nodemailer.SendMailOptions,
  label: string
) {
  const rawTo = opts.to;
  let recipients: string[] = [];

  if (typeof rawTo === "string") {
    recipients = rawTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(rawTo)) {
    recipients = rawTo.map(String).map((s) => s.trim()).filter(Boolean);
  }

  if (!recipients.length) {
    console.warn(`[create-from-sale] ${label}: no valid recipients, skipping email.`);
    return { ok: false, error: "No valid recipients" };
  }

  const finalTo = recipients.join(", ");
  console.log(`[create-from-sale] Sending ${label} email to:`, finalTo);

  await transporter.sendMail({ ...opts, to: finalTo });

  return { ok: true, sentTo: finalTo };
}

/**
 * Body:
 * {
 *   listingId: string;   // plates doc $id
 *   buyerEmail: string;
 *   finalPrice: number;  // plate-only price, e.g. 12500 for £12,500
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const listingId = body.listingId as string | undefined;
    const buyerEmail = body.buyerEmail as string | undefined;
    const finalPrice = Number(body.finalPrice);

    console.log("[create-from-sale] Incoming", { listingId, buyerEmail, finalPrice });

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    if (!buyerEmail) {
      return NextResponse.json({ error: "buyerEmail is required" }, { status: 400 });
    }

    if (!finalPrice || !Number.isFinite(finalPrice) || finalPrice <= 0) {
      return NextResponse.json({ error: "finalPrice must be a positive number" }, { status: 400 });
    }

    const client = getAppwriteClient();
    const databases = new Databases(client);

    // 1) Load the listing from plates
    const listing = await databases.getDocument(platesDbId, platesCollectionId, listingId);

    const reg = ((listing as any).registration as string) || "Unknown";
    const sellerEmail = (listing as any).seller_email as string | undefined;

    const buyerPaysTransferFee = LEGACY_BUYER_PAYS_IDS.has(String(listing.$id));

    console.log("[create-from-sale] Loaded listing", {
      listingId: listing.$id,
      reg,
      sellerEmail,
      buyerPaysTransferFee,
    });

    if (!sellerEmail) {
      console.warn(
        "[create-from-sale] Listing has no seller_email, emails to seller will be skipped."
      );
    }

    // 2) Work out commission etc
    // calculateSettlement() matches your NEW default: seller covers DVLA fee (deducted from payout)
    const settlement = calculateSettlement(finalPrice);

    // Always record DVLA fee as £80
    const dvlaFee = DVLA_FEE_GBP;

    // For legacy listings, buyer pays DVLA fee separately — so seller payout should NOT be reduced by £80.
    // If calculateSettlement deducted it, we add it back.
    const sellerPayout =
      buyerPaysTransferFee ? Math.max(0, settlement.sellerPayout + dvlaFee) : settlement.sellerPayout;

    const commissionRate = settlement.commissionRate;
    const commissionAmount = settlement.commissionAmount;

    const nowIso = new Date().toISOString();

    // 3) Create transaction row in Transactions collection
    const txDoc = await databases.createDocument(txDbId, txCollectionId, ID.unique(), {
      listing_id: listing.$id,
      registration: reg,
      seller_email: sellerEmail || null,
      buyer_email: buyerEmail,
      sale_price: finalPrice, // plate-only
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,
      dvla_fee: dvlaFee,
      payment_status: "pending",
      transaction_status: "awaiting_payment",
      documents: [],
      created_at: nowIso,
      updated_at: nowIso,
    });

    console.log("[create-from-sale] Created transaction", { txId: txDoc.$id });

    // 4) Mark plate as sold (if not already done)
    await databases.updateDocument(platesDbId, platesCollectionId, listing.$id, {
      status: "sold",
      sold_price: finalPrice,
    });

    // 5) Emails (buyer, seller, admin) – best effort, non-fatal
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[create-from-sale] SMTP not configured – skipping all emails.");
    } else {
      const prettyPrice = finalPrice.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyCommission = commissionAmount.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyPayout = sellerPayout.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });
      const prettyDvla = dvlaFee.toLocaleString("en-GB", {
        style: "currency",
        currency: "GBP",
      });

      const dashboardUrl = `${siteUrl}/dashboard?tab=transactions`;

      const dvlaBuyerLine = buyerPaysTransferFee
        ? `This is a legacy listing: an additional DVLA paperwork fee of ${prettyDvla} applies at checkout.`
        : `No additional DVLA paperwork fee is added at checkout (transfer handling is included seller-side).`;

      const dvlaSellerLine = buyerPaysTransferFee
        ? `DVLA assignment fee (paid by buyer): ${prettyDvla}`
        : `DVLA assignment fee (covered seller-side): ${prettyDvla}`;

      // Buyer email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyPlate" <${smtpUser}>`,
            to: buyerEmail,
            subject: `Next steps for ${reg} on AuctionMyPlate`,
            text: [
              `Thank you — your purchase is now in progress.`,
              ``,
              `Registration: ${reg}`,
              `Price (plate): ${prettyPrice}`,
              `${dvlaBuyerLine}`,
              ``,
              `We will now guide you through the DVLA transfer. If we need any further information we will contact you by email.`,
              ``,
              `You can view this transaction in your dashboard:`,
              dashboardUrl,
              ``,
              `AuctionMyPlate.co.uk`,
            ].join("\n"),
            html: `
              <p>Thank you — your purchase is now in progress.</p>
              <p><strong>Registration:</strong> ${reg}<br/>
                 <strong>Price (plate):</strong> ${prettyPrice}<br/>
                 <strong>${dvlaBuyerLine}</strong>
              </p>
              <p>
                We will now guide you through the DVLA transfer.<br/>
                If we need any further information we will contact you by email.
              </p>
              <p>
                You can view this transaction in your dashboard:<br/>
                <a href="${dashboardUrl}">${dashboardUrl}</a>
              </p>
              <p>AuctionMyPlate.co.uk</p>
            `,
          },
          "buyer"
        );
      } catch (buyerErr) {
        console.error("[create-from-sale] Buyer email failed:", buyerErr);
      }

      // Seller email
      try {
        if (sellerEmail) {
          await safeSendMail(
            transporter,
            {
              from: `"AuctionMyPlate" <${smtpUser}>`,
              to: sellerEmail,
              subject: `Your plate ${reg} has sold on AuctionMyPlate`,
              text: [
                `Good news!`,
                ``,
                `Your registration ${reg} has sold on AuctionMyPlate for ${prettyPrice}.`,
                ``,
                `Our commission (${commissionRate}%): ${prettyCommission}`,
                `${dvlaSellerLine}`,
                `Amount due to you (subject to transfer): ${prettyPayout}`,
                ``,
                `We will process the DVLA transfer. Payment to you is usually made once the transfer is complete and all documents are received.`,
                ``,
                `You can upload your documents and track this sale here:`,
                dashboardUrl,
                ``,
                `AuctionMyPlate.co.uk`,
              ].join("\n"),
              html: `
                <p>Good news!</p>
                <p>Your registration <strong>${reg}</strong> has sold on AuctionMyPlate for <strong>${prettyPrice}</strong>.</p>
                <p>
                  Our commission (${commissionRate}%): <strong>${prettyCommission}</strong><br/>
                  ${dvlaSellerLine}<br/>
                  Amount due to you (subject to transfer): <strong>${prettyPayout}</strong>
                </p>
                <p>
                  We will process the DVLA transfer.<br/>
                  Payment to you is usually made <strong>once the transfer is complete</strong> and all documents are received.
                </p>
                <p>
                  Track this sale in your dashboard:<br/>
                  <a href="${dashboardUrl}">${dashboardUrl}</a>
                </p>
                <p>AuctionMyPlate.co.uk</p>
              `,
            },
            "seller"
          );
        } else {
          console.warn("[create-from-sale] No seller_email on listing, seller email skipped.");
        }
      } catch (sellerErr) {
        console.error("[create-from-sale] Seller email failed:", sellerErr);
      }

      // Admin email
      try {
        await safeSendMail(
          transporter,
          {
            from: `"AuctionMyPlate" <${smtpUser}>`,
            to: adminEmail,
            subject: `New sale created: ${reg}`,
            text: [
              `A sale transaction has been created.`,
              ``,
              `Registration: ${reg}`,
              `Sale price (plate-only): ${prettyPrice}`,
              `Commission (${commissionRate}%): ${prettyCommission}`,
              `DVLA fee recorded: ${prettyDvla}`,
              `DVLA model: ${buyerPaysTransferFee ? "legacy_buyer_pays" : "new_seller_pays"}`,
              `Seller payout (expected): ${prettyPayout}`,
              ``,
              `Seller: ${sellerEmail || "N/A"}`,
              `Buyer: ${buyerEmail}`,
              ``,
              `Transaction ID: ${txDoc.$id}`,
            ].join("\n"),
          },
          "admin"
        );
      } catch (adminErr) {
        console.error("[create-from-sale] Admin email failed:", adminErr);
      }
    }

    return NextResponse.json({ success: true, transactionId: txDoc.$id }, { status: 200 });
  } catch (err: any) {
    console.error("[create-from-sale] error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create transaction" }, { status: 500 });
  }
}
