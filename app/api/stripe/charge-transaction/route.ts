// app/api/stripe/charge-transaction/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV
// -----------------------------
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
if (!stripeSecretKey) {
  console.warn(
    "[charge-transaction] STRIPE_SECRET_KEY is not set. This route will fail until configured."
  );
}

// ✅ Do NOT force apiVersion unless you have a very specific reason
// (forcing the wrong version can cause runtime errors).
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Appwrite (server-side)
const appwriteEndpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const appwriteProject =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const appwriteApiKey = (process.env.APPWRITE_API_KEY || "").trim();

// Transactions DB/Collection
const TX_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// Profiles (for stripe_customer_id)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";

const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

// Security: REQUIRED secret for server-to-server charging
const CHARGE_TRANSACTION_SECRET = (process.env.CHARGE_TRANSACTION_SECRET || "").trim();

function getSecretFromReq(req: Request, body: any) {
  const header = (req.headers.get("x-charge-secret") || "").trim();
  if (header) return header;
  const fromBody = typeof body?.secret === "string" ? body.secret.trim() : "";
  return fromBody || "";
}

function getAppwrite() {
  if (!appwriteEndpoint || !appwriteProject || !appwriteApiKey) {
    throw new Error(
      "Appwrite env vars missing (APPWRITE_ENDPOINT / PROJECT_ID / API_KEY)."
    );
  }
  if (!TX_DB_ID) {
    throw new Error(
      "Missing TX DB env var (APPWRITE_LISTINGS_DATABASE_ID / NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID)."
    );
  }
  if (!PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
    throw new Error(
      "Missing profiles env vars (APPWRITE_PROFILES_DATABASE_ID / APPWRITE_PROFILES_COLLECTION_ID)."
    );
  }

  const client = new AppwriteClient()
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProject)
    .setKey(appwriteApiKey);

  const databases = new Databases(client);
  return { databases };
}

function asMoneyNumber(n: any): number | null {
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return null;
  return num;
}

function roundToPence(gbp: number) {
  return Math.round(gbp * 100);
}

