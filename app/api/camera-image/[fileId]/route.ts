// app/api/camera-image/[fileId]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Server env (prefer non-public where possible) ---
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

// Bucket that stores camera images (prefer server env, then public fallback)
const bucketId =
  process.env.APPWRITE_CAMERA_IMAGES_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID ||
  "";

/**
 * GET /api/camera-image/:fileId
 * Proxies Appwrite Storage "view" using your server API key so images can load publicly.
 *
 * IMPORTANT:
 * - This does NOT expose your key to the browser.
 * - Anyone who can guess/obtain a fileId can fetch the image.
 * - If you need true privacy, use Appwrite permissions + signed URLs / authenticated sessions.
 */
export async function GET(
  req: NextRequest,
  context: { params: { fileId: string } } | { params: Promise<{ fileId: string }> }
) {
  try {
    // ✅ Support both Next typings (some setups/types show params as a Promise)
    const rawParams: any = (context as any).params;
    const params = typeof rawParams?.then === "function" ? await rawParams : rawParams;

    const fileId = params?.fileId;

    if (!fileId || typeof fileId !== "string") {
      return new Response("Missing fileId", { status: 400 });
    }

    if (!endpoint || !projectId || !apiKey || !bucketId) {
      return new Response("Server misconfigured (Appwrite env missing)", { status: 500 });
    }

    const base = endpoint.replace(/\/+$/, "");
    const url =
      `${base}/storage/buckets/${encodeURIComponent(bucketId)}` +
      `/files/${encodeURIComponent(fileId)}/view`;

    // Proxy the file bytes from Appwrite using API key
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
      cache: "no-store", // avoid Next caching the upstream fetch
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("[camera-image] upstream failed:", upstream.status, text);

      // Mirror common upstream outcomes
      if (upstream.status === 404) return new Response("Image not found", { status: 404 });
      if (upstream.status === 401 || upstream.status === 403)
        return new Response("Forbidden", { status: 403 });

      return new Response("Upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    // Pass through useful headers when present
    const headers = new Headers();
    headers.set("Content-Type", contentType);

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const etag = upstream.headers.get("etag");
    if (etag) headers.set("ETag", etag);

    const lastModified = upstream.headers.get("last-modified");
    if (lastModified) headers.set("Last-Modified", lastModified);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    // File IDs are effectively immutable; safe to cache aggressively
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Stream the response back to the browser
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error("[camera-image] fatal:", err);
    return new Response("Server error", { status: 500 });
  }
}