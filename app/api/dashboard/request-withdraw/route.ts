// app/api/dashboard/request-withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Account } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (prefer server vars)
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

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// -----------------------------
// Helpers
// -----------------------------
function getBearerJwt(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function serverClientWithKey() {
  const c = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return c;
}

function clientWithJwt(jwt: string) {
  const c = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  return c;
}

// Schema-tolerant update: remove unknown keys and retry
async function updateDocSchemaTolerant(
  databases: Databases,
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 12; i++) {
    try {
      return await databases.updateDocument(dbId, colId, docId, data);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const m = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
      if (m?.[1]) {
        delete data[m[1]];
        continue;
      }
      throw err;
    }
  }

  // last resort: only the one field we truly need
  return await databases.updateDocument(dbId, colId, docId, {
    withdraw_after_current: true,
  });
}

// -----------------------------
// POST /api/dashboard/request-withdraw
// Body: { plateId?: string, listingId?: string }
// Requires: Authorization: Bearer <appwrite_jwt>
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "Server API key missing (APPWRITE_API_KEY)." }, { status: 500 });
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error:
            "Missing listings DB/collection env. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents).",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = (body?.listingId as string | undefined) || (body?.plateId as string | undefined) || "";
    if (!listingId) {
      return NextResponse.json({ error: "listingId (or plateId) is required." }, { status: 400 });
    }

    // ✅ Require logged-in user via JWT
    const jwt = getBearerJwt(req);
    if (!jwt) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // 1) Who is calling?
    const authedClient = clientWithJwt(jwt);
    const account = new Account(authedClient);

    let user: any;
    try {
      user = await account.get();
    } catch {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const userId = String(user?.$id || "");
    const userEmail = String(user?.email || "").trim().toLowerCase();

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // 2) Load listing (server key to avoid permissions surprises)
    const databases = new Databases(serverClientWithKey());
    const listing: any = await databases.getDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId);

    // 3) Ownership check (support common schemas)
    const sellerId =
      String(listing?.seller_id || listing?.sellerId || listing?.userId || listing?.ownerUserId || "").trim();

    const sellerEmail = String(listing?.seller_email || listing?.sellerEmail || "").trim().toLowerCase();

    const ownsById = sellerId && sellerId === userId;
    const ownsByEmail = sellerEmail && userEmail && sellerEmail === userEmail;

    if (!ownsById && !ownsByEmail) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // 4) Flag withdraw-after-current
    await updateDocSchemaTolerant(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listingId, {
      withdraw_after_current: true,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("request-withdraw API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to request withdrawal." },
      { status: 500 }
    );
  }
}