// app/api/stripe/list-payment-methods/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query, Account } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// STRIPE
// -----------------------------
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
if (!STRIPE_SECRET_KEY) {
  console.warn("[list-payment-methods] STRIPE_SECRET_KEY is not set.");
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// -----------------------------
// APPWRITE (auth + optional profile cache)
// -----------------------------
function normalizeAppwriteEndpoint(raw: string) {
  const x = (raw || "").trim().replace(/\/+$/, "");
  if (!x) return "";
  if (x.endsWith("/v1")) return x;
  return `${x}/v1`;
}

// ✅ Server-first (server route), public fallback
const APPWRITE_ENDPOINT = normalizeAppwriteEndpoint(
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ""
);

const APPWRITE_PROJECT = (
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ""
).trim();

const APPWRITE_API_KEY = (process.env.APPWRITE_API_KEY || "").trim();

// Optional profile cache
const PROFILES_DB_ID =
  (process.env.APPWRITE_PROFILES_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
    "").trim();

const PROFILES_COLLECTION_ID =
  (process.env.APPWRITE_PROFILES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
    "").trim();

function getBearerJwt(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireAuthedUser(req: Request) {
  const jwt = getBearerJwt(req);
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
    const c = new AppwriteClient()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT)
      .setJWT(jwt);

    const account = new Account(c);
    const user = await account.get();
    return { ok: true as const, user };
  } catch (e) {
    console.warn("[list-payment-methods] auth failed:", e);
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }),
    };
  }
}

function getProfilesDbOrNull() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY) return null;
  if (!PROFILES_DB_ID || !PROFILES_COLLECTION_ID) return null;

  const client = new AppwriteClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  return { databases: new Databases(client) };
}

async function findProfileByEmail(databases: Databases, email: string) {
  const res = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
    Query.equal("email", email),
    Query.limit(1),
  ]);
  return (res.documents[0] as any) || null;
}

// -----------------------------
// POST /api/stripe/list-payment-methods
// Auth: Authorization: Bearer <Appwrite JWT>
// Returns: { ok, paymentMethods: [{id,brand,last4,exp_month,exp_year,isDefault}] }
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const userEmail = (auth.user as any)?.email as string | undefined;
    if (!userEmail) {
      return NextResponse.json({ ok: false, error: "Could not determine user email." }, { status: 401 });
    }

    // Optional profile lookup (cached stripe_customer_id)
    const aw = getProfilesDbOrNull();
    let profile: any = null;
    let stripeCustomerId: string | null = null;

    if (aw) {
      try {
        profile = await findProfileByEmail(aw.databases, userEmail);
        stripeCustomerId = (profile?.stripe_customer_id as string | undefined) || null;
      } catch (e) {
        console.warn("[list-payment-methods] profile lookup skipped:", e);
      }
    }

    // Resolve customerId: profile first, else Stripe lookup by email
    let customerIdUsed: string | null = stripeCustomerId;

    if (!customerIdUsed) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 10 });
      customerIdUsed = customers.data[0]?.id || null;

      // Sync into profile if possible
      if (customerIdUsed && aw && profile?.$id && profile.stripe_customer_id !== customerIdUsed) {
        try {
          await aw.databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
            stripe_customer_id: customerIdUsed,
          });
        } catch (syncErr) {
          console.warn("[list-payment-methods] failed to sync customer id:", syncErr);
        }
      }
    }

    if (!customerIdUsed) {
      return NextResponse.json({ ok: true, paymentMethods: [] }, { status: 200 });
    }

    // Default payment method (if set)
    const customer = await stripe.customers.retrieve(customerIdUsed);
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
      customer: customerIdUsed,
      type: "card",
    });

    const paymentMethods = pmList.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? null,
      last4: pm.card?.last4 ?? null,
      exp_month: pm.card?.exp_month ?? null,
      exp_year: pm.card?.exp_year ?? null,
      isDefault: defaultPmId ? pm.id === defaultPmId : false,
    }));

    return NextResponse.json({ ok: true, paymentMethods }, { status: 200 });
  } catch (err: any) {
    console.error("[list-payment-methods] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to list payment methods." },
      { status: 500 }
    );
  }
}