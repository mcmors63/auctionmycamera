"use client";

import { useEffect, useState } from "react";
import { Client, Account } from "appwrite";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

type Status = "ready" | "success" | "error";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [status, setStatus] = useState<Status>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !secret) {
      setStatus("error");
      setMessage("Invalid or expired reset link.");
      return;
    }
    setStatus("ready");
    setMessage(null);
  }, [userId, secret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!userId || !secret) {
      setStatus("error");
      setMessage("Invalid or expired reset link.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await account.updateRecovery(userId, secret, password);
      setStatus("success");
      setMessage("Password reset successfully. You can now log in.");
    } catch (err) {
      console.error("Reset password error:", err);
      setStatus("error");
      setMessage("Reset failed. The link may be expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  const showForm = status === "ready";

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-sky-700/60 p-6">
        <h1 className="text-2xl font-extrabold text-sky-300 text-center mb-2">
          Reset Password
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Choose a new password for your AuctionMyCamera account.
        </p>

        {status === "error" && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-600 text-red-200 p-3 rounded-md mb-4 text-sm">
            <XCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-start gap-2 bg-green-900/30 border border-green-600 text-green-200 p-3 rounded-md mb-4 text-sm">
            <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-sky-300 mb-1 uppercase tracking-wide">
                New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-sky-300 mb-1 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            {message && status === "ready" && (
              <div className="text-xs bg-red-900/20 border border-red-700 text-red-200 rounded-md px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-black font-semibold py-2.5 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        {status === "success" && (
          <button
            onClick={() => router.push("/login")}
            className="mt-4 w-full bg-sky-500 hover:bg-sky-600 text-black font-semibold py-2.5 rounded-md text-sm"
          >
            Go to Login
          </button>
        )}

        {status === "error" && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => router.push("/forgot-password")}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-md text-sm"
            >
              Request new reset link
            </button>
            <div className="text-center">
              <Link href="/login" className="text-xs text-sky-300 hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}