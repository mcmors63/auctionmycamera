// app/sell-your-plate/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

// Appwrite client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function SellYourPlatePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      try {
        // If logged in -> go straight to dashboard sell tab
        await account.get();
        router.replace("/dashboard?sell=1");
      } catch {
        // If NOT logged in -> go to login/register
        router.replace("/login-or-register?sell=1");
      }
    }

    checkUser();
  }, [router]);

  // Simple holding screen while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBEA] text-gray-600">
      Checking your account and redirecting…
    </div>
  );
}
