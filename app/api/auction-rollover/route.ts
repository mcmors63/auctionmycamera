// app/api/rollover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-safe)
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
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// REQUIRED: protect this route
const ROLLOVER_SECRET = (process.env.ROLLOVER_SECRET || "").trim();

function getDatabases() {
  if (!endpoint || !projectId || !apiKey) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function listAllQueued(databases: Databases) {
  const all: any[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
      Query.equal("status", "queued"),
      Query.orderAsc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ]);

    all.push(...page.documents);

    if (page.documents.length < limit) break;
    offset += limit;

    // Hard stop safety (prevents accidental infinite loops if API behaves oddly)
    if (offset > 5000) break;
  }

  return all;
}

export async function GET(req: NextRequest) {
  try {
    // ---- Security gate ----
    if (!ROLLOVER_SECRET) {
      return NextResponse.json(
        { error: "ROLLOVER_SECRET is not set on the server." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const secretFromQuery = (searchParams.get("secret") || "").trim();
    const secretFromHeader = (req.headers.get("x-rollover-secret") || "").trim();
    const secret = secretFromQuery || secretFromHeader;

    if (secret !== ROLLOVER_SECRET) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

    const databases = getDatabases();
    if (!databases) {
      return NextResponse.json(
        { error: "Server Appwrite config missing (endpoint/project/apiKey)." },
        { status: 500 }
      );
    }

    const { currentStart, currentEnd, isLive } = getAuctionWindow();

    if (!isLive) {
      return NextResponse.json({
        ok: true,
        message: "Auction not live yet — nothing to roll over",
      });
    }

    // 1️⃣ Load all queued listings (paged)
    const queuedDocs = await listAllQueued(databases);

    // 2️⃣ Make them LIVE
    let updatedCount = 0;

    for (const doc of queuedDocs) {
      await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, doc.$id, {
        status: "live",
        auction_start: currentStart.toISOString(),
        auction_end: currentEnd.toISOString(),
      });
      updatedCount++;
    }

    return NextResponse.json({
      ok: true,
      updated: updatedCount,
      message: "Queued listings moved to LIVE",
      window: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("ROLLOVER ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown rollover error" },
      { status: 500 }
    );
  }
}