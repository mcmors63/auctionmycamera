// app/api/stripe/setup-card/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client as AppwriteClient, Account } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Env helpers
// -----------------------------
function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function normalizeBaseUrl(raw: string) {
  const x = (raw || "").trim().replace(/\/+$/, "");
  return x;
}

// Prefer public site url, fallback to prod domain
const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk");

// -----------------------------
// Stripe (singleton)
// -----------------------------
let _stripe: Stripe | null = null;
function stripeClient() {
  if (_stripe) return _stripe;
  const key = requiredEnv("STRIPE_SECRET_KEY");
  _stripe = new Stripe(key);
  return _stripe;
}

// -----------------------------
// Appwrite auth (via Bearer JWT)
// -----------------------------
function normalizeEndpoint(raw: string) {
  const x = (raw || "").trim().replace(/\/+$/, "");
  if (!x) return "";
  return x.endsWith("/v1") ? x : `${x}/v1`;
}

const APPWRITE_ENDPOINT = normalizeEndpoint(
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ""
);

const APPWRITE_PROJECT = (
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ""
).trim();

function getBearerJwt(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

async function getAuthedUser(jwt: string): Promise<{ email: string; userId: string; name?: string }> {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    throw new Error("Appwrite env missing (APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID).");
  }

  const c = new AppwriteClient().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT).setJWT(jwt);
  const account = new Account(c);

  const me = await account.get();
  const email = (me as any)?.email as string | undefined;
  const userId = (me as any)?.$id as string | undefined;
  const name = (me as any)?.name as string | undefined;

  if (!email || !userId) throw new Error("Invalid session.");
  return { email, userId, name };
}

function formatStripeError(err: any) {
  const type = err?.type || err?.raw?.type;
  const code = err?.code || err?.raw?.code;
  const param = err?.param || err?.raw?.param;
  const requestId = err?.requestId || err?.raw?.requestId;
  const statusCode = err?.statusCode || err?.raw?.statusCode;

  const bits = [
    type ? `type=${type}` : "",
    code ? `code=${code}` : "",
    param ? `param=${param}` : "",
    requestId ? `requestId=${requestId}` : "",
    statusCode ? `status=${statusCode}` : "",
  ].filter(Boolean);

  const suffix = bits.length ? ` (${bits.join(", ")})` : "";
  return `${String(err?.message || "Stripe error")}${suffix}`;
}

// -----------------------------
// POST /api/stripe/setup-card
// Returns: { url: string }
// -----------------------------
export async function POST(req: Request) {
  try {
    const stripe = stripeClient();

    const jwt = getBearerJwt(req);
    if (!jwt) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { email, userId } = await getAuthedUser(jwt);

    // Optional: allow the UI to pass ?next=/place_bid?id=... but don't trust posted URLs blindly.
    const body = await req.json().catch(() => ({} as any));
    const next = typeof body?.next === "string" ? body.next.trim() : "";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/payment-method?updated=1";

    const returnUrl = `${SITE_URL}${safeNext}`;

    // Find or create customer by email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ||
      (await stripe.customers.create({
        email,
        metadata: { appwriteUserId: userId },
      }));

    // Stripe-hosted setup flow (saves card for off-session use)
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["card"], // explicit, avoids Stripe defaults changing
      success_url: returnUrl,
      cancel_url: returnUrl,
      metadata: {
        purpose: "setup_card",
        email,
        userId,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a session URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    // If it's Stripe, make it obvious
    const msg =
      err && (err.type || err.raw)
        ? formatStripeError(err)
        : String(err?.message || "Failed to open setup flow.");

    console.error("[setup-card] error:", {
      message: err?.message,
      type: err?.type || err?.raw?.type,
      code: err?.code || err?.raw?.code,
      param: err?.param || err?.raw?.param,
      requestId: err?.requestId || err?.raw?.requestId,
      statusCode: err?.statusCode || err?.raw?.statusCode,
    });

    if (String(err?.message || "").includes("STRIPE_SECRET_KEY is not set")) {
      return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 500 });
    }

    const status = /Not authenticated|Invalid session/i.test(err?.message || "") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}