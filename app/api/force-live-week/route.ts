// app/api/force-live-week/route.ts
import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export async function GET() {
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
    const COL = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

    // ⭐ Get current auction window
    const { currentStart, currentEnd } = getAuctionWindow();

    // ⭐ Fetch all queued listings
    const res = await databases.listDocuments(DB, COL, [
      Query.equal("status", "queued"),
    ]);

    const queued = res.documents;

    if (queued.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No queued listings to move live.",
      });
    }

    // ⭐ Update every queued listing → live
    for (const item of queued) {
      await databases.updateDocument(DB, COL, item.$id, {
        status: "live",
        auction_start: currentStart.toISOString(),
        auction_end: currentEnd.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      updated: queued.length,
      message: `Moved ${queued.length} listings → LIVE.`,
      start: currentStart,
      end: currentEnd,
    });
  } catch (err: any) {
    console.error("FORCE LIVE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Failed to force live" },
      { status: 500 }
    );
  }
}
