// app/api/stripe/has-payment-method/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query, Account } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// STRIPE (lazy singleton)
// -----------------------------
function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let _stripe: Stripe | null = null;
function stripeClient() {
  if (_stripe) return _stripe;
  const key = requiredEnv("STRIPE_SECRET_KEY");
  _stripe = new Stripe(key);
  return _stripe;
}

// -----------------------------
// APPWRITE (profiles) - OPTIONAL
// -----------------------------
const APPWRITE_ENDPOINT =
  (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();

const APPWRITE_PROJECT =
  (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();

const APPWRITE_API_KEY = (process.env.APPWRITE_API_KEY || "").trim();

const PROFILES_DB_ID =
  (process.env.APPWRITE_PROFILES_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
    "").trim();

const PROFILES_COLLECTION_ID =
  (process.env.APPWRITE_PROFILES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
    "").trim();

function getAppwriteOrNull() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY || !PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
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
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }),
    };
  }

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Server missing Appwrite config." }, { status: 500 }),
    };
  }

  try {
    const c = new AppwriteClient().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT).setJWT(jwt);
    const acc = new Account(c);
    const user = await acc.get();
    return { ok: true as const, user };
  } catch (e) {
    console.warn("[has-payment-method] auth failed:", e);
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }),
    };
  }
}

async function safeSyncStripeCustomerId(databases: Databases, profileId: string, stripeCustomerId: string) {
  try {
    await databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profileId, {
      stripe_customer_id: stripeCustomerId,
    });
    return true;
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (/Unknown attribute:\s*stripe_customer_id/i.test(msg)) {
      console.warn("[has-payment-method] profile schema missing stripe_customer_id; skipping sync.");
      return false;
    }
    console.warn("[has-payment-method] failed to sync customer id:", e);
    return false;
  }
}

// -----------------------------
// POST /api/stripe/has-payment-method
// -----------------------------
export async function POST(req: Request) {
  try {
    const stripe = stripeClient();

    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const userEmail = String((auth.user as any)?.email || "").trim();
    if (!userEmail) {
      return NextResponse.json(
        { ok: false, error: "Could not determine user email.", hasPaymentMethod: false },
        { status: 401 }
      );
    }

    // Optional profile lookup (cached stripe_customer_id)
    const aw = getAppwriteOrNull();
    let profile: any = null;
    let stripeCustomerId: string | null = null;

    if (aw) {
      try {
        const profRes = await aw.databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
          Query.equal("email", userEmail),
          Query.limit(1),
        ]);
        profile = (profRes.documents[0] as any) || null;
        stripeCustomerId = (profile?.stripe_customer_id as string | undefined) || null;
      } catch (e) {
        console.warn("[has-payment-method] profile lookup skipped:", e);
      }
    }

    async function hasUsableCard(customerId: string) {
      // Fast path: if default payment method is set, we treat as usable
      try {
        const c = await stripe.customers.retrieve(customerId);
        if (!("deleted" in c)) {
          const defPm = c.invoice_settings?.default_payment_method as
            | string
            | { id: string }
            | null
            | undefined;

          if (typeof defPm === "string" && defPm) return true;
          if (defPm && typeof defPm === "object" && typeof (defPm as any).id === "string") return true;
        }
      } catch {
        // ignore and fall back to listing cards
      }

      const pmList = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      return pmList.data.length > 0;
    }

    let customerIdUsed: string | null = null;
    let hasPaymentMethod = false;

    // 1) Try cached customer id first
    if (stripeCustomerId) {
      try {
        hasPaymentMethod = await hasUsableCard(stripeCustomerId);
        if (hasPaymentMethod) customerIdUsed = stripeCustomerId;
      } catch (e) {
        console.warn("[has-payment-method] stored customer check failed:", stripeCustomerId, e);
      }
    }

    // 2) Fallback: search customers by email
    if (!hasPaymentMethod) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 10 });

      for (const c of customers.data) {
        try {
          const ok = await hasUsableCard(c.id);
          if (ok) {
            hasPaymentMethod = true;
            customerIdUsed = c.id;

            // Sync into profile if possible (schema-tolerant)
            if (aw && profile?.$id && profile.stripe_customer_id !== c.id) {
              await safeSyncStripeCustomerId(aw.databases, profile.$id, c.id);
            }
            break;
          }
        } catch (e) {
          console.warn("[has-payment-method] customer card check failed:", c.id, e);
        }
      }
    }

    return NextResponse.json({ ok: true, hasPaymentMethod, customerId: customerIdUsed }, { status: 200 });
  } catch (err: any) {
    // Keep env failures explicit
    if (String(err?.message || "").includes("STRIPE_SECRET_KEY is not set")) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server.", hasPaymentMethod: false },
        { status: 500 }
      );
    }

    console.error("[has-payment-method] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not verify payment method.", hasPaymentMethod: false },
      { status: 500 }
    );
  }
}