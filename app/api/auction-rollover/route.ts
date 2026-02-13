// app/api/rollover/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

export async function GET() {
  try {
    const { currentStart, currentEnd, now, isLive } = getAuctionWindow();

    if (!isLive) {
      return NextResponse.json({
        ok: true,
        message: "Auction not live yet — nothing to roll over",
      });
    }

    // 1️⃣ Load all queued listings
    const queued = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      [Query.equal("status", "queued")]
    );

    // 2️⃣ Make them LIVE
    for (const plate of queued.documents) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
        plate.$id,
        {
          status: "live",
          auction_start: currentStart.toISOString(),
          auction_end: currentEnd.toISOString(),
        }
      );
    }

    return NextResponse.json({
      ok: true,
      updated: queued.documents.length,
      message: "Queued listings moved to LIVE",
    });
  } catch (err: any) {
    console.error("ROLLOVER ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown rollover error" },
      { status: 500 }
    );
  }
}
