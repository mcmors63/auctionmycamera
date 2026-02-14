// app/api/stripe/charge-winner/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// -----------------------------
// DVLA policy
// -----------------------------
// £80 DVLA fee (in pence)
const DVLA_FEE_PENCE = 80_00; // 8000

/**
 * IMPORTANT:
 * These are the TWO legacy listings that must remain "buyer pays £80".
 * These must be the Appwrite document IDs (listing $id values).
 */
const LEGACY_BUYER_PAYS_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

type ChargeWinnerBody = {
  listingId?: string;
  winnerEmail: string;
  amountInPence: number; // final bid amount, in pence (plate-only)
  dvlaFeeIncluded?: boolean; // client hint ONLY (never trusted)
  dvlaFeeOverridePence?: number; // ignored unless legacy
};

export async function POST(req: NextRequest) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      console.warn("[charge-winner] STRIPE_SECRET_KEY is not set.");
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    // Create Stripe ONLY after key exists (prevents Vercel build-time crash)
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = (await req.json().catch(() => ({}))) as Partial<ChargeWinnerBody>;

    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim() : "";
    const winnerEmail =
      typeof body.winnerEmail === "string" ? body.winnerEmail.trim() : "";
    const amountInPence = body.amountInPence;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!listingId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "listingId is required (needed to enforce legacy DVLA policy safely).",
        },
        { status: 400 }
      );
    }

    if (!winnerEmail) {
      return NextResponse.json(
        { ok: false, error: "winnerEmail is required." },
        { status: 400 }
      );
    }

    if (
      amountInPence == null ||
      typeof amountInPence !== "number" ||
      !Number.isInteger(amountInPence) ||
      amountInPence <= 0
    ) {
      return NextResponse.json(
        { ok: false, error: "amountInPence must be a positive integer." },
        { status: 400 }
      );
    }

    // -----------------------------
    // SERVER-ENFORCED DVLA POLICY
    // -----------------------------
    const isLegacyBuyerPays = LEGACY_BUYER_PAYS_IDS.has(listingId);

    // Client hint accepted only to prevent double-add on legacy flows.
    const clientSaysIncluded = body.dvlaFeeIncluded === true;

    let dvlaFeeToAdd = 0;

    if (isLegacyBuyerPays) {
      // Legacy: buyer pays £80 extra, unless already included in amountInPence
      if (!clientSaysIncluded) {
        const override =
          typeof body.dvlaFeeOverridePence === "number" &&
          Number.isInteger(body.dvlaFeeOverridePence) &&
          body.dvlaFeeOverridePence > 0
            ? body.dvlaFeeOverridePence
            : DVLA_FEE_PENCE;

        dvlaFeeToAdd = override;
      }
    } else {
      // New policy: buyer never pays £80 here.
      dvlaFeeToAdd = 0;
    }

    const totalAmount = amountInPence + dvlaFeeToAdd;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Computed total charge is invalid." },
        { status: 400 }
      );
    }

    // -----------------------------
    // FIND STRIPE CUSTOMER BY EMAIL
    // -----------------------------
    const customers = await stripe.customers.list({
      email: winnerEmail,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          ok: false,
          error: "No Stripe customer found for this email.",
          detail:
            "User probably never completed the setup-intent / save-card step.",
        },
        { status: 404 }
      );
    }

    // -----------------------------
    // GET DEFAULT PAYMENT METHOD
    // -----------------------------
    let paymentMethodId: string | null = null;

    const defPm = customer.invoice_settings?.default_payment_method as
      | string
      | { id: string }
      | null
      | undefined;

    if (typeof defPm === "string") paymentMethodId = defPm;
    else if (defPm && typeof defPm === "object" && typeof defPm.id === "string")
      paymentMethodId = defPm.id;

    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: "card",
        limit: 1,
      });

      if (!paymentMethods.data.length) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Customer has no saved card on file. Cannot charge off-session.",
          },
          { status: 400 }
        );
      }

      paymentMethodId = paymentMethods.data[0].id;
    }

    // -----------------------------
    // CREATE OFF-SESSION PAYMENT INTENT
    // -----------------------------
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "gbp",
      customer: customer.id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Auction winner charge for listing ${listingId}`,
      metadata: {
        type: "auction_winner_charge",
        listingId,
        winnerEmail,
        buyer_pays_transfer_fee: isLegacyBuyerPays ? "true" : "false",
        dvla_fee_added_pence: String(dvlaFeeToAdd),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amountCharged: paymentIntent.amount,
        currency: paymentIntent.currency,
        buyerPaysTransferFee: isLegacyBuyerPays,
        dvlaFeeAddedPence: dvlaFeeToAdd,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[charge-winner] error:", err);

    const stripeError = err?.raw ?? err;

    const message =
      stripeError?.message ||
      err?.message ||
      "Failed to charge winner off-session.";

    const code = stripeError?.code;
    const declineCode = stripeError?.decline_code;

    const statusCode =
      code === "authentication_required" || code === "card_declined"
        ? 402
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code,
        declineCode,
      },
      { status: statusCode }
    );
  }
}