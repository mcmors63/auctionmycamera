"use client";

import { useEffect, useState } from "react";
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

export default function LiveAuctionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // ✅ Fetch all live plates
  const fetchLiveListings = async () => {
    setRefreshing(true);
    try {
      const res = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        "plates",
        [Query.equal("status", "live")]
      );
      setListings(res.documents);
    } catch (error) {
      console.error("Error fetching live listings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveListings();
  }, []);

  // ✅ Real-time updates
  useEffect(() => {
    const unsubscribe = client.subscribe(
      [
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.plates.documents`,
      ],
      (response: any) => {
        if (response.events.includes("databases.*.collections.*.documents.*.update")) {
          const updatedDoc = response.payload;

          if (updatedDoc.status === "live") {
            setListings((prev) =>
              prev.map((item) => (item.$id === updatedDoc.$id ? updatedDoc : item))
            );

            // 🎉 Toasts for new bids
            if (response.payload?.current_bid && response.payload?.registration) {
              toast.success(
                `💰 New highest bid on ${response.payload.registration}: £${response.payload.current_bid.toLocaleString()}`,
                { icon: "⚡" }
              );
            }

            // ⏰ Toast if auction extended (soft close)
            const endTime = new Date(response.payload.auction_end).getTime();
            const now = new Date().getTime();
            const diff = endTime - now;
            if (diff > 7 * 24 * 60 * 60 * 1000) {
              toast(`⏰ Auction for ${response.payload.registration} was extended!`, {
                icon: "🕒",
              });
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ Countdown timer
  const Countdown = ({ end }: { end: string }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
      const updateTimer = () => {
        const now = new Date().getTime();
        const endTime = new Date(end).getTime();
        const diff = endTime - now;

        if (diff <= 0) {
          setTimeLeft("Auction Ended");
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [end]);

    return <span>{timeLeft}</span>;
  };

  // ✅ Handle placing a bid
  const handleBid = async (plateId: string, bidAmount: number) => {
    if (!user) {
      toast.error("You must be logged in to bid.");
      router.push("/login");
      return;
    }

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    try {
      setBidding(plateId);
      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId,
          bidAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to place bid.");
      } else {
        toast.success(`✅ Bid accepted at £${bidAmount.toLocaleString()}`);
      }
    } catch (err) {
      console.error("Bid error:", err);
      toast.error("Error placing bid.");
    } finally {
      setBidding(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center bg-yellow-50">
        <p className="text-gray-600 text-lg">Loading live auctions...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-yellow-50 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-600">Live Auction</h1>
          <button
            onClick={fetchLiveListings}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {listings.length === 0 ? (
          <p className="text-gray-600 text-center py-10">
            No live auctions at the moment.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((plate) => (
              <div
                key={plate.$id}
                className="border rounded-xl p-5 bg-white shadow hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    {plate.registration}
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">
                    Current Bid:{" "}
                    <span className="font-semibold text-yellow-700">
                      £{plate.current_bid || 0}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Reserve: £{plate.reserve_price || "N/A"}
                  </p>
                  <p className="text-sm mb-3">
                    Ends in:{" "}
                    <span className="font-semibold text-red-600">
                      <Countdown end={plate.auction_end} />
                    </span>
                  </p>
                </div>

                {/* ✅ Only show bidding box to logged-in users */}
                {user ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const amount = parseFloat(
                        (e.currentTarget.elements.namedItem("bid") as HTMLInputElement)
                          .value
                      );
                      handleBid(plate.$id, amount);
                      e.currentTarget.reset();
                    }}
                    className="mt-4 flex flex-col"
                  >
                    <input
                      name="bid"
                      type="number"
                      step="0.01"
                      placeholder="Enter your bid (£)"
                      className="border rounded-md px-3 py-2 mb-2"
                    />
                    <button
                      type="submit"
                      disabled={bidding === plate.$id}
                      className={`w-full bg-yellow-600 text-white font-semibold py-2 rounded-md hover:bg-yellow-700 transition ${
                        bidding === plate.$id ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {bidding === plate.$id ? "Placing..." : "Place Bid"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-center text-gray-500 mt-3">
                    Log in to bid on this plate.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
