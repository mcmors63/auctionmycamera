"use client";

import { useEffect, useMemo, useState } from "react";
import { Client, Account } from "appwrite";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

type Status = "ready" | "success" | "error";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = useMemo(() => searchParams.get("userId"), [searchParams]);
  const secret = useMemo(() => searchParams.get("secret"), [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [status, setStatus] = useState<Status>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validate URL params on load
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
    } catch {
      setStatus("error");
      setMessage("Reset failed. The link may be expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  const showForm = status === "ready";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Choose a new password for your AuctionMyCamera account.
        </p>

        {/* ERROR */}
        {status === "error" && (
          <div className="flex items-center bg-red-100 text-red-700 p-3 rounded-md mb-4 text-left">
            <XCircleIcon className="w-6 h-6 mr-2 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <div className="flex items-center bg-green-100 text-green-700 p-3 rounded-md mb-4 text-left">
            <CheckCircleIcon className="w-6 h-6 mr-2 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-sm font-medium" htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border w-full p-2 rounded-md mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="border w-full p-2 rounded-md mt-1"
              />
            </div>

            {message && status === "ready" && (
              <p className="text-sm text-red-600">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:hover:bg-slate-900 text-white font-bold py-2 rounded-md"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {status === "success" && (
          <button
            onClick={() => router.push("/login")}
            className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-md"
          >
            Go to Login
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/forgot-password")}
            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-md"
          >
            Request New Reset Link
          </button>
        )}
      </div>
    </div>
  );
}