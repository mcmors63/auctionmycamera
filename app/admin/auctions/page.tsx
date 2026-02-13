"use client";

import { useEffect, useState } from "react";
import { Client, Databases, Query } from "appwrite";
import Link from "next/link";

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

const AUCTIONS_DB = process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_DATABASE_ID!;
const AUCTIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_COLLECTION_ID!;

type AuctionWeek = {
  $id: string;
  week_key?: string;
  status?: "current" | "coming" | "past" | string;
  auction_start?: string | null; // ISO string
  auction_end?: string | null; // ISO string
};

function formatLondon(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
}

export default function AdminAuctionsPage() {
  const [currentWeek, setCurrentWeek] = useState<AuctionWeek | null>(null);
  const [nextWeek, setNextWeek] = useState<AuctionWeek | null>(null);
  const [pastWeeks, setPastWeeks] = useState<AuctionWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadWeeks = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!AUCTIONS_DB || !AUCTIONS_COLLECTION) {
          throw new Error(
            "Missing AUCTIONS env vars. Check NEXT_PUBLIC_APPWRITE_AUCTIONS_DATABASE_ID / NEXT_PUBLIC_APPWRITE_AUCTIONS_COLLECTION_ID."
          );
        }

        // CURRENT week
        const current = await databases.listDocuments(AUCTIONS_DB, AUCTIONS_COLLECTION, [
          Query.equal("status", "current"),
          Query.limit(1),
        ]);
        const currentDoc = (current.documents?.[0] as any) || null;

        // NEXT week
        const next = await databases.listDocuments(AUCTIONS_DB, AUCTIONS_COLLECTION, [
          Query.equal("status", "coming"),
          Query.limit(1),
        ]);
        const nextDoc = (next.documents?.[0] as any) || null;

        // PAST weeks
        const past = await databases.listDocuments(AUCTIONS_DB, AUCTIONS_COLLECTION, [
          Query.equal("status", "past"),
          Query.orderDesc("auction_end"),
          Query.limit(50),
        ]);

        if (cancelled) return;

        setCurrentWeek(currentDoc);
        setNextWeek(nextDoc);
        setPastWeeks((past.documents as any[]) || []);
      } catch (err: any) {
        console.error("Failed to load auction weeks:", err);
        if (!cancelled) setError(err?.message || "Failed to load auction weeks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWeeks();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-700 mb-4">Auction Week Manager</h1>

      <Link href="/admin" className="text-blue-600 underline mb-6 inline-block">
        ← Back to Admin Dashboard
      </Link>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {loading && <p>Loading auction weeks…</p>}

      {!loading && (
        <>
          {/* CURRENT WEEK */}
          {currentWeek ? (
            <div className="border rounded-lg p-4 mb-6 bg-yellow-50">
              <h2 className="text-xl font-bold text-yellow-800">Current Week</h2>
              <p>Week Key: {currentWeek.week_key || "—"}</p>
              <p>Start: {formatLondon(currentWeek.auction_start)}</p>
              <p>End: {formatLondon(currentWeek.auction_end)}</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 mb-6 bg-yellow-50">
              <h2 className="text-xl font-bold text-yellow-800">Current Week</h2>
              <p className="text-sm text-gray-700">No current week found.</p>
            </div>
          )}

          {/* NEXT WEEK */}
          {nextWeek ? (
            <div className="border rounded-lg p-4 mb-6 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-800">Next Week</h2>
              <p>Week Key: {nextWeek.week_key || "—"}</p>
              <p>Start: {formatLondon(nextWeek.auction_start)}</p>
              <p>End: {formatLondon(nextWeek.auction_end)}</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 mb-6 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-800">Next Week</h2>
              <p className="text-sm text-gray-700">No next week found.</p>
            </div>
          )}

          {/* PAST WEEKS */}
          <h2 className="text-xl font-bold mt-6 mb-3">Past Weeks</h2>

          {pastWeeks.length === 0 && <p>No past auction weeks.</p>}

          {pastWeeks.map((w) => (
            <div key={w.$id} className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p>
                <strong>Week:</strong> {w.week_key || "—"}
              </p>
              <p>
                <strong>Start:</strong> {formatLondon(w.auction_start)}
              </p>
              <p>
                <strong>End:</strong> {formatLondon(w.auction_end)}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
