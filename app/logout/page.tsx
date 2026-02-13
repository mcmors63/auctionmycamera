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

  // These are the keys your other pages use as a fallback “session”
  window.localStorage.removeItem("amp_user_email");
  window.localStorage.removeItem("amp_user_id");
}

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    const logout = async () => {
      try {
        // Always clear local cached auth first (prevents “ghost login” immediately)
        clearAuthCache();

        // End current session (if already logged out, this may throw — that’s fine)
        await account.deleteSession("current");

        if (!alive) return;
        setStatus("done");

        // Redirect after delay
        t = setTimeout(() => {
          router.replace("/login");
        }, 1200);
      } catch (error) {
        console.error("Logout failed:", error);

        // Even if Appwrite logout fails, we still clear client cache so UI cannot “pretend”
        clearAuthCache();

        if (!alive) return;
        // Most common case: already logged out / session missing / network hiccup
        // Treat as done, because from this device we’ve removed the cached auth.
        setStatus("done");

        t = setTimeout(() => {
          router.replace("/login");
        }, 1200);
      }
    };

    void logout();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50 px-4">
      <div className="bg-white shadow-md rounded-2xl p-8 max-w-md text-center">
        {status === "loading" && (
          <>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Logging you out...
            </p>
            <div className="w-6 h-6 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-green-600 mb-1">
              You’ve been logged out
            </h2>
            <p className="text-gray-600">Redirecting you to the login page...</p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-red-600 font-medium">
              Something went wrong while logging out.
            </p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
