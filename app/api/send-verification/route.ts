import { NextResponse } from "next/server";
import { Client, Account } from "appwrite";

// 🧠 Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

// 📨 Handle verification link clicks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  if (!userId || !secret) {
    return NextResponse.json(
      { error: "Missing verification details" },
      { status: 400 }
    );
  }

  try {
    await account.updateVerification(userId, secret);
    console.log("✅ Email verified for user:", userId);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/verify?status=success`);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/verify?status=error`);
  }
}
