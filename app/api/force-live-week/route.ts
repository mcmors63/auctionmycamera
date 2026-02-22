// app/api/force-live-week/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-first, fallback to NEXT_PUBLIC)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

const DB =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const COL =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// Protect this route (same pattern as your other cron routes)
const CRON_SECRET = (process.env.CRON_SECRET || process.env.AUCTION_CRON_SECRET || "").trim();

function isAuthed(req: NextRequest) {
  if (!CRON_SECRET) return false; // do NOT allow open access by default
  const q = (req.nextUrl.searchParams.get("secret") || "").trim();
  const h = (req.headers.get("x-cron-secret") || "").trim();
  const auth = (req.headers.get("authorization") || "").trim();
  return q === CRON_SECRET || h === CRON_SECRET || auth === `Bearer ${CRON_SECRET}`;
}

function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing ${name}.`);
}

function getDatabases() {
  requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
  requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
  requireEnv("APPWRITE_API_KEY", apiKey);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

// -----------------------------
// GET /api/force-live-week?secret=...
// Moves ALL queued listings to live for the CURRENT auction window.
// -----------------------------
export async function GET(req: NextRequest) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    requireEnv("LISTINGS DB ID", DB);
    requireEnv("LISTINGS COLLECTION ID", COL);

    const databases = getDatabases();

    // Current weekly window (London-time helper)
    const { currentStart, currentEnd } = getAuctionWindow();
    const startIso = currentStart.toISOString();
    const endIso = currentEnd.toISOString();

    // Paginate through all queued listings
    let updated = 0;
    let scanned = 0;
    let cursor: string | undefined;

    while (true) {
      const queries: string[] = [
        Query.equal("status", "queued"),
        Query.orderAsc("$id"),
        Query.limit(100),
      ];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const page = await databases.listDocuments(DB, COL, queries);
      const docs = page.documents as any[];

      if (!docs.length) break;

      scanned += docs.length;

      for (const item of docs) {
        await databases.updateDocument(DB, COL, item.$id, {
          status: "live",
          auction_start: startIso,
          auction_end: endIso,
        });
        updated++;
      }

      cursor = docs[docs.length - 1].$id;
      if (docs.length < 100) break;
    }

    if (updated === 0) {
      return NextResponse.json({
        ok: true,
        message: "No queued listings to move live.",
        scanned,
        updated,
        window: { start: startIso, end: endIso },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Moved ${updated} listings → LIVE.`,
      scanned,
      updated,
      window: { start: startIso, end: endIso },
    });
  } catch (err: any) {
    console.error("FORCE LIVE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to force live" },
      { status: 500 }
    );
  }
}