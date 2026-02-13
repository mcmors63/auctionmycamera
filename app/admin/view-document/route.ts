// app/api/admin/view-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// Appwrite (server-side)
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DOCS_BUCKET_ID =
  process.env.APPWRITE_SELLER_DOCS_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_SELLER_DOCS_BUCKET_ID || // fallback if you used public var
  "seller_docs"; // last-resort default – change if your bucket ID is different

if (!endpoint || !projectId || !apiKey) {
  console.warn(
    "[view-document] Appwrite env vars missing – route will not work correctly."
  );
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const storage = new Storage(client);

// -----------------------------
// GET /api/admin/view-document?fileId=XXXX
// Redirects to Appwrite's file view URL
// -----------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json(
      { error: "Missing fileId query parameter." },
      { status: 400 }
    );
  }

  try {
    // This generates a URL to view the file directly from Appwrite
    const url = storage.getFileView(DOCS_BUCKET_ID, fileId);

    // url is a URL object or string depending on SDK version; handle both
    const href = typeof url === "string" ? url : (url as any).href;

    if (!href) {
      throw new Error("Could not build file view URL");
    }

    // Simple redirect so the browser loads the file in a new tab
    return NextResponse.redirect(href, 302);
  } catch (err: any) {
    console.error("[view-document] Failed to load file:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Could not open file. Please check the bucket ID and file ID.",
      },
      { status: 500 }
    );
  }
}
