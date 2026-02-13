// app/api/stripe/create-setup-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  Client as AppwriteClient,
  Account,
  Databases,
  Query,
} from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// Stripe
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
if (!stripeSecretKey) {
  console.warn(
    "[create-setup-intent] STRIPE_SECRET_KEY is not set. This route will fail."
  );
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-11-17.clover" as any })
  : null;

// -----------------------------
// Appwrite (auth + optional profile cache)
// -----------------------------
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";
const APPWRITE_PROJECT =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

// Optional profile cache
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

async function getAuthedUser(jwt: string): Promise<{ email: string; userId: string; name?: string }> {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    throw new Error("Appwrite env missing (APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID).");
  }

  const c = new AppwriteClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setJWT(jwt);

  const account = new Account(c);
  const me = await account.get();

  const email = (me as any)?.email as string | undefined;
  const userId = (me as any)?.$id as string | undefined;
  const name = (me as any)?.name as string | undefined;

  if (!email || !userId) throw new Error("Invalid session.");
  return { email, userId, name };
}

function getProfilesDbOrNull() {
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

async function findProfileByEmail(databases: Databases, email: string) {
  const res = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
    Query.equal("email", email),
    Query.limit(1),
  ]);
  return (res.documents[0] as any) || null;
}

// -----------------------------
// POST /api/stripe/create-setup-intent
// Auth: Authorization: Bearer <Appwrite JWT>
// Returns: { clientSecret: string }
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    // ✅ AUTH REQUIRED
    const jwt = getBearerJwt(req);
    if (!jwt) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { email, userId } = await getAuthedUser(jwt);

    // We deliberately IGNORE any posted email/userId to prevent abuse
    const body = await req.json().catch(() => ({} as any));
    const postedEmail = (body?.userEmail || body?.email || "") as string;
    if (postedEmail && postedEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      console.warn("[create-setup-intent] posted email mismatch (ignored):", {
        postedEmail,
        authedEmail: email,
      });
    }

    // 1) Prefer profile stripe_customer_id (optional)
    const aw = getProfilesDbOrNull();
    let profile: any | null = null;
    let stripeCustomerId: string | null = null;

    if (aw) {
      try {
        profile = await findProfileByEmail(aw.databases, email);
        stripeCustomerId = profile?.stripe_customer_id || null;
      } catch (e) {
        console.warn("[create-setup-intent] profiles lookup skipped:", e);
      }
    }

    // 2) Validate stored customer id (if any)
    let customer: Stripe.Customer | null = null;

    if (stripeCustomerId) {
      try {
        const c = await stripe.customers.retrieve(stripeCustomerId);
        if (!("deleted" in c)) customer = c as Stripe.Customer;
      } catch (e) {
        console.warn("[create-setup-intent] stored customer invalid, re-finding:", e);
        customer = null;
        stripeCustomerId = null;
      }
    }

    // 3) Find/create Stripe customer by *authenticated* email
    if (!customer) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customer = existing.data[0] || null;

      if (!customer) {
        customer = await stripe.customers.create({
          email,
          metadata: { appwriteUserId: userId },
        });
      }

      stripeCustomerId = customer.id;
    }

    // 4) Sync customer id back to profile (optional)
    if (aw && profile?.$id && stripeCustomerId && profile.stripe_customer_id !== stripeCustomerId) {
      try {
        await aw.databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
          stripe_customer_id: stripeCustomerId,
        });
      } catch (e) {
        console.warn("[create-setup-intent] could not sync stripe_customer_id:", e);
      }
    }

    // 5) Create SetupIntent (save card)
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId!,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        purpose: "setup_card",
        email,
        appwriteUserId: userId,
      },
    });

    if (!setupIntent.client_secret) {
      console.error("[create-setup-intent] no client_secret on SetupIntent", setupIntent.id);
      return NextResponse.json(
        { error: "Failed to create setup intent (no client secret)." },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: setupIntent.client_secret }, { status: 200 });
  } catch (err: any) {
    console.error("[create-setup-intent] error:", err);
    const status = /Not authenticated|Invalid session/i.test(err?.message || "") ? 401 : 500;
    return NextResponse.json(
      { error: err?.message || "Failed to create setup intent." },
      { status }
    );
  }
}
