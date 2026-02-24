// app/api/verify/route.ts
import { NextResponse } from "next/server";
import { Client, Account } from "node-appwrite";

export const runtime = "nodejs";

function normalizeBaseUrl(input: string) {
  return (input || "").trim().replace(/\/+$/, "");
}

function getSiteUrl() {
  // Prefer explicit canonical site URL
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
  if (explicit) return explicit;

  // Fall back to Vercel URL if present
  const vercel = process.env.VERCEL_URL ? normalizeBaseUrl(`https://${process.env.VERCEL_URL}`) : "";
  if (vercel) return vercel;

  // Last resort: empty string (we’ll use request origin)
  return "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  const siteUrl = getSiteUrl();
  const requestOrigin = new URL(request.url).origin;
  const base = siteUrl || requestOrigin;

  // ✅ Your UI page is /verified (not /verify)
  const okRedirect = `${base}/verified?status=success`;
  const badRedirect = `${base}/verified?status=error`;

  if (!userId || !secret) {
    console.error("[verify] Missing verification parameters");
    return NextResponse.redirect(badRedirect);
  }

  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
    const apiKey = process.env.APPWRITE_API_KEY || "";

    if (!endpoint || !projectId || !apiKey) {
      console.error("[verify] Missing Appwrite server env (endpoint/projectId/apiKey).");
      return NextResponse.redirect(badRedirect);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const account = new Account(client);

    // ✅ Requires users.write scope on the API key
    await account.updateVerification(userId, secret);

    console.log("[verify] Email verified successfully:", userId);
    return NextResponse.redirect(okRedirect);
  } catch (error) {
    console.error("[verify] Verification failed:", error);
    return NextResponse.redirect(badRedirect);
  }
}