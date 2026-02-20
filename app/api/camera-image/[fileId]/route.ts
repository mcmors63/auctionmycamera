// app/api/camera-image/[fileId]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Server env (use non-public where possible) ---
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// Bucket that stores camera images
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "";

/**
 * GET /api/camera-image/:fileId
 * Proxies Appwrite Storage "view" using your server API key so images can load publicly.
 *
 * IMPORTANT:
 * - This does NOT expose your key to the browser.
 * - If you want images to be private, don’t use this. Use signed URLs or user sessions.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    // ✅ Next.js 16 typing expects params as a Promise
    const { fileId } = await context.params;

    if (!fileId || typeof fileId !== "string") {
      return new Response("Missing fileId", { status: 400 });
    }

    if (!endpoint || !projectId || !apiKey || !bucketId) {
      return new Response("Server misconfigured (Appwrite env missing)", {
        status: 500,
      });
    }

    const base = endpoint.replace(/\/+$/, "");
    const url = `${base}/storage/buckets/${encodeURIComponent(
      bucketId
    )}/files/${encodeURIComponent(fileId)}/view`;

    // Proxy the file bytes from Appwrite using API key
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
      // Avoid Next caching weirdness
      cache: "no-store",
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("[camera-image] upstream failed:", upstream.status, text);
      return new Response("Image not found", { status: 404 });
    }

    // Pass through content-type if provided
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    // Stream the response back to the browser
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[camera-image] fatal:", err);
    return new Response("Server error", { status: 500 });
  }
}