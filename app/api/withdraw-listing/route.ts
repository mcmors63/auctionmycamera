import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

export async function POST(req: Request) {
  try {
    const { listingId } = await req.json();

    const updated = await db.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
      listingId,
      { status: "withdrawn" }
    );

    return NextResponse.json({ success: true, updated });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to withdraw listing" },
      { status: 500 }
    );
  }
}
