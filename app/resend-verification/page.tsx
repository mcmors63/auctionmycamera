"use client";

import { useState } from "react";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) return setError("Enter your email.");

    try {
      setLoading(true);

      const verifyUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/verified`;

      await account.createVerification(verifyUrl);

      setMessage("Verification email has been sent.");
    } catch (err: any) {
      setError("Failed to resend verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Resend Verification Email</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {message && <p className="text-green-600 mb-4">{message}</p>}

        <form onSubmit={handleResend} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border w-full rounded-md p-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md"
          >
            {loading ? "Sending..." : "Resend Email"}
          </button>
        </form>

        <a href="/login" className="mt-4 inline-block text-blue-600 underline">
          Back to Login
        </a>
      </div>
    </div>
  );
}