// -----------------------------
// POST /api/stripe/charge-transaction
// Body: { transactionId, secret? }
// Header alternative: x-charge-secret: ...
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe || !stripeSecretKey) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // ✅ Hard security gate
    if (!CHARGE_TRANSACTION_SECRET) {
      console.error(
        "[charge-transaction] CHARGE_TRANSACTION_SECRET is not set. Refusing to charge."
      );
      return NextResponse.json(
        { ok: false, error: "Server is missing CHARGE_TRANSACTION_SECRET." },
        { status: 500 }
      );
    }

    const providedSecret = getSecretFromReq(req, body);
    if (!providedSecret || providedSecret !== CHARGE_TRANSACTION_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const transactionId: string =
      typeof body?.transactionId === "string" ? body.transactionId.trim() : "";

    if (!transactionId) {
      return NextResponse.json(
        { ok: false, error: "Missing transactionId." },
        { status: 400 }
      );
    }

    const { databases } = getAppwrite();

    // 1) Load the transaction
    const tx = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId);

    const buyerEmail = String((tx as any).buyer_email || "").trim();

    // ✅ If already paid, don't attempt a second charge.
    const existingPaymentStatus = String((tx as any).payment_status || "").toLowerCase();
    const existingPi = String((tx as any).stripe_payment_intent_id || "").trim();
    if (existingPaymentStatus === "paid" && existingPi) {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        paymentIntentId: existingPi,
      });
    }

    // sale price in GBP
    const salePriceRaw = (tx as any).sale_price ?? (tx as any).final_price ?? 0;
    const salePrice = asMoneyNumber(salePriceRaw);

    // Optional buyer fees in GBP (e.g., shipping, insurance)
    const buyerFeesRaw = (tx as any).buyer_fees ?? (tx as any).shipping_fee ?? 0;
    const buyerFees = asMoneyNumber(buyerFeesRaw) ?? 0;

    // Identify listing id (camera listing)
    const listingId = String((tx as any).listing_id || (tx as any).item_id || "").trim();

    if (!buyerEmail) {
      return NextResponse.json(
        { ok: false, error: "Transaction has no buyer_email set." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(salePrice as number) || (salePrice as number) <= 0) {
      return NextResponse.json(
        { ok: false, error: "Transaction has no valid sale_price." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(buyerFees) || buyerFees < 0) {
      return NextResponse.json(
        { ok: false, error: "Transaction has invalid buyer fees." },
        { status: 400 }
      );
    }

    const totalToCharge = (salePrice as number) + buyerFees;
    const amountInPence = roundToPence(totalToCharge);

    if (!Number.isFinite(amountInPence) || amountInPence <= 0) {
      return NextResponse.json(
        { ok: false, error: "Computed charge amount is invalid." },
        { status: 400 }
      );
    }

    // 2) Get buyer profile (for stripe_customer_id)
    const profRes = await databases.listDocuments(
      PROFILES_DB_ID,
      PROFILES_COLLECTION_ID,
      [Query.equal("email", buyerEmail), Query.limit(1)]
    );

    if (!profRes.documents.length) {
      return NextResponse.json(
        { ok: false, error: "Buyer profile not found." },
        { status: 404 }
      );
    }

    const profile = profRes.documents[0] as any;
    const stripeCustomerId: string = String(profile.stripe_customer_id || "").trim();

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Buyer has no Stripe customer / saved card. Ask them to add a payment method.",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    // 3) Get default payment method (or first card)
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    let defaultPmId: string | null = null;

    if (!("deleted" in customer)) {
      const defPm = customer.invoice_settings?.default_payment_method as
        | string
        | { id: string }
        | null
        | undefined;

      if (typeof defPm === "string") defaultPmId = defPm;
      else if (defPm && typeof defPm === "object") defaultPmId = defPm.id;
    }

    const pmList = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 10,
    });

    const firstCard = pmList.data[0];
    const paymentMethodId = defaultPmId || firstCard?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No saved card found for this buyer. Ask them to add a payment method.",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    // 4) Create and confirm PaymentIntent (off-session)
    // ✅ Idempotency: transactionId prevents double charges on retries
    let paymentIntent: Stripe.PaymentIntent;

    try {
      const itemLabel = String(
        (tx as any).item_title ||
          (tx as any).title ||
          (tx as any).listing_title ||
          listingId ||
          transactionId
      );

      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInPence,
          currency: "gbp",
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `AuctionMyCamera – ${itemLabel}`,

          // ✅ Standardised metadata (camelCase)
          metadata: {
            purpose: "transaction_charge",
            transactionId,
            buyerEmail,
            listingId: listingId || "",
            salePriceGbp: String(salePrice),
            buyerFeesGbp: String(buyerFees),
            totalChargedGbp: String(totalToCharge),
          },
        },
        { idempotencyKey: `charge_tx_${transactionId}` }
      );
    } catch (err: any) {
      console.error("[charge-transaction] Stripe error:", err);

      const msg =
        err?.message ||
        err?.raw?.message ||
        "Stripe charge failed. Card may require authentication.";

      // Best-effort mark transaction failed (schema-tolerant)
      try {
        await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId, {
          payment_status: "failed",
          payment_error: msg,
        });
      } catch (updateErr) {
        console.error("[charge-transaction] failed to update transaction on error:", updateErr);
      }

      return NextResponse.json(
        {
          ok: false,
          error: msg,
          code: err?.code || err?.raw?.code,
          requiresAction:
            err?.code === "authentication_required" ||
            err?.raw?.code === "authentication_required",
          requiresPaymentMethod:
            err?.code === "card_declined" ||
            err?.code === "expired_card" ||
            err?.raw?.code === "card_declined" ||
            err?.raw?.code === "expired_card",
        },
        { status: 402 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      const msg = `PaymentIntent not succeeded (status: ${paymentIntent.status}).`;

      // Best-effort update; do not throw
      try {
        await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId, {
          payment_status: "failed",
          payment_error: msg,
          stripe_payment_intent_id: paymentIntent.id,
        });
      } catch (e) {
        console.warn("[charge-transaction] unable to persist failed payment status", e);
      }

      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    // 5) Update transaction as paid (schema tolerant, two-phase)
    const baseUpdate: Record<string, any> = {
      payment_status: "paid",
      stripe_payment_intent_id: paymentIntent.id,
    };

    // Optional details (only if schema supports them)
    const optionalUpdate: Record<string, any> = {
      transaction_status: (tx as any).transaction_status || "processing",
      stripe_amount_charged: totalToCharge,
      stripe_currency: "gbp",
      sale_price: salePrice,
      buyer_fees: buyerFees,
    };

    try {
      await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId, baseUpdate);
    } catch (e) {
      // If even base update fails, that’s serious (but card is charged)
      console.error("[charge-transaction] FAILED to persist base paid status!", e);
      return NextResponse.json(
        { ok: false, error: "Charged in Stripe, but failed to update transaction in Appwrite." },
        { status: 500 }
      );
    }

    // Optional update should never fail the route
    try {
      await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId, optionalUpdate);
    } catch (e: any) {
      console.warn("[charge-transaction] optional tx fields not saved (schema mismatch?)", e?.message || e);
    }

    return NextResponse.json({
      ok: true,
      paymentIntentId: paymentIntent.id,
      amountCharged: totalToCharge,
      salePrice,
      buyerFees,
    });
  } catch (err: any) {
    console.error("[charge-transaction] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to charge transaction." },
      { status: 500 }
    );
  }
}