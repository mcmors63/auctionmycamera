// app/api/dashboard/request-withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

function getDatabases() {
  const client = new Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const plateId = body?.plateId as string | undefined;

    if (!plateId) {
      return NextResponse.json(
        { error: "plateId is required." },
        { status: 400 }
      );
    }

    const databases = getDatabases();

    // Simply flag the plate to withdraw after this auction
    await databases.updateDocument(
      PLATES_DB_ID,
      PLATES_COLLECTION_ID,
      plateId,
      {
        withdraw_after_current: true,
      }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("request-withdraw API error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to request withdrawal.",
      },
      { status: 500 }
    );
  }
}
