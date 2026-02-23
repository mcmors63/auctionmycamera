"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

// ✅ Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

function clearAuthCache() {
  if (typeof window === "undefined") return;

  // ✅ AuctionMyCamera keys (and clear AMP too during migration, harmless)
  const keysToClear = [
    // AMC
    "amc_user_email",
    "amc_user_id",
    "amc_user_name",

    // AMP (legacy/clone safety)
    "amp_user_email",
    "amp_user_id",
    "amp_user_name",
  ];

  for (const k of keysToClear) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    const logout = async () => {
      // Always clear local cached auth first (prevents “ghost login” immediately)
      clearAuthCache();

      try {
        // End current session (if already logged out, this may throw — that’s fine)
        await account.deleteSession("current");
      } catch {
        // Treat as done anyway (already logged out / session missing / network hiccup)
      }

      if (!alive) return;

      setStatus("done");

      // Redirect after delay
      t = setTimeout(() => {
        router.replace("/login");
      }, 1200);
    };

    void logout();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 text-gray-100">
      <div className="bg-[#111111] shadow-lg rounded-2xl p-8 max-w-md text-center border border-sky-700/60">
        {status === "loading" && (
          <>
            <p className="text-lg font-medium text-gray-200 mb-2">Logging you out…</p>
            <div className="w-6 h-6 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-green-400 mb-1">You’ve been logged out</h2>
            <p className="text-gray-300">Redirecting you to the login page…</p>
          </>
        )}
      </div>
    </div>
  );
}