// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

// -----------------------------
// Stripe client (lazy singleton)
// -----------------------------
let _stripe: Stripe | null = null;
function stripeClient() {
  if (_stripe) return _stripe;
  const key = requiredEnv("STRIPE_SECRET_KEY");
  _stripe = new Stripe(key);
  return _stripe;
}

// -----------------------------
// Appwrite (server-side) helpers
// -----------------------------
function getAppwriteDatabases() {
  const endpoint =
    (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
  const projectId =
    (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
  const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

  if (!endpoint || !projectId || !apiKey) return null;

  const client = new AppwriteClient().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// Transactions DB/collection (same pattern as your other routes)
const TX_DB_ID =
  (process.env.APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    "").trim();

const TX_COLLECTION_ID =
  (process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
    "transactions").trim();

async function findTransactionById(databases: Databases, transactionId: string) {
  try {
    const tx = await databases.getDocument(TX_DB_ID, TX_COLLECTION_ID, transactionId);
    return tx as any;
  } catch (e) {
    return null;
  }
}

async function findTransactionByPaymentIntentId(databases: Databases, paymentIntentId: string) {
  try {
    const res = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
      Query.equal("stripe_payment_intent_id", paymentIntentId),
      Query.limit(1),
    ]);
    return (res.documents?.[0] as any) || null;
  } catch (e) {
    return null;
  }
}

function isAlreadyPaid(tx: any) {
  const ps = String(tx?.payment_status || "").toLowerCase();
  return ps === "paid";
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  // -----------------------------
  // 1) Verify signature
  // -----------------------------
  try {
    const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");
    const stripe = stripeClient();

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe-signature header." },
        { status: 400 }
      );
    }

    // IMPORTANT: raw body is required for signature verification
    const rawBody = await req.text();

    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  // -----------------------------
  // 2) Handle event
  // -----------------------------
  try {
    const stripe = stripeClient();

    console.log("[stripe/webhook] received", {
      id: event.id,
      type: event.type,
      livemode: (event as any).livemode,
      created: event.created,
    });

    switch (event.type) {
      // ✅ Saved card defaulting
      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;

        const customerId =
          typeof si.customer === "string"
            ? si.customer
            : (si.customer as Stripe.Customer | null)?.id || null;

        const paymentMethodId =
          typeof si.payment_method === "string"
            ? si.payment_method
            : (si.payment_method as Stripe.PaymentMethod | null)?.id || null;

        if (!customerId || !paymentMethodId) {
          console.warn("[stripe/webhook] setup_intent.succeeded missing customer/payment_method", {
            setupIntentId: si.id,
            customerId,
            paymentMethodId,
          });
          break;
        }

        try {
          await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }).catch(() => {
            // often "already attached"
          });

          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
          });

          console.log("[stripe/webhook] default payment method set", {
            customerId,
            paymentMethodId,
            setupIntentId: si.id,
          });
        } catch (e: any) {
          console.warn("[stripe/webhook] failed to set default payment method", {
            setupIntentId: si.id,
            customerId,
            paymentMethodId,
            error: e?.message || String(e),
          });
        }

        break;
      }

      // ✅ Transaction lifecycle: mark paid
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;

        console.log("[stripe/webhook] payment_intent.succeeded", {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          customer:
            typeof pi.customer === "string"
              ? pi.customer
              : (pi.customer as Stripe.Customer | null)?.id || null,
          metadata: pi.metadata || {},
        });

        const databases = getAppwriteDatabases();
        if (!databases || !TX_DB_ID || !TX_COLLECTION_ID) {
          // If you can’t update your DB, it’s better to let Stripe retry.
          console.error("[stripe/webhook] Appwrite not configured; cannot persist paid status.");
          return NextResponse.json(
            { ok: false, error: "Appwrite not configured to persist payment status." },
            { status: 500 }
          );
        }

        const meta = pi.metadata || {};
        const transactionId =
          safeStr((meta as any).transactionId).trim() ||
          safeStr((meta as any).transaction_id).trim();

        let tx: any = null;

        // Prefer transactionId (best)
        if (transactionId) {
          tx = await findTransactionById(databases, transactionId);
        }

        // Fallback: locate by PI id (works for routes that stored stripe_payment_intent_id)
        if (!tx) {
          tx = await findTransactionByPaymentIntentId(databases, pi.id);
        }

        if (!tx) {
          // Not necessarily fatal (some intents may be for other purposes), so just log.
          console.warn("[stripe/webhook] No transaction found to mark paid for PI", {
            paymentIntentId: pi.id,
            transactionId: transactionId || null,
          });
          break;
        }

        // Idempotent: if already paid, do nothing
        if (isAlreadyPaid(tx)) {
          console.log("[stripe/webhook] Transaction already paid; skipping", { txId: tx.$id, pi: pi.id });
          break;
        }

        // Minimal safe update first (avoid schema mismatches)
        try {
          await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, tx.$id, {
            payment_status: "paid",
            stripe_payment_intent_id: pi.id,
          });
        } catch (e) {
          console.error("[stripe/webhook] FAILED to update transaction as paid", {
            txId: tx.$id,
            paymentIntentId: pi.id,
            error: (e as any)?.message || String(e),
          });

          // Critical: return 500 so Stripe retries.
          return NextResponse.json(
            { ok: false, error: "Failed to persist paid status." },
            { status: 500 }
          );
        }

        // Optional extra info (best-effort only)
        try {
          await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, tx.$id, {
            stripe_currency: pi.currency,
            stripe_amount_charged: pi.amount ? pi.amount / 100 : undefined,
          });
        } catch {
          // ignore schema mismatch
        }

        console.log("[stripe/webhook] Marked transaction as paid", { txId: tx.$id, paymentIntentId: pi.id });
        break;
      }

      // ✅ Transaction lifecycle: mark failed (best-effort, no Stripe retry needed)
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;

        console.warn("[stripe/webhook] payment_intent.payment_failed", {
          paymentIntentId: pi.id,
          lastPaymentError: (pi.last_payment_error as any)?.message || null,
          metadata: pi.metadata || {},
        });

        const databases = getAppwriteDatabases();
        if (!databases || !TX_DB_ID || !TX_COLLECTION_ID) break;

        const meta = pi.metadata || {};
        const transactionId =
          safeStr((meta as any).transactionId).trim() ||
          safeStr((meta as any).transaction_id).trim();

        let tx: any = null;
        if (transactionId) tx = await findTransactionById(databases, transactionId);
        if (!tx) tx = await findTransactionByPaymentIntentId(databases, pi.id);

        if (!tx) break;

        // If already paid, do not downgrade it
        if (isAlreadyPaid(tx)) break;

        const msg = (pi.last_payment_error as any)?.message || "Payment failed.";

        try {
          await databases.updateDocument(TX_DB_ID, TX_COLLECTION_ID, tx.$id, {
            payment_status: "failed",
            payment_error: msg,
            stripe_payment_intent_id: pi.id,
          });
        } catch {
          // ignore schema mismatch
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[stripe/webhook] Handler error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Webhook handler failed." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}