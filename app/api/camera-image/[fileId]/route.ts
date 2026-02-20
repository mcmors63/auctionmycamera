// app/api/camera-image/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// ✅ Your camera images bucket id (must exist in Vercel env)
const CAMERA_IMAGES_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "";

function safeId(id: string) {
  // Appwrite IDs are generally safe-ish strings; just avoid path tricks
  return String(id || "").replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const raw = String(params?.fileId || "");
    const fileId = safeId(raw);

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId." }, { status: 400 });
    }

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        { error: "Server missing Appwrite config." },
        { status: 500 }
      );
    }

    if (!CAMERA_IMAGES_BUCKET_ID) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID." },
        { status: 500 }
      );
    }

    // ✅ Fetch the file bytes from Appwrite using the server API key
    const base = endpoint.replace(/\/+$/, "");
    const url =
      `${base}/storage/buckets/${encodeURIComponent(
        CAMERA_IMAGES_BUCKET_ID
      )}/files/${encodeURIComponent(fileId)}/view`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
      // streaming is fine
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.warn("[camera-image] upstream not ok:", upstream.status, text);
      return NextResponse.json(
        { error: "Image not found." },
        { status: upstream.status === 404 ? 404 : 400 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    // Cache hard — files are immutable once created (good for performance)
    const res = new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    return res;
  } catch (err: any) {
    console.error("[camera-image] fatal:", err);
    return NextResponse.json(
      { error: "Failed to load image." },
      { status: 500 }
    );
  }
}