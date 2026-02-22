// app/api/admin/view-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite (server-side)
// Prefer server envs first, then public fallbacks (non-breaking).
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// Optional: if set, require ?token=... to match (adds security without breaking existing setups)
const ADMIN_VIEW_DOCUMENT_SECRET = (process.env.ADMIN_VIEW_DOCUMENT_SECRET || "").trim();

// Prefer camera/generic envs, then legacy, then last-resort defaults
const DOCS_BUCKET_ID =
  process.env.APPWRITE_DOCS_BUCKET_ID || // ✅ best (generic for any project)
  process.env.APPWRITE_SELLER_DOCS_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_SELLER_DOCS_BUCKET_ID || // last fallback if you used public var
  "seller_docs";

// Optional: if you ever split docs buckets later
const ALT_DOCS_BUCKET_ID =
  process.env.APPWRITE_BUYER_DOCS_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BUYER_DOCS_BUCKET_ID ||
  "";

// Build Appwrite storage only when envs exist
function getStorage() {
  if (!endpoint || !projectId || !apiKey) return null;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return new Storage(client);
}

// -----------------------------
// GET /api/admin/view-document?fileId=XXXX
// Optional: &bucket=buyer_docs (or any bucket id)
// Optional: &token=... (only required if ADMIN_VIEW_DOCUMENT_SECRET is set)
// Redirects to Appwrite's file view URL
// -----------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const fileId = (searchParams.get("fileId") || "").trim();
  const bucketParam = (searchParams.get("bucket") || "").trim();
  const token = (searchParams.get("token") || "").trim();

  if (!fileId) {
    return NextResponse.json(
      { error: "Missing fileId query parameter." },
      { status: 400 }
    );
  }

  // If you set ADMIN_VIEW_DOCUMENT_SECRET in Vercel/local env,
  // this route becomes effectively private to anyone who knows the token.
  if (ADMIN_VIEW_DOCUMENT_SECRET && token !== ADMIN_VIEW_DOCUMENT_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const storage = getStorage();
  if (!storage) {
    return NextResponse.json(
      {
        error:
          "Server Appwrite config missing for view-document route. Check APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID/APPWRITE_API_KEY (or NEXT_PUBLIC fallbacks).",
      },
      { status: 500 }
    );
  }

  // If caller explicitly passes a bucket, allow it (admin-only usage).
  // Otherwise use primary bucket, and if that fails try ALT bucket.
  const candidates = [bucketParam, DOCS_BUCKET_ID, ALT_DOCS_BUCKET_ID].filter(Boolean);

  let lastErr: any = null;

  for (const bucketId of candidates) {
    try {
      const url = storage.getFileView(bucketId, fileId);
      const href = typeof url === "string" ? url : (url as any)?.href;

      if (!href) throw new Error("Could not build file view URL");

      // Redirect so the browser loads the file in a new tab
      return NextResponse.redirect(href, 302);
    } catch (err: any) {
      lastErr = err;
      continue; // try next bucket candidate
    }
  }

  console.error("[view-document] Failed to open file:", {
    fileId,
    candidates,
    lastErr: lastErr?.message || lastErr,
  });

  return NextResponse.json(
    {
      error:
        lastErr?.message ||
        "Could not open file. Check bucket ID + file ID, and confirm file permissions allow viewing.",
      triedBuckets: candidates,
    },
    { status: 500 }
  );
}