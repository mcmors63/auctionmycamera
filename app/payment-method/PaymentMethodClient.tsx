"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

// -----------------------------
// Appwrite client (browser)
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function PaymentMethodClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  // -----------------------------
  // Require login (NO admin redirect)
  // -----------------------------
  useEffect(() => {
    const run = async () => {
      try {
        const me: any = await account.get();
        if (!me?.$id) {
          router.push("/login");
          return;
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router]);

  async function openStripeManageCard() {
    setError("");
    setOpening(true);

    try {
      const jwt = await account.createJWT();
      const token = (jwt as any)?.jwt || "";

      if (!token) {
        setError("Could not create auth token. Please log out and log in again.");
        setOpening(false);
        return;
      }

      // Try a few common endpoints (depends how your repo is wired)
      const candidates = [
        "/api/stripe/billing-portal",
        "/api/stripe/portal",
        "/api/stripe/setup-card",
      ];

      let lastErr = "";

      for (const path of candidates) {
        const res = await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });

        // If route doesn't exist, try next
        if (res.status === 404) continue;

        const data = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          lastErr = data?.error || `Request failed (${res.status})`;
          continue;
        }

        const url = String(data?.url || "").trim();
        if (!url) {
          lastErr = "Stripe route did not return a URL.";
          continue;
        }

        // Redirect user to Stripe-hosted management page
        window.location.href = url;
        return;
      }

      setError(
        lastErr ||
          "No card-management route was found. Expected one of: /api/stripe/billing-portal, /api/stripe/portal, /api/stripe/setup-card."
      );
    } catch (e: any) {
      setError(e?.message || "Failed to open card management.");
    } finally {
      setOpening(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
        <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <p className="text-sm text-neutral-300">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="max-w-2xl mx-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h1 className="text-2xl font-bold text-sky-300">Manage payment method</h1>
        <p className="mt-2 text-sm text-neutral-300">
          Update your saved card for bidding and future payments. You’ll be sent to a secure Stripe page.
        </p>

        {error ? (
          <div className="mt-4 rounded-md border border-rose-700/70 bg-rose-900/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openStripeManageCard}
            disabled={opening}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2 rounded-md text-sm disabled:opacity-60"
          >
            {opening ? "Opening…" : "Open Stripe card management"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="bg-neutral-950/60 hover:bg-neutral-950 text-neutral-100 font-semibold px-5 py-2 rounded-md text-sm border border-neutral-800"
          >
            Back to dashboard
          </button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-400">
          If you still get redirected to Admin Login after this change, the redirect is coming from middleware/route guards
          — not this page.
        </p>
      </div>
    </main>
  );
}