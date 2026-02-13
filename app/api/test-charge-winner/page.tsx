// app/admin/test-charge-winner/page.tsx
"use client";

import { useState } from "react";

export default function TestChargeWinnerPage() {
  const [listingId, setListingId] = useState("AMP-TEST-123");
  const [winnerEmail, setWinnerEmail] = useState("");
  const [amountPounds, setAmountPounds] = useState(500); // £500 default
  const [dvlaFeeIncluded, setDvlaFeeIncluded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/stripe/charge-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listingId || undefined,
          winnerEmail: winnerEmail.trim(),
          amountInPence: Math.round(Number(amountPounds) * 100), // £ → pence
          dvlaFeeIncluded,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold mb-1">
            Test: Charge Winner (Stripe)
          </h1>
          <p className="text-sm text-slate-600">
            Dev-only tool to call <code>/api/stripe/charge-winner</code>. Use a Stripe
            test customer who already has a saved card.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Listing ID (optional)
            </label>
            <input
              type="text"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="AMP-1234-ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Winner Email (must exist in Stripe)
            </label>
            <input
              type="email"
              value={winnerEmail}
              onChange={(e) => setWinnerEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="test-buyer@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Final Bid Amount (£)
            </label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={amountPounds}
              onChange={(e) => setAmountPounds(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              DVLA fee (£80) will be added on top unless you tick “Fee already included”.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dvlaFeeIncluded}
              onChange={(e) => setDvlaFeeIncluded(e.target.checked)}
            />
            <span>DVLA fee already included in amount</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black text-white py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Charging…" : "Charge Winner (TEST)"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <div className="font-semibold mb-1">Success</div>
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
