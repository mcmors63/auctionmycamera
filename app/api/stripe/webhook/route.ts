// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    // Fail fast with clear logs
    requiredEnv("STRIPE_SECRET_KEY");
    requiredEnv("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe-signature header." },
        { status: 400 }
      );
    }

    // IMPORTANT: read raw body for signature verification
    const rawBody = await req.text();

    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    switch (event.type) {
      // ✅ This is the key for your “saved card” reliability
      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;

        const customerId =
          typeof si.customer === "string"
            ? si.customer
            : (si.customer as Stripe.Customer | null)?.id;

        const paymentMethodId =
          typeof si.payment_method === "string"
            ? si.payment_method
            : (si.payment_method as Stripe.PaymentMethod | null)?.id;

        if (customerId && paymentMethodId) {
          try {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
            console.log("[stripe/webhook] Set default payment method:", {
              customerId,
              paymentMethodId,
              setupIntentId: si.id,
            });
          } catch (e) {
            console.warn("[stripe/webhook] Failed to set default payment method:", e);
          }
        } else {
          console.warn("[stripe/webhook] setup_intent.succeeded missing customer/payment_method", {
            setupIntentId: si.id,
            customerId,
            paymentMethodId,
          });
        }

        break;
      }

      // Optional: useful to log successful charges
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("[stripe/webhook] payment_intent.succeeded", {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          customer:
            typeof pi.customer === "string"
              ? pi.customer
              : (pi.customer as Stripe.Customer | null)?.id,
          metadata: pi.metadata,
        });
        break;
      }

      default:
        // Ignore other event types for now
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Webhook handler failed." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}