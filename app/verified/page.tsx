// app/verified/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Account } from "appwrite";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

type Status = "verifying" | "success" | "error";

export default function VerifiedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = useMemo(() => (searchParams.get("userId") || "").trim(), [searchParams]);
  const secret = useMemo(() => (searchParams.get("secret") || "").trim(), [searchParams]);

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("Verifying your email…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // If someone opens /verified manually
      if (!userId || !secret) {
        setStatus("error");
        setMessage(
          "Verification link is missing required details. Please request a new verification email and try again."
        );
        return;
      }

      try {
        await account.updateVerification(userId, secret);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email has been verified successfully. You can now log in and sell/bid.");
      } catch (err: any) {
        if (cancelled) return;

        // Appwrite sometimes throws “already verified” scenarios as errors depending on state;
        // show a helpful message either way.
        const msg = String(err?.message || "").toLowerCase();

        if (msg.includes("already") && msg.includes("verified")) {
          setStatus("success");
          setMessage("Your email is already verified. You can log in now.");
          return;
        }

        setStatus("error");
        setMessage(
          err?.message ||
            "Verification failed or expired. Please request a new verification email and try again."
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId, secret]);

  const isSuccess = status === "success";

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-10 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] shadow-lg rounded-2xl border border-sky-700/60 p-8 text-center">
        {isSuccess ? (
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        )}

        <h1 className="text-xl font-bold mb-2 text-sky-300">
          {isSuccess ? "Email verified" : status === "verifying" ? "Verifying…" : "Verification failed"}
        </h1>

        <p className="text-gray-200 mb-6">{message}</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-sky-500 hover:bg-sky-600 text-black font-semibold py-2 rounded-md"
          >
            Go to Login
          </button>

          {!isSuccess && status !== "verifying" && (
            <Link
              href="/resend-verification"
              className="block w-full border border-sky-500 text-sky-300 hover:bg-sky-500/10 font-semibold py-2 rounded-md"
            >
              Resend verification email
            </Link>
          )}
        </div>

        {!isSuccess && status !== "verifying" && (
          <p className="mt-6 text-xs text-gray-400">
            Tip: Use the newest email — old links can expire or be invalidated when you request a new one.
          </p>
        )}
      </div>
    </main>
  );
}