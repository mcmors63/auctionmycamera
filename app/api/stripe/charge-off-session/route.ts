// app/api/stripe/charge-off-session/route.ts
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
// Stripe setup
// -----------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecret) {
  console.warn(
    "STRIPE_SECRET_KEY is not set. /api/stripe/charge-off-session will return an error."
  );
}

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// -----------------------------
// Appwrite (profiles)
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

// IMPORTANT: do NOT use non-null assertions here (can crash at import time)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";

const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

function getAppwrite() {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY) {
    throw new Error(
      "Appwrite env vars missing (APPWRITE_ENDPOINT / PROJECT_ID / API_KEY)."
    );
  }
  if (!PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
    throw new Error(
      "Profiles DB/collection env vars missing (APPWRITE_PROFILES_DATABASE_ID / APPWRITE_PROFILES_COLLECTION_ID)."
    );
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
      res: NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      ),
    };
  }

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { ok: false, error: "Server missing Appwrite config." },
        { status: 500 }
      ),
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
    console.warn("[charge-off-session] auth failed:", e);
    return {
      ok: false as const,
      res: NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      ),
    };
  }
}

// -----------------------------
// Helpers
// -----------------------------
function asPositiveInt(n: any): number | null {
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return null;
  const int = Math.round(num);
  if (int <= 0) return null;
  return int;
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

async function findProfileByEmail(databases: Databases, email: string) {
  const res = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
    Query.equal("email", email),
  ]);
  return (res.documents[0] as any) || null;
}

async function getOrCreateCustomerId(email: string, appwriteUserId?: string) {
  // 1) Try profile customer id first
  let profile: any | null = null;
  let databases: Databases | null = null;

  try {
    ({ databases } = getAppwrite());
    profile = await findProfileByEmail(databases, email);
    const existingId = profile?.stripe_customer_id || null;
    if (existingId) {
      try {
        const c = await stripe!.customers.retrieve(existingId);
        if (!("deleted" in c)) return { customerId: existingId, profile, databases };
      } catch {
        // fall through
      }
    }
  } catch (e) {
    console.warn("[charge-off-session] profiles lookup skipped:", e);
  }

  // 2) Find Stripe customer by email (limit 1)
  const existing = await stripe!.customers.list({ email, limit: 1 });
  let customer = existing.data[0] || null;

  // 3) Create if missing
  if (!customer) {
    customer = await stripe!.customers.create({
      email,
      metadata: appwriteUserId ? { appwriteUserId } : undefined,
    });
  }

  // 4) Sync back to profile if possible
  if (profile?.$id && databases && profile.stripe_customer_id !== customer.id) {
    try {
      await databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
        stripe_customer_id: customer.id,
      });
    } catch (e) {
      console.warn("[charge-off-session] could not sync stripe_customer_id:", e);
    }
  }

  return { customerId: customer.id, profile, databases };
}

async function pickPaymentMethod(customerId: string) {
  const customer = await stripe!.customers.retrieve(customerId);

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

  if (defaultPmId) {
    try {
      const pm = await stripe!.paymentMethods.retrieve(defaultPmId);
      if (pm && (pm as any).customer === customerId && (pm as any).type === "card") {
        return { paymentMethodId: pm.id, usedDefault: true };
      }
    } catch {
      // ignore
    }
  }

  const pmList = await stripe!.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 10,
  });

  const pm = pmList.data[0] || null;
  if (!pm) return { paymentMethodId: null as any, usedDefault: false };

  try {
    await stripe!.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id },
    });
  } catch {
    // ignore
  }

  return { paymentMethodId: pm.id, usedDefault: false };
}

function readIdempotencyKey(req: Request, body: any): string | undefined {
  const headerKey = (req.headers.get("idempotency-key") || "").trim();
  if (headerKey) return headerKey;

  const bodyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (bodyKey) return bodyKey;

  return undefined;
}

// -----------------------------
// POST /api/stripe/charge-off-session
// Body: { amountInPence, description?, metadata?, idempotencyKey? }
// Identity comes from Appwrite JWT header.
// -----------------------------
export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe is not configured on the server.",
          requiresPaymentMethod: true,
        },
        { status: 500 }
      );
    }

    const auth = await requireAuthedUser(req);
    if (!auth.ok) return auth.res;

    const userEmail = (auth.user as any)?.email as string | undefined;
    const userId = (auth.user as any)?.$id as string | undefined;

    if (!userEmail || !userId) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const amountInPence = asPositiveInt(body?.amountInPence);
    const description = (body?.description || "") as string;
    const metadata = coerceMetadata(body?.metadata);
    const idempotencyKey = readIdempotencyKey(req, body);

    if (!amountInPence) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid amountInPence." },
        { status: 400 }
      );
    }

    // 1) Get correct customer id
    const { customerId } = await getOrCreateCustomerId(userEmail, userId);

    // 2) Pick default (or first) saved card
    const { paymentMethodId } = await pickPaymentMethod(customerId);

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No saved card found for this customer.",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    // 3) Create an off-session PaymentIntent and confirm it
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountInPence,
        currency: "gbp",
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: description || undefined,
        metadata,
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    // ✅ Only treat SUCCEEDED as paid
    if (intent.status !== "succeeded") {
      return NextResponse.json(
        {
          ok: false,
          error: `Payment did not complete (status: ${intent.status}).`,
          requiresAction: intent.status === "requires_action",
          requiresPaymentMethod: intent.status === "requires_payment_method",
          paymentIntentId: intent.id,
          paymentIntentStatus: intent.status,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      paymentIntentId: intent.id,
      status: intent.status,
      customerId,
      paymentMethodId,
    });
  } catch (err: any) {
    console.error("[charge-off-session] error:", err);

    const anyErr = err as any;

    // Stripe error details
    const stripeCode = anyErr?.code as string | undefined;
    const stripeDeclineCode = anyErr?.decline_code as string | undefined;

    // Sometimes Stripe nests a PaymentIntent on the raw error
    const rawPi = anyErr?.raw?.payment_intent;
    const piId = rawPi?.id as string | undefined;
    const piStatus = rawPi?.status as string | undefined;

    // Stripe common outcomes for off-session:
    // - authentication_required => needs on-session confirmation (3DS)
    // - card_declined / expired_card / incorrect_* => needs new payment method
    const requiresAction =
      stripeCode === "authentication_required" ||
      stripeCode === "card_not_authenticated";

    const requiresPaymentMethod =
      stripeCode === "card_declined" ||
      stripeCode === "expired_card" ||
      stripeCode === "incorrect_cvc" ||
      stripeCode === "incorrect_number" ||
      stripeCode === "incorrect_zip" ||
      stripeDeclineCode === "do_not_honor" ||
      stripeDeclineCode === "insufficient_funds" ||
      false;

    return NextResponse.json(
      {
        ok: false,
        error: anyErr?.message || "Stripe charge failed.",
        requiresPaymentMethod,
        requiresAction,
        paymentIntentId: piId,
        paymentIntentStatus: piStatus,
      },
      { status: 400 }
    );
  }
}