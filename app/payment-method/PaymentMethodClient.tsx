// app/payment-method/PaymentMethodClient.tsx
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Client, Account } from "appwrite";

// -----------------------------
// ENV / Appwrite client / Stripe
// -----------------------------
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(appwriteClient);

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// -----------------------------
// TYPES
// -----------------------------
type UserInfo = {
  id: string;
  email: string;
  name?: string;
};

type PaymentMethodSummary = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  isDefault: boolean;
};

// -----------------------------
// Inner form component
// -----------------------------
function PaymentMethodForm({
  user,
  authToken,
  nextHref,
}: {
  user: UserInfo;
  authToken: string;
  nextHref: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummary[]>([]);

  const fetchPaymentMethods = async () => {
    try {
      setMethodsLoading(true);
      setMethodsError(null);

      const res = await fetch("/api/stripe/list-payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load saved cards.");

      setPaymentMethods(data.paymentMethods || []);
    } catch (err: any) {
      console.error("list-payment-methods error:", err);
      setMethodsError(err?.message || "We couldn't load your saved cards. Please try again.");
      setPaymentMethods([]);
    } finally {
      setMethodsLoading(false);
    }
  };

  useEffect(() => {
    const createSetupIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/stripe/create-setup-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({}),
        });

        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(data.error || "Failed to create setup intent");
        if (!data.clientSecret) throw new Error("No clientSecret returned from server.");

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error("SetupIntent error:", err);
        setError("We couldn't start the card setup process. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    void createSetupIntent();
  }, [authToken]);

  useEffect(() => {
    void fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!stripe || !elements) {
      setError("Payment system not ready. Please wait a moment and try again.");
      return;
    }

    if (!clientSecret) {
      setError("Missing setup intent client secret. Please refresh the page.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card element not found.");
      return;
    }

    try {
      setSaving(true);

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            email: user.email,
            name: user.name || undefined,
          },
        },
      });

      if (result.error) {
        setError(result.error.message || result.error.code || "Card could not be saved.");
        return;
      }

      if (!result.setupIntent || result.setupIntent.status !== "succeeded") {
        setError(`Card not saved. Status: ${result.setupIntent?.status || "unknown"}.`);
        return;
      }

      setSuccess("Card saved successfully. You can now place bids and use Buy Now.");

      await fetchPaymentMethods();

      setTimeout(() => router.push(nextHref), 800);
    } catch (err: any) {
      console.error("Save card error:", err);
      setError(err.message || "Something went wrong saving your card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-300 rounded-xl shadow-sm p-6 space-y-4">
      <h1 className="text-xl font-bold">Payment Methods</h1>

      <p className="text-sm text-gray-700">
        We securely store your card with Stripe. Your card will only be charged if you win an auction or use Buy Now.
      </p>

      <div className="mt-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Your saved cards</h2>

        {methodsLoading ? (
          <p className="text-xs text-gray-600">Loading saved cards…</p>
        ) : methodsError ? (
          <p className="text-xs text-red-600">{methodsError}</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-xs text-gray-600">You don&apos;t have any cards saved yet. Add one below.</p>
        ) : (
          <ul className="space-y-1 text-xs text-gray-700">
            {paymentMethods.map((pm) => (
              <li
                key={pm.id}
                className="flex justify-between items-center border border-gray-200 rounded-md px-2 py-1 bg-white"
              >
                <div>
                  <span className="font-semibold">{pm.brand ? pm.brand.toUpperCase() : "Card"}</span> ••••{" "}
                  {pm.last4 || "????"}
                  {pm.exp_month && pm.exp_year && (
                    <span className="ml-2 text-gray-500">
                      (expires {pm.exp_month}/{pm.exp_year})
                    </span>
                  )}
                </div>
                {pm.isDefault && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                    DEFAULT
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="bg-red-50 text-red-700 border border-red-200 p-3 rounded text-sm">{error}</p>}
      {success && <p className="bg-green-50 text-green-700 border border-green-200 p-3 rounded text-sm">{success}</p>}

      {loading ? (
        <p className="text-sm text-gray-600">Preparing secure payment form…</p>
      ) : !clientSecret ? (
        <p className="text-sm text-red-600">We couldn&apos;t start the card setup process.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-gray-300 rounded-md px-3 py-2 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#111827",
                    "::placeholder": { color: "#9CA3AF" as any },
                  },
                },
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !stripe || !elements}
            className="w-full rounded-lg bg-black text-white font-semibold py-2.5 text-sm disabled:opacity-60"
          >
            {saving ? "Saving card…" : "Save card"}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-gray-200 mt-4 flex justify-between">
        <Link href={nextHref} className="text-xs text-gray-500 hover:text-gray-800">
          ← Back
        </Link>
        <p className="text-[11px] text-gray-400">Powered by Stripe. We don’t store your full card details.</p>
      </div>
    </div>
  );
}

// -----------------------------
// PAGE WRAPPER (CLIENT)
// -----------------------------
export default function PaymentMethodClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const nextHref = typeof next === "string" && next.startsWith("/") ? next : "/current-listings";

  const [user, setUser] = useState<UserInfo | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        setLoginError(null);

        const current = await account.get();
        const jwt = await account.createJWT();

        setUser({ id: current.$id, email: current.email, name: current.name });
        setAuthToken(jwt.jwt);
      } catch (err) {
        console.error("Payment method auth failed:", err);
        setUser(null);
        setAuthToken(null);
        setLoginError("You must be logged in to add a payment method.");
      } finally {
        setLoadingUser(false);
      }
    };

    void loadUser();
  }, []);

  if (!stripePublishableKey) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-red-200 rounded-xl shadow-sm p-6 space-y-3">
          <h1 className="text-lg font-bold text-red-700">Stripe publishable key not configured</h1>
          <p className="text-sm text-gray-700">
            Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in your environment variables to use this page.
          </p>
        </div>
      </main>
    );
  }

  if (!stripePromise) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-red-200 rounded-xl shadow-sm p-6 space-y-3">
          <h1 className="text-lg font-bold text-red-700">Stripe is not available</h1>
          <p className="text-sm text-gray-700">Stripe could not be initialised. Please check your configuration.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-8">
      {loadingUser ? (
        <p className="text-sm text-gray-600">Checking your account…</p>
      ) : loginError || !user || !authToken ? (
        <div className="max-w-md mx-auto bg-white border border-yellow-300 rounded-xl shadow-sm p-6 space-y-3">
          <p className="text-sm text-yellow-800">{loginError}</p>
          <div className="flex gap-3 mt-2">
            <Link href="/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 text-sm font-semibold"
            >
              Register
            </Link>
          </div>
        </div>
      ) : (
        <Elements stripe={stripePromise} options={{}}>
          <PaymentMethodForm user={user} authToken={authToken} nextHref={nextHref} />
        </Elements>
      )}
    </main>
  );
}