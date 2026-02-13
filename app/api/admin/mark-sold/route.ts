// app/api/admin/mark-sold/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// ENV (server-side)
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Main DB
const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

// Collections
const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Use same DB for transactions
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  PLATES_DB_ID;

// HARD-CODED: your Transactions table ID really is "transactions"
const TX_COLLECTION_ID = "transactions";

// Public site URL (for dashboard links in emails)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk";

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
// Helper: Appwrite client
// -----------------------------
function getServerDatabases() {
  const client = new Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function isProd() {
  // Vercel Preview still reports NODE_ENV=production, so prefer VERCEL_ENV when present.
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

function logDev(...args: any[]) {
  if (!isProd()) console.log(...args);
}

// -----------------------------
// POST /api/admin/mark-sold
// Body: { plateId, finalPrice, buyerEmail }
// NOTE: This route does NOT charge the buyer — it records the sale + creates the tx.
// DVLA fee charging (legacy only) happens in your Stripe charge routes.
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ MARK-SOLD: Missing endpoint / projectId / apiKey");
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }

    if (!PLATES_DB_ID || !PLATES_COLLECTION_ID || !TX_DB_ID || !TX_COLLECTION_ID) {
      console.error("❌ MARK-SOLD: Missing DB/collection IDs", {
        PLATES_DB_ID,
        PLATES_COLLECTION_ID,
        TX_DB_ID,
        TX_COLLECTION_ID,
      });
      return NextResponse.json({ error: "Server DB configuration incomplete." }, { status: 500 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { plateId, finalPrice, buyerEmail } = body || {};
    logDev("MARK-SOLD BODY", { plateId, finalPrice, buyerEmail });

    if (!plateId || finalPrice == null) {
      return NextResponse.json({ error: "plateId and finalPrice are required." }, { status: 400 });
    }

    const salePrice = Number(finalPrice);
    if (Number.isNaN(salePrice) || salePrice <= 0) {
      return NextResponse.json({ error: "finalPrice must be a positive number." }, { status: 400 });
    }

    const databases = getServerDatabases();

    // 1) Load the plate
    const plate: any = await databases.getDocument(PLATES_DB_ID, PLATES_COLLECTION_ID, plateId);

    const sellerEmail = plate.seller_email as string | undefined;
    const registration = plate.registration as string | undefined;
    const commissionRateRaw = plate.commission_rate as number | undefined;
    const listingFeeRaw = plate.listing_fee as number | undefined;

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Plate has no seller_email. Cannot create transaction." },
        { status: 500 }
      );
    }

    // 2) Decide who pays DVLA fee (SERVER ENFORCED)
    const buyerPaysTransferFee = LEGACY_BUYER_PAYS_IDS.has(String(plate.$id));

    // 3) Money
    const commissionRate =
      typeof commissionRateRaw === "number" && commissionRateRaw >= 0 ? commissionRateRaw : 10;

    const listingFee = typeof listingFeeRaw === "number" && listingFeeRaw >= 0 ? listingFeeRaw : 0;

    const commissionAmount = Math.round((salePrice * commissionRate) / 100);

    // DVLA fee is always recorded…
    const dvlaFee = DVLA_FEE_GBP;

    // …but payout logic depends on legacy:
    // - legacy: buyer pays +£80 separately later → DO NOT deduct from seller payout
    // - new: seller covers £80 → deduct from seller payout
    const sellerDvlaDeduction = buyerPaysTransferFee ? 0 : DVLA_FEE_GBP;

    const sellerPayout = Math.max(0, salePrice - commissionAmount - listingFee - sellerDvlaDeduction);

    const nowIso = new Date().toISOString();

    // 4) Create transaction (matches your Transactions schema + flags)
    const txDoc = await databases.createDocument(TX_DB_ID, TX_COLLECTION_ID, ID.unique(), {
      listing_id: plate.$id,
      seller_email: sellerEmail,
      buyer_email: buyerEmail || "",

      // Plate-only sale price (NOT including DVLA fee even for legacy)
      sale_price: salePrice,

      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      seller_payout: sellerPayout,

      // Always record DVLA fee amount
      dvla_fee: dvlaFee,

      payment_status: "pending",
      transaction_status: "pending",
      documents: [],

      created_at: nowIso,
      updated_at: nowIso,
      registration: registration || "",

      // Seller flags
      seller_docs_requested: false,
      seller_docs_received: false,
      seller_payment_transferred: false,
      seller_process_complete: false,

      // Buyer flags
      buyer_info_requested: false,
      buyer_info_received: false,
      buyer_tax_mot_validated: false,
      buyer_payment_taken: false,
      buyer_transfer_complete: false,
    });

    // 5) Update plate as sold
    await databases.updateDocument(PLATES_DB_ID, PLATES_COLLECTION_ID, plate.$id, {
      status: "sold",
      current_bid: salePrice,
    });

    logDev("✅ MARK-SOLD success", {
      plateId: plate.$id,
      txId: txDoc.$id,
      buyerPaysTransferFee,
      policy: buyerPaysTransferFee ? "legacy_buyer_pays" : "new_seller_pays",
    });

    // 6) Emails – Seller, Buyer, Admin (best-effort)
    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.warn("⚠️ SMTP env not set, skipping emails.");
      } else {
        const regText = registration || "your registration";
        const salePriceText = salePrice.toLocaleString("en-GB");
        const sellerPayoutText = sellerPayout.toLocaleString("en-GB");
        const dvlaText = dvlaFee.toLocaleString("en-GB");
        const dashboardLink = `${SITE_URL}/dashboard`;

        const dvlaSellerLine = buyerPaysTransferFee
          ? `DVLA assignment fee (paid by buyer): £${dvlaText}`
          : `DVLA assignment fee (covered seller-side): £${dvlaText}`;

        const dvlaBuyerLine = buyerPaysTransferFee
          ? `This is a legacy listing: an additional £${dvlaText} DVLA paperwork fee applies at checkout.`
          : `No additional DVLA paperwork fee is added at checkout (transfer handling is included seller-side).`;

        const dvlaAdminLine = buyerPaysTransferFee
          ? `DVLA fee model: Buyer pays +£${dvlaText} (legacy)`
          : `DVLA fee model: Seller covers £${dvlaText} (deducted from payout)`;

        // ------------------------------
        // A) SELLER EMAILS (2)
        // ------------------------------
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: sellerEmail,
          subject: `🎉 Your number plate has sold: ${regText}`,
          html: `
            <p>Fantastic news!</p>
            <p>Your number plate <strong>${regText}</strong> has just sold on <strong>AuctionMyPlate</strong> for <strong>£${salePriceText}</strong>.</p>
            <p>
              Based on our current fee structure, your expected payout is <strong>£${sellerPayoutText}</strong><br/>
              <small>(subject to us receiving the correct paperwork from you and the buyer, and the DVLA transfer completing).</small>
            </p>
            <p><strong>${dvlaSellerLine}</strong></p>
            <p>You can keep an eye on progress in your dashboard at any time:</p>
            <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
            <p>We’ll also send you a separate email explaining exactly what documents we need from you next.</p>
            <p>Thank you for trusting <strong>AuctionMyPlate.co.uk</strong> with your sale.</p>
          `,
        });

        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: sellerEmail,
          subject: `📄 Action needed: documents for ${regText}`,
          html: `
            <p>To complete the sale of <strong>${regText}</strong>, we now need your DVLA paperwork.</p>
            <p>This may include your V5C/logbook or retention certificate, depending on how the plate is currently held.</p>
            <p>Please log in to your AuctionMyPlate dashboard and upload the requested documents in the <strong>Transactions</strong> section:</p>
            <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
            <p>Once our team has checked everything, we’ll proceed with the DVLA transfer and your payout of <strong>£${sellerPayoutText}</strong>.</p>
            <p>If anything doesn’t make sense, just reply to this email or contact <a href="mailto:admin@auctionmyplate.co.uk">admin@auctionmyplate.co.uk</a>.</p>
            <p>Thank you,<br />AuctionMyPlate.co.uk</p>
          `,
        });

        // ------------------------------
        // B) BUYER EMAILS (if email supplied)
        // ------------------------------
        if (buyerEmail) {
          await transporter.sendMail({
            from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
            to: buyerEmail,
            subject: `🎉 You’ve purchased ${regText} on AuctionMyPlate`,
            html: `
              <p>Congratulations!</p>
              <p>You’ve successfully purchased <strong>${regText}</strong> on <strong>AuctionMyPlate</strong> for <strong>£${salePriceText}</strong>.</p>
              <p><strong>${dvlaBuyerLine}</strong></p>
              <p>Our team will now guide you through the DVLA transfer so the registration can be correctly assigned to your vehicle.</p>
              <p>You can view the transaction and next steps in your dashboard:</p>
              <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
              <p>Please remember the registration must go onto a vehicle that is taxed and holds a valid MOT (if required). This is a DVLA requirement.</p>
              <p>Thank you for buying through <strong>AuctionMyPlate.co.uk</strong>.</p>
            `,
          });

          await transporter.sendMail({
            from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
            to: buyerEmail,
            subject: `📄 Action needed: documents & details for ${regText}`,
            html: `
              <p>To complete your purchase of <strong>${regText}</strong>, we now need a few documents and details from you.</p>

              <p><strong>What we typically need from you:</strong></p>
              <ul>
                <li>A clear photo or scan of the <strong>V5C (logbook)</strong> for the vehicle the plate will be assigned to.</li>
                <li>A clear photo of your <strong>photocard driving licence</strong>.</li>
                <li>Any additional proof we request in your AuctionMyPlate dashboard (for example, proof of address if needed).</li>
              </ul>

              <p><strong>How to upload your documents:</strong></p>
              <ol>
                <li>Go to <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a> and log in.</li>
                <li>Click <strong>My Dashboard</strong>.</li>
                <li>Open the <strong>Transactions &amp; Documents</strong> tab.</li>
                <li>Find the transaction for <strong>${regText}</strong>.</li>
                <li>Use the <strong>Upload documents</strong> section to upload each required file (photos or PDFs are fine).</li>
              </ol>

              <p>
                Once you’ve uploaded your documents, our team will review them, confirm your vehicle is eligible 
                (taxed and with a valid MOT if required), and then complete payment and the DVLA transfer.
              </p>

              <p>If anything is unclear, you can reply to this email or contact <a href="mailto:admin@auctionmyplate.co.uk">admin@auctionmyplate.co.uk</a>.</p>

              <p>Thank you,<br />AuctionMyPlate.co.uk</p>
            `,
          });
        }

        // ------------------------------
        // C) ADMIN EMAIL (single summary)
        // ------------------------------
        await transporter.sendMail({
          from: `"AuctionMyPlate" <${process.env.SMTP_USER}>`,
          to: "admin@auctionmyplate.co.uk",
          subject: `Plate sold: ${regText} for £${salePriceText}`,
          html: `
            <p>A plate has just been marked as sold on AuctionMyPlate.</p>
            <ul>
              <li><strong>Registration:</strong> ${regText}</li>
              <li><strong>Sale price (plate-only):</strong> £${salePriceText}</li>
              <li><strong>DVLA fee recorded:</strong> £${dvlaText}</li>
              <li><strong>${dvlaAdminLine}</strong></li>
              <li><strong>Seller payout (expected):</strong> £${sellerPayoutText}</li>
              <li><strong>Seller:</strong> ${sellerEmail}</li>
              <li><strong>Buyer:</strong> ${buyerEmail || "not provided"}</li>
            </ul>
            <p>Next admin actions:</p>
            <ul>
              <li>Ensure seller documents are requested and tracked</li>
              <li>Ensure buyer information & vehicle details are collected</li>
              <li>Confirm tax & MOT status where required</li>
              <li>Take payment (legacy listings: buyer total includes +£80 DVLA fee)</li>
              <li>Complete DVLA transfer and update the transaction status to "complete" in the admin panel</li>
            </ul>
            <p>This is an automated notification from AuctionMyPlate.co.uk.</p>
          `,
        });

        logDev("✅ Seller/Buyer/Admin sold emails sent");
      }
    } catch (mailErr) {
      console.error("❌ Failed to send one or more sold emails:", mailErr);
      // don’t fail whole request over email
    }

    return NextResponse.json(
      {
        ok: true,
        transaction: txDoc,
        buyerPaysTransferFee,
        policy: buyerPaysTransferFee ? "legacy_buyer_pays" : "new_seller_pays",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ MARK-SOLD API error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to mark plate as sold and create transaction.",
      },
      { status: 500 }
    );
  }
}
