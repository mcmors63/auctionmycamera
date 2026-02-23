"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Client, Account, Databases, Query } from "appwrite";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

// ✅ Appwrite setup
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ----------
// ENV (centralised so we don’t repeat and don’t accidentally typo)
// ----------
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID!;

type AnyDoc = Record<string, any>;

function formatMoneyGBP(value: any) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function getDocTitle(doc: AnyDoc) {
  // Camera-friendly fallbacks, while keeping plates working
  // Prefer title, else registration, else something stable
  return (
    String(doc.title || "").trim() ||
    String(doc.registration || "").trim() ||
    String(doc.slug || "").trim() ||
    "Listing"
  );
}

function getDocCurrentBid(doc: AnyDoc) {
  // Support both naming styles
  return Number(
    doc.current_bid ??
      doc.currentBid ??
      doc.currentBidAmount ??
      doc.highestBid ??
      0
  );
}

function getDocReserve(doc: AnyDoc) {
  // Support both naming styles
  const v = doc.reserve_price ?? doc.reservePrice ?? doc.reserve ?? null;
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function getDocEnd(doc: AnyDoc) {
  // Support both naming styles
  return (
    doc.auction_end ??
    doc.auctionEnd ??
    doc.endsAt ??
    doc.endTime ??
    doc.end ??
    ""
  );
}

function getDocStatus(doc: AnyDoc) {
  return String(doc.status || "");
}

function isUpdateEvent(events: string[] | undefined) {
  if (!events || !Array.isArray(events)) return false;
  return events.some((e) => typeof e === "string" && e.endsWith(".update"));
}

function toMillis(dateish: any) {
  const t = new Date(dateish).getTime();
  return Number.isFinite(t) ? t : NaN;
}

// ✅ Countdown timer (kept as a component, still inside file but stable)
function Countdown({ end }: { end: string }) {
  const [timeLeft, setTimeLeft] = useState("—");

  useEffect(() => {
    let cancelled = false;

    const updateTimer = () => {
      const now = Date.now();
      const endTime = toMillis(end);

      if (!Number.isFinite(endTime)) {
        if (!cancelled) setTimeLeft("—");
        return;
      }

      const diff = endTime - now;

      if (diff <= 0) {
        if (!cancelled) setTimeLeft("Auction Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      if (!cancelled) setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [end]);

  return <span>{timeLeft}</span>;
}

export default function LiveAuctionPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Track previous auction end times to detect genuine extensions
  const prevEndByIdRef = useRef<Record<string, number>>({});

  // ✅ Load logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const current = await account.get();
        setUser(current);
      } catch {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const fetchLiveListings = async () => {
    setRefreshing(true);
    try {
      const res = await databases.listDocuments(DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", "live"),
      ]);

      setListings(res.documents);

      // Seed our previous-end map so “extended” doesn’t fire on initial load
      const nextMap: Record<string, number> = {};
      for (const doc of res.documents as AnyDoc[]) {
        const end = getDocEnd(doc);
        const ms = toMillis(end);
        if (Number.isFinite(ms)) nextMap[String(doc.$id)] = ms;
      }
      prevEndByIdRef.current = nextMap;
    } catch (error) {
      console.error("Error fetching live listings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Real-time updates
  useEffect(() => {
    // ✅ Subscribe using actual IDs (not a hardcoded 'listings' string)
    const channel = `databases.${DB_ID}.collections.${LISTINGS_COLLECTION_ID}.documents`;

    const unsubscribe = client.subscribe([channel], (response: any) => {
      try {
        if (!isUpdateEvent(response?.events)) return;

        const updatedDoc: AnyDoc = response?.payload || {};
        if (!updatedDoc?.$id) return;

        // Only care about live docs
        if (getDocStatus(updatedDoc) !== "live") return;

        // Update listing in state
        setListings((prev) =>
          prev.map((item) => (item.$id === updatedDoc.$id ? updatedDoc : item))
        );

        // 🎉 Toasts for new bids (only if it looks like a bid update)
        const title = getDocTitle(updatedDoc);
        const currentBid = getDocCurrentBid(updatedDoc);
        if (Number.isFinite(currentBid) && currentBid > 0) {
          toast.success(`💰 New highest bid on ${title}: £${formatMoneyGBP(currentBid)}`, {
            icon: "⚡",
          });
        }

        // ⏰ Toast if auction end increased (genuine extension)
        const newEndMs = toMillis(getDocEnd(updatedDoc));
        if (Number.isFinite(newEndMs)) {
          const id = String(updatedDoc.$id);
          const prevEndMs = prevEndByIdRef.current[id];

          // If we had a previous end time and it increased by at least 30 seconds, call it an extension
          if (Number.isFinite(prevEndMs) && newEndMs > prevEndMs + 30_000) {
            toast(`⏰ Auction extended for ${title}`, { icon: "🕒" });
          }

          prevEndByIdRef.current[id] = newEndMs;
        }
      } catch (e) {
        console.error("Realtime handling error:", e);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleBid = async (listingId: string, bidAmount: number) => {
    if (!user) {
      toast.error("You must be logged in to bid.");
      router.push("/login");
      return;
    }

    const rounded = Math.round(Number(bidAmount));
    if (!rounded || !Number.isFinite(rounded) || rounded <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    try {
      setBidding(listingId);

      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: listingId, // keep API contract unchanged for now
          bidAmount: rounded,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to place bid.");
      } else {
        toast.success(`✅ Bid accepted at £${formatMoneyGBP(rounded)}`);
      }
    } catch (err) {
      console.error("Bid error:", err);
      toast.error("Error placing bid.");
    } finally {
      setBidding(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-zinc-50">
        <p className="text-zinc-600 text-lg">Loading live auctions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6 gap-3">
          <h1 className="text-3xl font-bold text-zinc-900">Live Auctions</h1>

          <button
            onClick={fetchLiveListings}
            disabled={refreshing}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-lg text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {listings.length === 0 ? (
          <p className="text-zinc-600 text-center py-10">
            No live auctions at the moment.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((doc) => {
              const title = getDocTitle(doc);
              const currentBid = getDocCurrentBid(doc);
              const reserve = getDocReserve(doc);
              const end = String(getDocEnd(doc) || "");

              return (
                <div
                  key={doc.$id}
                  className="border rounded-xl p-5 bg-white shadow hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-xl font-bold mb-2 text-zinc-900">
                      {title}
                    </h2>

                    <p className="text-sm text-zinc-600 mb-1">
                      Current Bid:{" "}
                      <span className="font-semibold text-zinc-900">
                        £{formatMoneyGBP(currentBid)}
                      </span>
                    </p>

                    <p className="text-sm text-zinc-600 mb-1">
                      Reserve:{" "}
                      <span className="font-semibold text-zinc-900">
                        {reserve === null || !Number.isFinite(reserve)
                          ? "N/A"
                          : `£${formatMoneyGBP(reserve)}`}
                      </span>
                    </p>

                    <p className="text-sm mb-3 text-zinc-600">
                      Ends in:{" "}
                      <span className="font-semibold text-red-600">
                        {end ? <Countdown end={end} /> : "—"}
                      </span>
                    </p>
                  </div>

                  {user ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const el = e.currentTarget.elements.namedItem(
                          "bid"
                        ) as HTMLInputElement | null;

                        const amount = el ? Number(el.value) : NaN;
                        handleBid(String(doc.$id), amount);
                        e.currentTarget.reset();
                      }}
                      className="mt-4 flex flex-col"
                    >
                      <input
                        name="bid"
                        type="number"
                        step="1"
                        min="1"
                        inputMode="numeric"
                        placeholder="Enter your bid (£)"
                        className="border rounded-md px-3 py-2 mb-2"
                      />
                      <button
                        type="submit"
                        disabled={bidding === doc.$id}
                        className={`w-full bg-zinc-900 text-white font-semibold py-2 rounded-md hover:bg-zinc-800 transition ${
                          bidding === doc.$id ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {bidding === doc.$id ? "Placing..." : "Place Bid"}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-center text-zinc-500 mt-3">
                      Log in to bid.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}