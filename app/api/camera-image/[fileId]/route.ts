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
 * Notes:
 * - Does not expose your API key to the browser.
 * - Anyone with a fileId can fetch the image via this proxy.
 */
export async function GET(
  req: NextRequest,
  context: { params: { fileId: string } } | { params: Promise<{ fileId: string }> }
) {
  try {
    // ✅ Support params possibly being a Promise (Next typings vary)
    const rawParams: any = (context as any).params;
    const params = typeof rawParams?.then === "function" ? await rawParams : rawParams;

    const fileId = params?.fileId;

    if (!fileId || typeof fileId !== "string") {
      return new Response("Missing fileId", { status: 400 });
    }

    // Basic hardening (Appwrite IDs are typically URL-safe)
    const safeId = fileId.trim();
    if (!safeId || safeId.length > 128 || !/^[A-Za-z0-9._-]+$/.test(safeId)) {
      return new Response("Invalid fileId", { status: 400 });
    }

    if (!endpoint || !projectId || !apiKey || !bucketId) {
      return new Response("Server misconfigured (Appwrite env missing)", { status: 500 });
    }

    const base = endpoint.replace(/\/+$/, "");
    const url =
      `${base}/storage/buckets/${encodeURIComponent(bucketId)}` +
      `/files/${encodeURIComponent(safeId)}/view`;

    // Forward headers that help caching + partial content
    const range = req.headers.get("range");
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
        ...(range ? { Range: range } : {}),
        ...(ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {}),
        ...(ifModifiedSince ? { "If-Modified-Since": ifModifiedSince } : {}),
      },
      cache: "no-store", // avoid Next caching the upstream fetch
    });

    // Handle 304 cleanly (no body expected)
    if (upstream.status === 304) {
      const headers = new Headers();

      const etag = upstream.headers.get("etag");
      if (etag) headers.set("ETag", etag);

      const lastModified = upstream.headers.get("last-modified");
      if (lastModified) headers.set("Last-Modified", lastModified);

      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("X-Content-Type-Options", "nosniff");

      return new Response(null, { status: 304, headers });
    }

    if (!upstream.ok && upstream.status !== 206) {
      const text = await upstream.text().catch(() => "");
      console.error("[camera-image] upstream failed:", upstream.status, text);

      if (upstream.status === 404) {
        return new Response("Image not found", {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return new Response("Forbidden", {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        });
      }

      return new Response("Upstream error", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    // Pass through useful headers when present
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const etag = upstream.headers.get("etag");
    if (etag) headers.set("ETag", etag);

    const lastModified = upstream.headers.get("last-modified");
    if (lastModified) headers.set("Last-Modified", lastModified);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) headers.set("Content-Disposition", contentDisposition);

    // ✅ Only cache successful image responses (200 or 206)
    // File IDs are effectively immutable; safe to cache aggressively
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Stream the response back to the browser
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error("[camera-image] fatal:", err);
    return new Response("Server error", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}