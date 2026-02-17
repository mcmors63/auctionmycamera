"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

// ✅ Single source of truth for admin email
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

export default function AdminLoginClient() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, go straight to /admin
  useEffect(() => {
    let alive = true;

    const checkExisting = async () => {
      try {
        const user: any = await account.get();
        const email = String(user?.email || "").toLowerCase();

        if (alive && email === ADMIN_EMAIL) {
          router.replace("/admin");
        }
      } catch {
        // no active session, ignore
      }
    };

    checkExisting();

    return () => {
      alive = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Kill any existing session (seller or whoever)
      try {
        await account.deleteSession("current");
      } catch {
        // ignore if there was no session
      }

      // 2) Create fresh session with admin credentials
      await account.createEmailPasswordSession(ADMIN_EMAIL, password);

      const user: any = await account.get();
      const email = String(user?.email || "").toLowerCase();

      // 3) Only allow the real admin through
      if (email !== ADMIN_EMAIL) {
        await account.deleteSession("current");
        setError("This account is not authorised as admin.");
        return;
      }

      router.replace("/admin");
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError("Invalid admin credentials or session error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-neutral-200">
        <h1 className="text-2xl font-bold text-center text-orange-600 mb-6">
          Admin Login
        </h1>

        {error && (
          <p className="text-red-600 text-sm mb-3 text-center">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={ADMIN_EMAIL}
              readOnly
              className="w-full border border-neutral-300 rounded-md p-3 bg-neutral-100 text-neutral-700"
            />
            <p className="text-xs text-neutral-500 mt-1 text-center">
              Admin access is restricted to this email address.
            </p>
          </div>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-neutral-300 rounded-md p-3 focus:ring-2 focus:ring-orange-500 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-md transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}