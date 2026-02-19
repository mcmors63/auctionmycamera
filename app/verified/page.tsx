"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function VerifiedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const uid = searchParams.get("userId");
    const sec = searchParams.get("secret");

    if (!uid || !sec) {
      setStatus("error");
      setMessage("Invalid verification link (missing parameters).");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await account.updateVerification(uid, sec);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email has been verified successfully.");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          "Verification failed or expired. Please request a new verification email."
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-10 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] shadow-lg rounded-2xl border border-yellow-700/60 p-8 text-center">
        {status === "verifying" ? (
          <p className="text-gray-200">{message}</p>
        ) : null}

        {status === "success" ? (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2 text-yellow-400">
              Email verified
            </h1>
            <p className="text-gray-200 mb-6">{message}</p>

            <button
              onClick={() => router.push("/login")}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-md"
            >
              Go to Login
            </button>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2 text-yellow-400">
              Verification failed
            </h1>
            <p className="text-gray-200 mb-6">{message}</p>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-md"
              >
                Go to Login
              </Link>

              {/* If you have /resend-verification, link it here. If not, remove this button. */}
              <Link
                href="/resend-verification"
                className="block w-full border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10 font-semibold py-2 rounded-md"
              >
                Resend verification email
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}