// app/api/admin/delete-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite (server writes)
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

// ✅ Use camera listings env first, then legacy fallbacks
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

function getServerDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// Simple GET for quick smoke testing
export async function GET() {
  return NextResponse.json({ ok: true, route: "admin/delete-listing" });
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Real admin gate: session-based
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error:
            "Missing Appwrite listings env. Set APPWRITE_LISTINGS_DATABASE_ID/APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const databases = getServerDatabases();
    if (!databases) {
      return NextResponse.json(
        { error: "Server Appwrite config missing (endpoint/project/apiKey)." },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Accept both listingId and legacy plateId
    const listingId = body?.listingId || body?.plateId || body?.id;
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId (or plateId)." }, { status: 400 });
    }

    await databases.deleteDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("delete-listing error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete listing" },
      { status: 500 }
    );
  }
}