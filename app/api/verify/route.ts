import { NextResponse } from "next/server";
import { Client, Account } from "node-appwrite"; // ✅ Server SDK

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  if (!userId || !secret) {
    console.error("❌ Missing verification parameters");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/verify?status=error`);
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!); // ✅ Server key here

    const account = new Account(client);

    // ✅ This requires users.write permission
    await account.updateVerification(userId, secret);

    console.log("✅ Email verified successfully:", userId);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/verify?status=success`);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/verify?status=error`);
  }
}
