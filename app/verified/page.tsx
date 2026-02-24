// app/verified/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function VerifiedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = (searchParams.get("status") || "").toLowerCase();
  const isSuccess = status === "success";
  const isError = status === "error";

  const title = isSuccess ? "Email verified" : "Verification failed";
  const message = isSuccess
    ? "Your email has been verified successfully. You can now log in and sell/bid."
    : "Verification failed or expired. Please request a new verification email and try again.";

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 py-10 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] shadow-lg rounded-2xl border border-yellow-700/60 p-8 text-center">
        {isSuccess ? (
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        )}

        <h1 className="text-xl font-bold mb-2 text-yellow-400">{title}</h1>
        <p className="text-gray-200 mb-6">{message}</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-md"
          >
            Go to Login
          </button>

          {!isSuccess && (
            <Link
              href="/resend-verification"
              className="block w-full border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10 font-semibold py-2 rounded-md"
            >
              Resend verification email
            </Link>
          )}
        </div>

        {/* If someone lands here without a status param */}
        {!isSuccess && !isError && (
          <p className="mt-6 text-xs text-gray-400">
            Tip: This page is normally reached from the verification link. If you need a new link, use “Resend verification email”.
          </p>
        )}
      </div>
    </main>
  );
}