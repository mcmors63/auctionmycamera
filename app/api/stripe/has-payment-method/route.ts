// app/api/stripe/has-payment-method/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  Client as AppwriteClient,
  Databases,
  Query,
  Account,
} from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// STRIPE
// -----------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!STRIPE_SECRET_KEY) {
  console.warn("[has-payment-method] STRIPE_SECRET_KEY is not set.");
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// -----------------------------
// APPWRITE (profiles) - OPTIONAL
// -----------------------------
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const APPWRITE_PROJECT =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";
const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

function getAppwriteOrNull() {
  if (
    !APPWRITE_ENDPOINT ||
    !APPWRITE_PROJECT ||
    !APPWRITE_API_KEY ||
    !PROFILES_DB_ID ||
    !PROFILES_COLLECTION_ID
  ) {
    return null;
  }

  const client = new AppwriteClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  return { databases: new Databases(client) };
}

function getBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUser(req: Request) {
  const jwt = getBearer(req);
  if (!jwt) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Server missing Appwrite config." }, { status: 500 }),
    };
  }

  try {
    const c = new AppwriteClient()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT)
      .setJWT(jwt);

    const acc = new Account(c);
    const user = await acc.get();
    return { ok: true as const, user };
  } catch (e) {
    console.warn("[has-payment-method] auth failed:", e);
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };
  }
}

// -----------------------------
// POST /api/stripe/has-payment-method
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured on the server.",
          hasPaymentMethod: false,
        },
        { status: 500 }
      );
    }

    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const userEmail = (auth.user as any)?.email as string | undefined;
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: "Could not determine user email.", hasPaymentMethod: false },
        { status: 401 }
      );
    }

    const stripeClient = stripe;

    // Optional profile lookup (for cached stripe_customer_id)
    const aw = getAppwriteOrNull();
    let profile: any = null;
    let stripeCustomerId: string | null = null;

    if (aw) {
      try {
        const profRes = await aw.databases.listDocuments(
          PROFILES_DB_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal("email", userEmail)]
        );
        profile = (profRes.documents[0] as any) || null;
        stripeCustomerId = profile?.stripe_customer_id || null;
      } catch (e) {
        console.warn("[has-payment-method] profile lookup skipped:", e);
      }
    }

    async function hasCard(customerId: string) {
      const pmList = await stripeClient.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      return pmList.data.length > 0;
    }

    let customerIdUsed: string | null = null;
    let hasPaymentMethod = false;

    // 1) If profile has stored customer ID, try that first
    if (stripeCustomerId) {
      try {
        hasPaymentMethod = await hasCard(stripeCustomerId);
        if (hasPaymentMethod) customerIdUsed = stripeCustomerId;
      } catch (e) {
        console.warn("[has-payment-method] stored customer check failed:", stripeCustomerId, e);
      }
    }

    // 2) Fallback: search Stripe customers by email
    if (!hasPaymentMethod) {
      const customers = await stripeClient.customers.list({
        email: userEmail,
        limit: 10,
      });

      for (const c of customers.data) {
        try {
          const ok = await hasCard(c.id);
          if (ok) {
            hasPaymentMethod = true;
            customerIdUsed = c.id;

            // Sync into profile if possible
            if (aw && profile?.$id && profile.stripe_customer_id !== c.id) {
              try {
                await aw.databases.updateDocument(
                  PROFILES_DB_ID,
                  PROFILES_COLLECTION_ID,
                  profile.$id,
                  { stripe_customer_id: c.id }
                );
              } catch (syncErr) {
                console.warn("[has-payment-method] failed to sync customer id:", syncErr);
              }
            }
            break;
          }
        } catch (e) {
          console.warn("[has-payment-method] customer card check failed:", c.id, e);
        }
      }
    }

    return NextResponse.json(
      { ok: true, hasPaymentMethod, customerId: customerIdUsed },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[has-payment-method] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Could not verify payment method.",
        hasPaymentMethod: false,
      },
      { status: 500 }
    );
  }
}
