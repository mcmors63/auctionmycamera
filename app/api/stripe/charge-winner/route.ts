// app/api/stripe/charge-winner/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type ChargeWinnerBody = {
  // Optional but strongly recommended for idempotency + traceability
  listingId?: string;

  // Required
  winnerEmail: string;
  amountInPence: number; // final amount to charge, in pence

  // Optional
  description?: string; // overrides the default description
  metadata?: Record<string, any>;

  // Security / idempotency
  secret?: string; // alternative to x-charge-secret header
  idempotencyKey?: string; // optional override
};

function getSecretFromReq(req: NextRequest, body: any) {
  const header = (req.headers.get("x-charge-secret") || "").trim();
  if (header) return header;
  const fromBody = typeof body?.secret === "string" ? body.secret.trim() : "";
  return fromBody || "";
}

function coerceMetadata(meta: any): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (typeof k !== "string") continue;
    if (v == null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    const CHARGE_WINNER_SECRET = process.env.CHARGE_WINNER_SECRET || "";

    if (!STRIPE_SECRET_KEY) {
      console.warn("[charge-winner] STRIPE_SECRET_KEY is not set.");
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    if (!CHARGE_WINNER_SECRET) {
      console.error("[charge-winner] CHARGE_WINNER_SECRET is not set. Refusing to charge.");
      return NextResponse.json(
        { ok: false, error: "Server is missing CHARGE_WINNER_SECRET." },
        { status: 500 }
      );
    }

    // Create Stripe ONLY after key exists (prevents build-time crash)
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = (await req.json().catch(() => ({}))) as Partial<ChargeWinnerBody>;

    // ✅ Hard security gate
    const providedSecret = getSecretFromReq(req, body);
    if (!providedSecret || providedSecret !== CHARGE_WINNER_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
    const winnerEmail = typeof body.winnerEmail === "string" ? body.winnerEmail.trim() : "";
    const amountInPence = body.amountInPence;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
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

    const metadata = coerceMetadata(body.metadata);
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : listingId
          ? `AuctionMyCamera – winner charge for listing ${listingId}`
          : `AuctionMyCamera – winner charge`;

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
          detail: "User probably never completed the save-card step.",
          requiresPaymentMethod: true,
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
    else if (defPm && typeof defPm === "object" && typeof defPm.id === "string") {
      paymentMethodId = defPm.id;
    }

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
            error: "Customer has no saved card on file. Cannot charge off-session.",
            requiresPaymentMethod: true,
          },
          { status: 400 }
        );
      }

      paymentMethodId = paymentMethods.data[0].id;

      // Optional: set as default for next time (best effort)
      try {
        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      } catch {
        // ignore
      }
    }

    // -----------------------------
    // CREATE OFF-SESSION PAYMENT INTENT
    // -----------------------------
    const explicitIdem =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

    // If you provide listingId, we can make idempotency stable and safe.
    // If not, we still accept a caller-provided idempotencyKey.
    const idempotencyKey =
      explicitIdem || (listingId ? `camera_winner_${listingId}` : "");

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInPence,
        currency: "gbp",
        customer: customer.id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description,
        metadata: {
          type: "auction_winner_charge",
          listingId: listingId || "",
          winnerEmail,
          ...metadata,
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    // If it didn't succeed, treat it as a failure that the caller must handle.
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          ok: false,
          error: `Payment did not complete (status: ${paymentIntent.status}).`,
          requiresAction: paymentIntent.status === "requires_action",
          requiresPaymentMethod: paymentIntent.status === "requires_payment_method",
          paymentIntentId: paymentIntent.id,
          paymentIntentStatus: paymentIntent.status,
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amountCharged: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: customer.id,
        paymentMethodId,
        listingId: listingId || null,
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

    const requiresAction =
      code === "authentication_required" || code === "card_not_authenticated";

    const requiresPaymentMethod =
      code === "card_declined" ||
      code === "expired_card" ||
      code === "incorrect_cvc" ||
      code === "incorrect_number" ||
      false;

    const statusCode = requiresAction || requiresPaymentMethod ? 402 : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code,
        declineCode,
        requiresAction,
        requiresPaymentMethod,
      },
      { status: statusCode }
    );
  }
}