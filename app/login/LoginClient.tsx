"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Client, Account } from "appwrite";

// -----------------------------
// Appwrite browser client
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

// -----------------------------
// Turnstile types
// -----------------------------
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------
  // Existing session detection
  // ---------------------------------
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeEmail, setActiveEmail] = useState<string>("");

  // ---------------------------------
  // Simple local lockout state
  // ---------------------------------
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // ✅ Use AMC keys so cloned projects don’t share lockouts
  const ATTEMPTS_KEY = "amc_login_attempts";
  const LOCK_KEY = "amc_login_locked_until";

  // ---------------------------------
  // Turnstile state
  // ---------------------------------
  const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
  const canUseTurnstile = !!TURNSTILE_SITE_KEY;

  const turnstileElRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileError, setTurnstileError] = useState<string>("");

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileError("");
    try {
      if (typeof window !== "undefined" && window.turnstile) {
        if (turnstileWidgetIdRef.current) window.turnstile.reset(turnstileWidgetIdRef.current);
        else window.turnstile.reset();
      }
    } catch {
      // ignore
    }
  };

  // Detect active session (prevents the “session active” error & gives proper UX)
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const me: any = await account.get();
        if (cancelled) return;

        if (me?.email) {
          setHasActiveSession(true);
          setActiveEmail(String(me.email));
        } else {
          setHasActiveSession(false);
          setActiveEmail("");
        }
      } catch {
        if (cancelled) return;
        setHasActiveSession(false);
        setActiveEmail("");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogoutCurrent = async () => {
    setError(null);
    try {
      await account.deleteSession("current");
    } catch {
      // ignore
    } finally {
      setHasActiveSession(false);
      setActiveEmail("");
      resetTurnstile();
    }
  };

  // Render Turnstile widget once script is ready
  useEffect(() => {
    if (!canUseTurnstile) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let tries = 0;

    const tryRender = () => {
      if (cancelled) return;
      if (!turnstileElRef.current) return;

      if (!window.turnstile) {
        tries += 1;
        if (tries < 60) setTimeout(tryRender, 100); // up to ~6s
        return;
      }

      // already rendered
      if (turnstileWidgetIdRef.current) return;

      try {
        const widgetId = window.turnstile.render(turnstileElRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => {
            setTurnstileToken(token || "");
            setTurnstileError("");
          },
          "expired-callback": () => {
            setTurnstileToken("");
            setTurnstileError("Spam check expired — please try again.");
          },
          "error-callback": () => {
            setTurnstileToken("");
            setTurnstileError("Spam check failed to load — please refresh and try again.");
          },
        });

        turnstileWidgetIdRef.current = widgetId;
      } catch {
        setTurnstileError("Spam check failed to initialise — please refresh and try again.");
      }
    };

    tryRender();

    return () => {
      cancelled = true;
      try {
        if (window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        }
      } catch {
        // ignore
      } finally {
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [canUseTurnstile, TURNSTILE_SITE_KEY]);

  const verifyTurnstile = async () => {
    if (!canUseTurnstile) return true; // if not configured, don’t block
    if (!turnstileToken) {
      setTurnstileError("Please complete the spam check.");
      return false;
    }

    try {
      const res = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setTurnstileError(data?.error || "Spam check failed — please try again.");
        resetTurnstile();
        return false;
      }

      setTurnstileError("");
      return true;
    } catch {
      setTurnstileError("Spam check failed — please try again.");
      resetTurnstile();
      return false;
    }
  };

  // Load attempts / lock state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAttempts = window.localStorage.getItem(ATTEMPTS_KEY);
    const storedLockedUntil = window.localStorage.getItem(LOCK_KEY);

    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10) || 0);
    }

    if (storedLockedUntil) {
      const ts = parseInt(storedLockedUntil, 10);
      if (!Number.isNaN(ts) && ts > Date.now()) {
        setLockedUntil(ts);
      } else {
        window.localStorage.removeItem(LOCK_KEY);
      }
    }
  }, []);

  const persistAttempts = (count: number, lockTs: number | null) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(ATTEMPTS_KEY, String(count));
    setAttempts(count);

    if (lockTs) {
      window.localStorage.setItem(LOCK_KEY, String(lockTs));
      setLockedUntil(lockTs);
    } else {
      window.localStorage.removeItem(LOCK_KEY);
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
      setError("Too many failed attempts. Login from this device is locked for 15 minutes.");
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
      setError("Login is currently locked due to repeated failed attempts. Please try again later.");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    // ✅ Turnstile gate BEFORE attempting Appwrite login
    const okHuman = await verifyTurnstile();
    if (!okHuman) return;

    try {
      setSubmitting(true);

      // ✅ If a session exists, clear it first so Appwrite doesn't throw
      try {
        await account.deleteSession("current");
      } catch {
        // ignore
      }

      await account.createEmailPasswordSession(email, password);

      // ✅ Success: clear attempts + reset turnstile + redirect
      resetAttempts();
      resetTurnstile();
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);

      resetTurnstile();

      const msg =
        err?.message?.toLowerCase?.() ?? err?.toString?.().toLowerCase?.() ?? "";

      if (msg.includes("invalid credentials") || msg.includes("invalid email")) {
        recordFailedAttempt();
      } else if (msg.includes("email not verified")) {
        setError("Your email is not verified yet. Please check your inbox for the verification link.");
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
      {/* Turnstile script (only if configured) */}
      {canUseTurnstile ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
        />
      ) : null}

      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-sky-700/60 p-6">
        <h1 className="text-2xl font-extrabold text-sky-300 mb-1">Login</h1>
        <p className="text-xs text-gray-400 mb-4">
          Enter your email and password to access your dashboard.
        </p>

        {error && (
          <div className="mb-3 text-xs bg-red-900/30 border border-red-600 text-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {lockoutMessage() && (
          <div className="mb-3 text-[11px] bg-amber-900/30 border border-amber-700 text-amber-200 rounded-md px-3 py-2">
            {lockoutMessage()}
          </div>
        )}

        {/* If already logged in, show clear options */}
        {hasActiveSession ? (
          <div className="mb-4 rounded-md border border-sky-700/50 bg-sky-900/20 px-3 py-3 text-xs text-sky-100">
            <p className="font-semibold">
              You’re already logged in{activeEmail ? ` as ${activeEmail}` : ""}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="px-3 py-2 rounded-md bg-sky-500 hover:bg-sky-600 text-black font-semibold text-xs"
              >
                Go to dashboard
              </button>
              <button
                type="button"
                onClick={handleLogoutCurrent}
                className="px-3 py-2 rounded-md border border-sky-500 text-sky-200 hover:bg-sky-900/30 font-semibold text-xs"
              >
                Log out and use a different account
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-sky-300 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-sky-300 mb-1 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-neutral-700 rounded-md px-3 py-2 text-sm bg-black text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-gray-400">
            {/* ✅ Correct entry point for password recovery */}
            <Link href="/forgot-password" className="text-sky-300 hover:underline">
              Forgot your password?
            </Link>
            {attempts > 0 && attempts < 3 && <span>Failed attempts: {attempts} / 3</span>}
          </div>

          {/* TURNSTILE WIDGET */}
          {canUseTurnstile ? (
            <div className="mt-2">
              <div ref={turnstileElRef} className="min-h-[65px] flex items-center justify-center" />
              {turnstileError ? (
                <p className="text-xs text-red-300 mt-2 text-center">{turnstileError}</p>
              ) : null}
              {!turnstileToken && !turnstileError ? (
                <p className="text-[11px] text-gray-400 mt-2 text-center">
                  Please complete the spam check to log in.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Spam check not configured yet (NEXT_PUBLIC_TURNSTILE_SITE_KEY missing).
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || isLocked() || (canUseTurnstile && !turnstileToken)}
            className="w-full mt-1 bg-sky-500 hover:bg-sky-600 text-black font-semibold py-2.5 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-sky-300 hover:underline font-semibold">
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}