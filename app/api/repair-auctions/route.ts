// app/api/repair-auctions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// SIMPLE ADMIN GATE
// Set REPAIR_AUCTIONS_SECRET in env and send:
// x-admin-secret: <value>
// -----------------------------
const REPAIR_AUCTIONS_SECRET = (process.env.REPAIR_AUCTIONS_SECRET || "").trim();

function requireAdmin(req: NextRequest) {
  if (!REPAIR_AUCTIONS_SECRET) {
    // Fail closed in production
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    return !isProd; // allow only in dev if secret missing
  }
  return (req.headers.get("x-admin-secret") || "").trim() === REPAIR_AUCTIONS_SECRET;
}

// -----------------------------
// Safe ENV
// -----------------------------
function env(name: string) {
  return (process.env[name] || "").trim();
}

function getAppwriteConfig() {
  const endpoint = env("APPWRITE_ENDPOINT") || env("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const projectId = env("APPWRITE_PROJECT_ID") || env("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  const apiKey = env("APPWRITE_API_KEY");

  const dbId = env("APPWRITE_LISTINGS_DATABASE_ID") || env("NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID");
  const collectionId =
    env("APPWRITE_LISTINGS_COLLECTION_ID") || env("NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID");

  return { endpoint, projectId, apiKey, dbId, collectionId };
}

function isParseableDate(v: unknown) {
  if (typeof v !== "string") return false;
  const ms = Date.parse(v);
  return Number.isFinite(ms);
}

// -----------------------------
// GET /api/repair-auctions
// Repairs listings that are live/active but have auction_end in the past or invalid.
// -----------------------------
export async function GET(req: NextRequest) {
  try {
    // ✅ Security gate
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, projectId, apiKey, dbId, collectionId } = getAppwriteConfig();

    if (!endpoint || !projectId || !apiKey || !dbId || !collectionId) {
      return NextResponse.json(
        {
          error:
            "Server Appwrite config missing. Need APPWRITE_ENDPOINT/PROJECT_ID/API_KEY and listings DB/collection IDs.",
        },
        { status: 500 }
      );
    }

    // Setup Appwrite server client
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);

    // Load listings that are live/active
    // Appwrite can’t OR in one query easily, so fetch both sets and combine.
    const liveRes = await databases.listDocuments(dbId, collectionId, [
      Query.equal("status", "live"),
      Query.limit(200),
    ]);

    const activeRes = await databases.listDocuments(dbId, collectionId, [
      Query.equal("status", "active"),
      Query.limit(200),
    ]);

    const docs = [...liveRes.documents, ...activeRes.documents];

    if (!docs.length) {
      return NextResponse.json({
        fixed: 0,
        message: "No live/active listings found",
      });
    }

    // Weekly window
    const { now, currentStart, currentEnd } = getAuctionWindow();
    const nowMs = now.getTime();

    const fixed: string[] = [];
    const scanned = docs.length;

    for (const doc of docs as any[]) {
      const endRaw = doc?.auction_end ?? doc?.end_time ?? null;
      const startRaw = doc?.auction_start ?? doc?.start_time ?? null;

      const endMs = typeof endRaw === "string" ? Date.parse(endRaw) : NaN;

      const needsFix =
        !isParseableDate(startRaw) ||
        !Number.isFinite(endMs) ||
        endMs < nowMs;

      if (!needsFix) continue;

      await databases.updateDocument(dbId, collectionId, doc.$id, {
        auction_start: currentStart.toISOString(),
        auction_end: currentEnd.toISOString(),
      });

      fixed.push(String(doc.$id));
    }

    return NextResponse.json({
      fixed: fixed.length,
      repairedListings: fixed,
      scanned,
    });
  } catch (err: any) {
    console.error("Repair auction error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to repair auction listings" },
      { status: 500 }
    );
  }
}