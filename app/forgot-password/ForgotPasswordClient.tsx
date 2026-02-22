"use client";

import { useState } from "react";
import Link from "next/link";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setLoading(true);

      const site =
        normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "") ||
        "http://localhost:3000";

      const resetUrl = `${site}/reset-password`;

      await account.createRecovery(email, resetUrl);

      // ✅ Don’t reveal whether the email exists (good security practice)
      setMessage("If this email exists, a reset link has been sent. Check inbox/spam.");
      setEmail("");
    } catch {
      // ✅ Keep error vague (still secure)
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your account email and we’ll send you a reset link.
        </p>

        {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
        {message && <p className="text-green-700 mb-4 text-center">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border w-full rounded-md p-2 mt-1"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:hover:bg-slate-900 text-white font-semibold py-2 rounded-md"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-blue-700 underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}