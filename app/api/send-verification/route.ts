import { NextResponse } from "next/server";
import { Client, Account } from "node-appwrite";

export const runtime = "nodejs";

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function getSiteUrl() {
  // Prefer explicit site URL (you should set this in Vercel)
  const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");

  // Safe fallback for production if env is missing
  // (Change this only if your canonical domain is different)
  return fromEnv || "https://auctionmycamera.co.uk";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  const SITE_URL = getSiteUrl();

  if (!userId || !secret) {
    // Keep the user flow simple: redirect to verify page with an error
    return NextResponse.redirect(`${SITE_URL}/verify?status=error`);
  }

  try {
    const endpoint =
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "";

    const projectId =
      process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      "";

    if (!endpoint || !projectId) {
      console.error("[send-verification] Missing Appwrite endpoint/projectId.");
      return NextResponse.redirect(`${SITE_URL}/verify?status=error`);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId);

    const account = new Account(client);

    // ✅ Server SDK email verification confirmation
    await account.updateEmailVerification({ userId, secret });

    console.log("✅ Email verified for user:", userId);

    return NextResponse.redirect(`${SITE_URL}/verify?status=success`);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return NextResponse.redirect(`${SITE_URL}/verify?status=error`);
  }
}