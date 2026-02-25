// app/api/stripe/charge-winner/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type ChargeWinnerBody = {
  // Optional but recommended
  listingId?: string;

  // ✅ Strongly recommended for transaction lifecycle hardening
  // If present, we use it for idempotency + metadata so the webhook can reconcile cleanly.
  transactionId?: string;

  // Required
  winnerEmail: string;
  amountInPence: number; // final amount to charge, in pence

  // Optional
  description?: string;
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

function isValidEmail(email: string) {
  // Simple sanity check (not perfect, but prevents obvious garbage)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
    const CHARGE_WINNER_SECRET = (process.env.CHARGE_WINNER_SECRET || "").trim();

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

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = (await req.json().catch(() => ({}))) as Partial<ChargeWinnerBody>;

    // ✅ Hard security gate
    const providedSecret = getSecretFromReq(req, body);
    if (!providedSecret || providedSecret !== CHARGE_WINNER_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
    const transactionId = typeof body.transactionId === "string" ? body.transactionId.trim() : "";
    const winnerEmail = typeof body.winnerEmail === "string" ? body.winnerEmail.trim() : "";
    const amountInPence = body.amountInPence;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!winnerEmail || !isValidEmail(winnerEmail)) {
      return NextResponse.json(
        { ok: false, error: "winnerEmail is required and must be a valid email." },
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

    // Optional: keep a reasonable cap to prevent accidental huge charges
    // (You can adjust/remove if you sell very high-value items.)
    const MAX_PENCE = 5_000_000; // £50,000
    if (amountInPence > MAX_PENCE) {
      return NextResponse.json(
        { ok: false, error: "amountInPence is unusually high; refusing charge." },
        { status: 400 }
      );
    }

    const metadata = coerceMetadata(body.metadata);

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : transactionId
          ? `AuctionMyCamera – winner charge (tx ${transactionId})`
          : listingId
            ? `AuctionMyCamera – winner charge for listing ${listingId}`
            : `AuctionMyCamera – winner charge`;

    // -----------------------------
    // FIND STRIPE CUSTOMER BY EMAIL
    // -----------------------------
    // NOTE: This works, but it’s not perfect if multiple customers exist for same email.
    // The proper long-term hardening is: store stripeCustomerId in Appwrite profile and pass it in.
    const customers = await stripe.customers.list({
      email: winnerEmail,
      limit: 10,
    });

    if (!customers.data.length) {
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

    if (customers.data.length > 1) {
      console.warn("[charge-winner] Multiple Stripe customers for email; using newest.", {
        winnerEmail,
        count: customers.data.length,
        customerIds: customers.data.map((c) => c.id),
      });
    }

    // Stripe returns newest-first in most cases, but we’ll still choose by `created` just in case.
    const customer = customers.data
      .slice()
      .sort((a, b) => (b.created || 0) - (a.created || 0))[0];

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
    else if (defPm && typeof defPm === "object" && typeof (defPm as any).id === "string") {
      paymentMethodId = (defPm as any).id;
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

      // Best-effort: set as default for next time
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

    // ✅ Idempotency preference order:
    // 1) explicit caller override
    // 2) transactionId (best)
    // 3) listingId (okay-ish fallback)
    const idempotencyKey =
      explicitIdem ||
      (transactionId ? `camera_winner_tx_${transactionId}` : listingId ? `camera_winner_${listingId}` : "");

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInPence,
        currency: "gbp",
        customer: customer.id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description,

        // ⚠️ Metadata is what your webhook will rely on later.
        // Keep it stable and strings-only.
        metadata: {
          purpose: "auction_winner_charge",
          listingId: listingId || "",
          transactionId: transactionId || "",
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
        transactionId: transactionId || null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[charge-winner] error:", err);

    const stripeError = err?.raw ?? err;

    const message =
      stripeError?.message || err?.message || "Failed to charge winner off-session.";

    const code = stripeError?.code;
    const declineCode = stripeError?.decline_code;

    // If Stripe gave us a PaymentIntent in the error, surface it for debugging
    const rawPi = stripeError?.payment_intent || stripeError?.raw?.payment_intent;
    const paymentIntentId =
      rawPi && typeof rawPi === "object" && typeof rawPi.id === "string" ? rawPi.id : undefined;
    const paymentIntentStatus =
      rawPi && typeof rawPi === "object" && typeof rawPi.status === "string" ? rawPi.status : undefined;

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
        paymentIntentId,
        paymentIntentStatus,
      },
      { status: statusCode }
    );
  }
}