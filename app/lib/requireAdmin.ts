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
 * Some setups may also use "a_session" (older).
 */
function getAppwriteSessionFromCookies(req: NextRequest, projectId: string) {
  const names = [
    `a_session_${projectId}`,
    `a_session_${projectId}_legacy`,
    "a_session",
  ];

  for (const name of names) {
    const c = req.cookies.get(name)?.value;
    if (c) return c;
  }
  return "";
}

/**
 * ✅ Server-side admin guard using the caller's Appwrite session cookie.
 * Verifies who is calling based on their session, then matches ADMIN_EMAIL.
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

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");

  if (!endpoint || !projectId) {
    return { ok: false, error: "Server Appwrite config missing (endpoint/projectId)." };
  }

  if (!adminEmail) {
    return { ok: false, error: "ADMIN_EMAIL is not set on the server (Vercel env)." };
  }

  const session = getAppwriteSessionFromCookies(req, projectId);
  if (!session) {
    return { ok: false, error: "No active session cookie found." };
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setSession(session);

    const account = new Account(client);
    const me: any = await account.get();

    const email = normalizeEmail(me?.email || "");
    if (!email) return { ok: false, error: "Session is invalid (no email)." };

    if (email !== adminEmail) {
      return { ok: false, error: "Not authorized as admin." };
    }

    return { ok: true, email };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Admin session check failed." };
  }
}