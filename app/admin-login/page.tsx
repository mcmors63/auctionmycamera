"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function AdminLoginPage() {
  const router = useRouter();

  // Lock email to the real admin account
  const [email] = useState("admin@auctionmyplate.co.uk");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, go straight to /admin
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const user = await account.get();

        if (
          user.email === "admin@auctionmyplate.co.uk" &&
          localStorage.getItem("adminLoggedIn") === "true"
        ) {
          router.push("/admin");
        }
      } catch {
        // no active session, ignore
      }
    };

    checkExisting();
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
      await account.createEmailPasswordSession(email, password);

      const user = await account.get();

      // 3) Only allow the real admin through
      if (user.email !== "admin@auctionmyplate.co.uk") {
        await account.deleteSession("current");
        setError("This account is not authorised as admin.");
        setLoading(false);
        return;
      }

      // 4) Mark admin flag and go to /admin
      localStorage.setItem("adminLoggedIn", "true");
      router.push("/admin");
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError("Invalid admin credentials or session error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-yellow-600 mb-6">
          Admin Login
        </h1>

        {error && (
          <p className="text-red-600 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full border border-gray-300 rounded-md p-3 bg-gray-100 text-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Admin access is restricted to this email address.
            </p>
          </div>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-yellow-500 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-md transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
