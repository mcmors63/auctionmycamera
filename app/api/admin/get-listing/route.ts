// app/api/admin/get-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Account, Databases } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite ENV
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// Admin email check (same idea you use elsewhere)
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();

function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function getAuthedUser(req: NextRequest) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) return null;

  const userClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(userClient);

  try {
    const me: any = await account.get();
    if (!me?.$id || !me?.email) return null;

    return {
      id: String(me.$id),
      email: String(me.email).trim().toLowerCase(),
    };
  } catch {
    return null;
  }
}

function getAdminDatabases() {
  const adminClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(adminClient);
}

/**
 * POST /api/admin/get-listing
 * Body: { listingId: string }
 * Returns: key fields to debug images/description
 */
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        { error: "Missing listings env (APPWRITE_LISTINGS_DATABASE_ID / APPWRITE_LISTINGS_COLLECTION_ID)." },
        { status: 500 }
      );
    }
    if (!ADMIN_EMAIL) {
      return NextResponse.json({ error: "ADMIN_EMAIL env missing." }, { status: 500 });
    }

    // ✅ Auth + admin check
    const me = await getAuthedUser(req);
    if (!me) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (me.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId || "").trim();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId." }, { status: 400 });
    }

    const db = getAdminDatabases();
    const doc: any = await db.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    return NextResponse.json(
      {
        ok: true,
        listing: {
          id: doc?.$id,
          status: doc?.status ?? null,
          item_title: doc?.item_title ?? doc?.title ?? doc?.registration ?? null,

          // the image fields that matter
          image_url: doc?.image_url ?? null,
          image_id: doc?.image_id ?? null,
          image_ids: doc?.image_ids ?? null,

          // description field
          description: doc?.description ?? null,

          // helpful timestamps
          $createdAt: doc?.$createdAt ?? null,
          $updatedAt: doc?.$updatedAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ /api/admin/get-listing error:", err);
    return NextResponse.json({ error: err?.message || "Failed." }, { status: 500 });
  }
}

// Optional explicit 405
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
