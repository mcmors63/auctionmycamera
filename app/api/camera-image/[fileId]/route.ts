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
 * - We intentionally disable caching while the platform is being developed.
 * - This prevents "old image" issues when listings change or files are deleted.
 */
export async function GET(
  req: NextRequest,
  context: { params: { fileId: string } } | { params: Promise<{ fileId: string }> }
) {
  try {
    const rawParams: any = (context as any).params;
    const params = typeof rawParams?.then === "function" ? await rawParams : rawParams;

    const fileId = params?.fileId;

    if (!fileId || typeof fileId !== "string") {
      return new Response("Missing fileId", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const safeId = fileId.trim();
    if (!safeId || safeId.length > 128 || !/^[A-Za-z0-9._-]+$/.test(safeId)) {
      return new Response("Invalid fileId", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (!endpoint || !projectId || !apiKey || !bucketId) {
      return new Response("Server misconfigured (Appwrite env missing)", {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const base = endpoint.replace(/\/+$/, "");
    const url =
      `${base}/storage/buckets/${encodeURIComponent(bucketId)}` +
      `/files/${encodeURIComponent(safeId)}/view`;

    const range = req.headers.get("range");

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      const text = await upstream.text().catch(() => "");
      console.error("[camera-image] upstream failed:", upstream.status, text);

      const code = upstream.status === 404 ? 404 : upstream.status === 401 || upstream.status === 403 ? 403 : 502;

      return new Response(
        code === 404 ? "Image not found" : code === 403 ? "Forbidden" : "Upstream error",
        { status: code, headers: { "Cache-Control": "no-store" } }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    // ✅ Critical: DO NOT cache
    headers.set("Cache-Control", "no-store, max-age=0");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error("[camera-image] fatal:", err);
    return new Response("Server error", {
      status: 500,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}