import { NextResponse } from "next/server";
import { Client, Databases, Query } from "node-appwrite";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

export async function GET() {
  try {
    // ---------------------------
    // Setup Appwrite server client
    // ---------------------------
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    const DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
    const COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

    // ---------------------------
    // Load LIVE listings only
    // ---------------------------
    const liveListings = await databases.listDocuments(DB, COLLECTION, [
      Query.equal("status", "live"),
    ]);

    if (!liveListings.documents.length) {
      return NextResponse.json({
        fixed: 0,
        message: "No live listings found",
      });
    }

    // ---------------------------
    // Get correct weekly window
    // ---------------------------
    const { currentStart, currentEnd } = getAuctionWindow();

    const fixed = [];
    const now = Date.now();

    // ---------------------------
    // Loop through listings
    // ---------------------------
    for (const doc of liveListings.documents) {
      const auctionEnd = new Date(doc.auction_end).getTime();

      // If end date is wrong (in the past), fix it
      if (auctionEnd < now) {
        await databases.updateDocument(DB, COLLECTION, doc.$id, {
          auction_start: currentStart.toISOString(),
          auction_end: currentEnd.toISOString(),
        });

        fixed.push(doc.$id);
      }
    }

    return NextResponse.json({
      fixed: fixed.length,
      repairedListings: fixed,
    });
  } catch (err: any) {
    console.error("Repair auction error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to repair auction listings" },
      { status: 500 }
    );
  }
}
