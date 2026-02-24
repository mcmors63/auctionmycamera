"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

function normalizeBaseUrl(input: string) {
  return (input || "").trim().replace(/\/+$/, "");
}

function getBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
  if (explicit) return explicit;
  if (typeof window !== "undefined") return normalizeBaseUrl(window.location.origin);
  return "http://localhost:3000";
}

export default function ResendVerificationPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeEmail, setActiveEmail] = useState<string>("");

  // Check whether we have an active session (required for createVerification)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const me: any = await account.get();
        if (cancelled) return;
        setIsLoggedIn(true);
        setActiveEmail(String(me?.email || ""));
      } catch {
        if (cancelled) return;
        setIsLoggedIn(false);
        setActiveEmail("");
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!isLoggedIn) {
      setError("You must be logged in to resend a verification email.");
      return;
    }

    try {
      setLoading(true);

      const base = getBaseUrl();
      const verifyUrl = `${base}/verified`;

      await account.createVerification(verifyUrl);

      setMessage("Verification email sent. Please check your inbox (and spam).");
    } catch (err: any) {
      console.error("Resend verification error:", err);

      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("rate") || msg.includes("too many")) {
        setError("Too many requests — please wait a few minutes and try again.");
      } else {
        setError("Failed to resend verification. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-sky-700/60 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-sky-300 mb-2">
          Resend Verification Email
        </h1>

        {checkingSession ? (
          <p className="text-sm text-gray-300">Checking your session…</p>
        ) : (
          <>
            {isLoggedIn ? (
              <p className="text-xs text-gray-400 mb-4">
                You’re logged in{activeEmail ? ` as ${activeEmail}` : ""}. We’ll resend the verification email
                to your account email address.
              </p>
            ) : (
              <div className="mb-4 rounded-md border border-amber-700 bg-amber-900/20 px-3 py-3 text-xs text-amber-100">
                You’re not logged in. Appwrite only lets us resend verification for the signed-in user.
                <div className="mt-2 flex justify-center gap-2">
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md bg-sky-500 hover:bg-sky-600 text-black font-semibold text-xs"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-2 rounded-md border border-sky-500 text-sky-200 hover:bg-sky-900/30 font-semibold text-xs"
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-3 text-xs bg-red-900/30 border border-red-600 text-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-3 text-xs bg-green-900/30 border border-green-600 text-green-200 rounded-md px-3 py-2">
                {message}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-3">
              <button
                type="submit"
                disabled={loading || checkingSession || !isLoggedIn}
                className="w-full bg-sky-500 hover:bg-sky-600 text-black font-semibold py-3 rounded-md transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Resend verification email"}
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-400">
              <Link href="/login" className="text-sky-300 hover:underline">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}