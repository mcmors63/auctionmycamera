// app/lib/requireAdmin.ts
import { NextRequest } from "next/server";
import { Client, Account } from "node-appwrite";

type AdminCheckResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

function normalizeEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

/**
 * Appwrite sets session cookies named like:
 * - a_session_<PROJECT_ID>
 * - a_session_<PROJECT_ID>_legacy
 * - a_session_<PROJECT_ID>_v2
 * Some setups may also use "a_session" (older).
 */
function getAppwriteSessionFromCookies(req: NextRequest, projectId: string) {
  const names = [
    `a_session_${projectId}`,
    `a_session_${projectId}_legacy`,
    `a_session_${projectId}_v2`,
    "a_session",
  ];

  for (const name of names) {
    const c = req.cookies.get(name)?.value;
    if (c) return c;
  }
  return "";
}

function getBearerJwt(req: NextRequest) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

/**
 * ✅ Server-side admin guard.
 * Accepts either:
 * 1) Authorization: Bearer <Appwrite JWT>  (preferred — what AdminClient sends)
 * 2) Appwrite session cookie              (fallback)
 *
 * Then verifies account.get() and matches ADMIN_EMAIL.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminCheckResult> {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "";

  const projectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    "";

  // IMPORTANT:
  // Your client uses NEXT_PUBLIC_ADMIN_EMAIL, but server code was reading ADMIN_EMAIL only.
  // Support both so prod doesn't silently fail due to env mismatch.
  const adminEmail = normalizeEmail(
    process.env.ADMIN_EMAIL ||
      process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
      "admin@auctionmycamera.co.uk"
  );

  if (!endpoint || !projectId) {
    return { ok: false, error: "Server Appwrite config missing (endpoint/projectId)." };
  }

  if (!adminEmail) {
    return { ok: false, error: "ADMIN_EMAIL is not set on the server (Vercel env)." };
  }

  const jwt = getBearerJwt(req);

  const session = jwt ? "" : getAppwriteSessionFromCookies(req, projectId);

  if (!jwt && !session) {
    return { ok: false, error: "No auth provided (missing Bearer JWT and no session cookie)." };
  }

  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId);

    // Prefer JWT if provided (matches your AdminClient authedFetch)
    if (jwt) {
      client.setJWT(jwt);
    } else {
      client.setSession(session);
    }

    const account = new Account(client);
    const me: any = await account.get();

    const email = normalizeEmail(me?.email || "");
    if (!email) {
      return { ok: false, error: "Auth is invalid (no email)." };
    }

    if (email !== adminEmail) {
      return { ok: false, error: "Not authorized as admin." };
    }

    return { ok: true, email };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Admin auth check failed." };
  }
}