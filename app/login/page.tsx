// app/login/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Client, Account } from "appwrite";

// -----------------------------
// Appwrite browser client
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------
  // Simple local lockout state
  // ---------------------------------
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Load attempts / lock state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAttempts = window.localStorage.getItem("amp_login_attempts");
    const storedLockedUntil = window.localStorage.getItem(
      "amp_login_locked_until"
    );

    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10) || 0);
    }

    if (storedLockedUntil) {
      const ts = parseInt(storedLockedUntil, 10);
      if (!Number.isNaN(ts) && ts > Date.now()) {
        setLockedUntil(ts);
      } else {
        // lock expired – clear it
        window.localStorage.removeItem("amp_login_locked_until");
      }
    }
  }, []);

  const persistAttempts = (count: number, lockTs: number | null) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("amp_login_attempts", String(count));
    setAttempts(count);

    if (lockTs) {
      window.localStorage.setItem("amp_login_locked_until", String(lockTs));
      setLockedUntil(lockTs);
    } else {
      window.localStorage.removeItem("amp_login_locked_until");
      setLockedUntil(null);
    }
  };

  const resetAttempts = () => {
    persistAttempts(0, null);
  };

  const recordFailedAttempt = () => {
    const next = attempts + 1;

    if (next >= 3) {
      const lockMs = 15 * 60 * 1000; // 15 minutes
      const until = Date.now() + lockMs;
      persistAttempts(next, until);
      setError(
        "Too many failed attempts. Login from this device is locked for 15 minutes."
      );
    } else {
      persistAttempts(next, null);
      setError("Incorrect email or password.");
    }
  };

  const isLocked = () => {
    if (!lockedUntil) return false;
    return lockedUntil > Date.now();
  };

  const lockoutMessage = () => {
    if (!lockedUntil) return null;
    const remainingMs = lockedUntil - Date.now();
    if (remainingMs <= 0) return null;

    const remainingMin = Math.ceil(remainingMs / 60000);
    return `Login is locked on this device for about ${remainingMin} minute${
      remainingMin === 1 ? "" : "s"
    }.`;
  };

  // ---------------------------------
  // FORM SUBMIT
  // ---------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLocked()) {
      setError(
        "Login is currently locked due to repeated failed attempts. Please try again later."
      );
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ Correct for Appwrite v11+
      await account.createEmailPasswordSession(email, password);

      // ✅ Success: clear attempts and redirect
      resetAttempts();
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);

      const msg =
        err?.message?.toLowerCase?.() ?? err?.toString?.().toLowerCase() ?? "";

      if (msg.includes("invalid credentials") || msg.includes("invalid email")) {
        recordFailedAttempt();
      } else if (msg.includes("email not verified")) {
        setError(
          "Your email is not verified yet. Please check your inbox for the verification link."
        );
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------
  // RENDER
  // ---------------------------------
  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-yellow-700/60 p-6">
        <h1 className="text-2xl font-extrabold text-yellow-400 mb-1">
          Login
        </h1>
        <p className="text-xs text-gray-400 mb-4">
          Enter your email and password to access your dashboard.
        </p>

        {error && (
          <div className="mb-3 text-xs bg-red-900/30 border border-red-600 text-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {lockoutMessage() && (
          <div className="mb-3 text-[11px] bg-yellow-900/30 border border-yellow-600 text-yellow-200 rounded-md px-3 py-2">
            {lockoutMessage()}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-yellow-400 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-yellow-400 mb-1 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {/* Forgot password link */}
          <div className="flex justify-between items-center text-[11px] text-gray-400">
            <Link
              href="/reset-password"
              className="text-yellow-400 hover:underline"
            >
              Forgot your password?
            </Link>
            {attempts > 0 && attempts < 3 && (
              <span>Failed attempts: {attempts} / 3</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || isLocked()}
            className="w-full mt-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2.5 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-yellow-400 hover:underline font-semibold"
          >
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}
