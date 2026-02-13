import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Databases, Query, Account } from "node-appwrite";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
if (!stripeSecretKey) console.warn("[list-payment-methods] STRIPE_SECRET_KEY is not set.");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Appwrite (for auth + optional profile cache)
const appwriteEndpoint =
  (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(/\/+$/, "");
const appwriteProject =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const appwriteApiKey = process.env.APPWRITE_API_KEY || "";

const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";
const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

function getBearerJwt(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function requireUser(req: Request) {
  const jwt = getBearerJwt(req);
  if (!jwt || !appwriteEndpoint || !appwriteProject) return null;

  const client = new AppwriteClient().setEndpoint(appwriteEndpoint).setProject(appwriteProject).setJWT(jwt);
  const account = new Account(client);

  try {
    return await account.get();
  } catch {
    return null;
  }
}

function getAppwriteOrNull() {
  if (!appwriteEndpoint || !appwriteProject || !appwriteApiKey || !PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
    return null;
  }

  const client = new AppwriteClient().setEndpoint(appwriteEndpoint).setProject(appwriteProject).setKey(appwriteApiKey);
  return { databases: new Databases(client) };
}

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ ok: false, error: "Stripe is not configured on the server." }, { status: 500 });
    }

    // ✅ AUTH REQUIRED
    const user = await requireUser(req);
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const userEmail = user.email;

    // Optional profile lookup (cached stripe_customer_id)
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

    if (!customerIdUsed) return NextResponse.json({ ok: true, paymentMethods: [] });

    // Default payment method (if set)
    const customer = await stripe.customers.retrieve(customerIdUsed);
    let defaultPmId: string | null = null;

    if (!("deleted" in customer)) {
      const defPm = customer.invoice_settings?.default_payment_method as string | { id: string } | null | undefined;
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

    return NextResponse.json({ ok: true, paymentMethods });
  } catch (err: any) {
    console.error("[list-payment-methods] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to list payment methods." },
      { status: 500 }
    );
  }
}
