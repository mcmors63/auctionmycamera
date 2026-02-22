// app/admin/auctions/AdminAuctionsClient.tsx
"use client";

import { useEffect, useState } from "react";
import { Client, Databases, Query, Account } from "appwrite";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);
const account = new Account(client);

// ✅ Single source of truth for admin email
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

// Auctions DB/Collection
const AUCTIONS_DB = (process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_DATABASE_ID || "").trim();
const AUCTIONS_COLLECTION = (process.env.NEXT_PUBLIC_APPWRITE_AUCTIONS_COLLECTION_ID || "").trim();

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

export default function AdminAuctionsClient() {
  const router = useRouter();

  const [authState, setAuthState] = useState<"checking" | "yes">("checking");
  const [signedInEmail, setSignedInEmail] = useState<string>("");

  const [currentWeek, setCurrentWeek] = useState<AuctionWeek | null>(null);
  const [nextWeek, setNextWeek] = useState<AuctionWeek | null>(null);
  const [pastWeeks, setPastWeeks] = useState<AuctionWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------
  // VERIFY ADMIN LOGIN (same pattern as AdminClient)
  // ------------------------------------------------------
  useEffect(() => {
    let alive = true;

    const verify = async () => {
      try {
        const user: any = await account.get();
        const email = String(user?.email || "").toLowerCase();

        if (alive) setSignedInEmail(email);

        if (email === ADMIN_EMAIL) {
          if (alive) setAuthState("yes");
        } else {
          router.replace("/admin-login");
        }
      } catch {
        router.replace("/admin-login");
      }
    };

    verify();
    return () => {
      alive = false;
    };
  }, [router]);

  // ------------------------------------------------------
  // LOAD AUCTION WEEKS (admin-only)
  // ------------------------------------------------------
  useEffect(() => {
    if (authState !== "yes") return;

    let cancelled = false;

    const loadWeeks = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!AUCTIONS_DB || !AUCTIONS_COLLECTION) {
          throw new Error(
            "Missing AUCTIONS env vars. Set NEXT_PUBLIC_APPWRITE_AUCTIONS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_AUCTIONS_COLLECTION_ID."
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
  }, [authState]);

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  if (authState === "checking") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm text-sm text-neutral-600">
          Checking admin session…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-yellow-200 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-yellow-800">Auction Week Manager</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Signed in as <span className="font-semibold">{signedInEmail || ADMIN_EMAIL}</span>
          </p>
        </div>

        <Link href="/admin" className="text-blue-600 underline text-sm">
          ← Back to Admin Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {loading && <p className="text-neutral-700">Loading auction weeks…</p>}

      {!loading && (
        <>
          {/* CURRENT WEEK */}
          <div className="border rounded-xl p-4 mb-6 bg-yellow-50">
            <h2 className="text-xl font-bold text-yellow-900 mb-2">Current Week</h2>
            {currentWeek ? (
              <>
                <p>
                  <span className="font-semibold">Week Key:</span> {currentWeek.week_key || "—"}
                </p>
                <p>
                  <span className="font-semibold">Start:</span> {formatLondon(currentWeek.auction_start)}
                </p>
                <p>
                  <span className="font-semibold">End:</span> {formatLondon(currentWeek.auction_end)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-700">No current week found.</p>
            )}
          </div>

          {/* NEXT WEEK */}
          <div className="border rounded-xl p-4 mb-6 bg-blue-50">
            <h2 className="text-xl font-bold text-blue-900 mb-2">Next Week</h2>
            {nextWeek ? (
              <>
                <p>
                  <span className="font-semibold">Week Key:</span> {nextWeek.week_key || "—"}
                </p>
                <p>
                  <span className="font-semibold">Start:</span> {formatLondon(nextWeek.auction_start)}
                </p>
                <p>
                  <span className="font-semibold">End:</span> {formatLondon(nextWeek.auction_end)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-700">No next week found.</p>
            )}
          </div>

          {/* PAST WEEKS */}
          <h2 className="text-xl font-bold mt-8 mb-3 text-neutral-900">Past Weeks</h2>

          {pastWeeks.length === 0 ? (
            <p className="text-neutral-700">No past auction weeks.</p>
          ) : (
            <div className="space-y-3">
              {pastWeeks.map((w) => (
                <div key={w.$id} className="border rounded-xl p-4 bg-gray-50">
                  <p>
                    <span className="font-semibold">Week:</span> {w.week_key || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Start:</span> {formatLondon(w.auction_start)}
                  </p>
                  <p>
                    <span className="font-semibold">End:</span> {formatLondon(w.auction_end)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}