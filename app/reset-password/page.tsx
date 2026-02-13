"use client";

import { useState, useEffect } from "react";
import { Client, Account } from "appwrite";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [status, setStatus] = useState<"ready" | "success" | "error">("ready");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get URL params
  useEffect(() => {
    const userId = searchParams.get("userId");
    const sec = searchParams.get("secret");

    if (!userId || !sec) {
      setStatus("error");
      setMessage("Invalid or expired reset link.");
      return;
    }

    setUid(userId);
    setSecret(sec);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      return setMessage("Password must be at least 8 characters.");
    }

    if (password !== confirm) {
      return setMessage("Passwords do not match.");
    }

    try {
      setLoading(true);

      await account.updateRecovery(uid!, secret!, password);
      setStatus("success");
      setMessage("Password reset successfully.");
    } catch (err: any) {
      setStatus("error");
      setMessage("Reset failed. The link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  const showForm = status === "ready";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>

        {/* ERROR */}
        {status === "error" && (
          <div className="flex items-center bg-red-100 text-red-700 p-3 rounded-md mb-4">
            <XCircleIcon className="w-6 h-6 mr-2" />
            <span>{message}</span>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <div className="flex items-center bg-green-100 text-green-700 p-3 rounded-md mb-4">
            <CheckCircleIcon className="w-6 h-6 mr-2" />
            <span>{message}</span>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border w-full p-2 rounded-md mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="border w-full p-2 rounded-md mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-md"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {status === "success" && (
          <button
            onClick={() => router.push("/login")}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md"
          >
            Go to Login
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/forgot-password")}
            className="mt-4 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md"
          >
            Request New Reset Link
          </button>
        )}
      </div>
    </div>
  );
}
