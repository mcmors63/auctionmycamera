// app/place_bid/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Client, Databases, Account } from "appwrite";
import Link from "next/link";
import Image from "next/image";

// ----------------------------------------------------
// Appwrite
// ----------------------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const db = new Databases(client);
const account = new Account(client);

// ✅ Listings envs ONLY (no plates fallback)
const LISTINGS_DB =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID || // keep ONLY if you still have legacy envs locally
  "";

const LISTINGS_COLLECTION =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID || // keep ONLY if you still have legacy envs locally
  "";

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------
type Listing = {
  $id: string;

  item_title?: string | null;
  brand?: string | null;
  model?: string | null;

  gear_type?: string | null;
  era?: string | null;
  condition?: string | null;

  image_url?: string | null;

  listing_id?: string;
  status?: string;

  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  buy_now?: number | null;
  buy_now_price?: number | null;

  description?: string;
  interesting_fact?: string | null;
};

type TimerStatus = "queued" | "live" | "ended";

// ----------------------------------------------------
// SIMPLE LOCAL TIMER
// ----------------------------------------------------
function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function LocalAuctionTimer({
  start,
  end,
  status,
}: {
  start: string | null;
  end: string | null;
  status: TimerStatus;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  let targetStr: string | null = null;
  if (status === "queued") targetStr = start ?? null;
  else if (status === "live") targetStr = end ?? null;

  if (!targetStr) return <span className="font-mono text-sm">—</span>;

  const targetMs = Date.parse(targetStr);
  if (!Number.isFinite(targetMs)) return <span className="font-mono text-sm">—</span>;

  const diff = targetMs - now;
  return <span className="font-mono text-sm">{diff <= 0 ? "00:00:00" : formatRemaining(diff)}</span>;
}

// ----------------------------------------------------
// BID INCREMENTS
// ----------------------------------------------------
function getBidIncrement(current: number): number {
  if (current < 100) return 5;
  if (current < 500) return 10;
  if (current < 1000) return 25;
  if (current < 5000) return 50;
  if (current < 10000) return 100;
  if (current < 25000) return 250;
  if (current < 50000) return 500;
  return 1000;
}

function pickBuyNow(listing: Listing): number | null {
  const raw =
    (listing.buy_now_price as number | null | undefined) ??
    (listing.buy_now as number | null | undefined) ??
    null;
  return typeof raw === "number" && raw > 0 ? raw : null;
}

// ----------------------------------------------------
// PAGE
// ----------------------------------------------------
export default function PlaceBidPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get("id");

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [checkingPaymentMethod, setCheckingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  // simple notice (non-DVLA)
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const NOTICE_KEY_PREFIX = "amc_notice_accepted_";

  const nextUrl = listingId ? `/place_bid?id=${encodeURIComponent(listingId)}` : "/auctions";
  const paymentMethodHref = `/payment-method?next=${encodeURIComponent(nextUrl)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;

  // ----------------------------------------------------
  // LOGIN CHECK
  // ----------------------------------------------------
  useEffect(() => {
    const checkLogin = async () => {
      try {
        await account.get();
        setLoggedIn(true);
        const jwt = await account.createJWT();
        setJwtToken(jwt.jwt);
      } catch {
        setLoggedIn(false);
        setJwtToken(null);
      }
    };
    void checkLogin();
  }, []);

  // ----------------------------------------------------
  // STRIPE – CHECK SAVED PAYMENT METHOD (AUTH REQUIRED)
  // ----------------------------------------------------
  useEffect(() => {
    const checkPaymentMethod = async () => {
      if (!loggedIn || !jwtToken) {
        setHasPaymentMethod(null);
        return;
      }

      setCheckingPaymentMethod(true);
      setPaymentMethodError(null);

      try {
        const res = await fetch("/api/stripe/has-payment-method", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({}),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any).error || "Could not verify your payment method.");

        setHasPaymentMethod(Boolean((data as any).hasPaymentMethod));
      } catch (err: any) {
        const msg = err?.message || "Could not verify your payment method.";
        if (msg.includes("Stripe is not configured on the server")) {
          setPaymentMethodError(null);
          setHasPaymentMethod(null);
        } else {
          setPaymentMethodError(msg);
          setHasPaymentMethod(null);
        }
      } finally {
        setCheckingPaymentMethod(false);
      }
    };

    void checkPaymentMethod();
  }, [loggedIn, jwtToken]);

  // ----------------------------------------------------
  // LOAD LISTING
  // ----------------------------------------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setListing(null);

      if (!listingId) {
        setError("Missing listing ID in the URL (?id=...).");
        setLoading(false);
        return;
      }

      if (!LISTINGS_DB || !LISTINGS_COLLECTION) {
        setError(
          "Appwrite DB/Collection env vars are missing. Expected NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID."
        );
        setLoading(false);
        return;
      }

      try {
        const doc = await db.getDocument(LISTINGS_DB, LISTINGS_COLLECTION, listingId);
        setListing(doc as Listing);
      } catch (err: any) {
        const code = err?.code;
        const type = err?.type;
        const message = err?.message || String(err);

        if (code === 404) {
          setError(
            `Listing not found in Appwrite.\nTried DB="${LISTINGS_DB}" Collection="${LISTINGS_COLLECTION}" ID="${listingId}".\n(404)`
          );
        } else if (code === 401 || code === 403) {
          setError(
            `Permission/auth issue reading the listing.\nTried DB="${LISTINGS_DB}" Collection="${LISTINGS_COLLECTION}" ID="${listingId}".\n(${code}) ${type || ""} ${message || ""}`.trim()
          );
        } else {
          setError(
            `Could not load listing.\nTried DB="${LISTINGS_DB}" Collection="${LISTINGS_COLLECTION}" ID="${listingId}".\n(${code ?? "?"}) ${type || ""} ${message || ""}`.trim()
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  // ----------------------------------------------------
  // PER-LISTING NOTICE STATE
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!listing?.$id) return;
    const key = `${NOTICE_KEY_PREFIX}${listing.$id}`;
    setNoticeAccepted(window.localStorage.getItem(key) === "true");
  }, [listing?.$id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-lg text-gray-200">Loading listing…</p>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="max-w-2xl w-full">
          <p className="text-red-400 text-xl whitespace-pre-line">{error || "Listing not found."}</p>
          <div className="mt-6">
            <Link href="/auctions" className="text-sm text-[#d6b45f] underline">
              ← Back to auctions
            </Link>
          </div>
        </div>
      </div>
    );

  // ----------------------------------------------------
  // CALCULATIONS
  // ----------------------------------------------------
  const effectiveBaseBid =
    listing.current_bid != null ? listing.current_bid : listing.starting_price ?? 0;

  const bidIncrement = getBidIncrement(effectiveBaseBid);
  const minimumAllowed = effectiveBaseBid + bidIncrement;

  const bidsCount = listing.bids ?? 0;

  const hasReserve = typeof listing.reserve_price === "number" && listing.reserve_price > 0;
  const reserveMet = hasReserve && effectiveBaseBid >= (listing.reserve_price as number);

  const buyNowPrice = pickBuyNow(listing);

  const isLiveStatus = listing.status === "live";
  const isComingStatus = listing.status === "queued";
  const isSoldStatus = listing.status === "sold";

  const displayId = listing.listing_id || `AMC-${listing.$id.slice(-6).toUpperCase()}`;

  const auctionStart = listing.auction_start ?? listing.start_time ?? null;
  const auctionEnd = listing.auction_end ?? listing.end_time ?? null;

  const auctionEndMs = auctionEnd ? Date.parse(auctionEnd) : null;
  const auctionEndedTime =
    auctionEndMs !== null && Number.isFinite(auctionEndMs) ? auctionEndMs <= Date.now() : false;

  const auctionEnded = auctionEndedTime || isSoldStatus;
  const isSoldForDisplay = isSoldStatus || (auctionEnded && reserveMet);

  const canBidOrBuyNow = isLiveStatus && !auctionEnded;
  const canShowBuyNow =
    buyNowPrice !== null && canBidOrBuyNow && effectiveBaseBid < (buyNowPrice as number);

  const timerStatus: TimerStatus =
    auctionEnded ? "ended" : isLiveStatus ? "live" : isComingStatus ? "queued" : "ended";

  const paymentBlocked =
    loggedIn && !checkingPaymentMethod && hasPaymentMethod === false && !paymentMethodError;

  const title =
    (listing.item_title || "").trim() ||
    [listing.brand, listing.model].filter(Boolean).join(" ").trim() ||
    "Listing";

  const heroImg = (listing.image_url || "").trim() || "/hero/modern-lens.jpg";

  // ----------------------------------------------------
  // HANDLE BID
  // ----------------------------------------------------
  const handleBid = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !jwtToken) {
      router.push(loginHref);
      return;
    }

    if (!noticeAccepted) {
      setError("Please confirm you have read the notice before placing a bid.");
      return;
    }

    if (paymentBlocked) {
      router.push(paymentMethodHref);
      return;
    }

    if (!canBidOrBuyNow) {
      setError("Auction has already ended.");
      return;
    }

    const amount = parseFloat(bidAmount);
    if (!Number.isFinite(amount)) {
      setError("Enter a valid number.");
      return;
    }

    if (amount < minimumAllowed) {
      setError(`Minimum bid is £${minimumAllowed.toLocaleString("en-GB")}`);
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/place-bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          listingId: listing.$id,
          amount,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        if (res.status === 401) {
          router.push(loginHref);
          return;
        }

        if (res.status === 403 && data?.code === "no_payment_method") {
          router.push(paymentMethodHref);
          return;
        }

        throw new Error(data?.error || "Failed to place bid.");
      }

      if (data.updatedListing) setListing(data.updatedListing);
      setSuccess("Bid placed successfully!");
      setBidAmount("");
    } catch (err: any) {
      setError(err?.message || "Failed to place bid.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // HANDLE BUY NOW
  // ----------------------------------------------------
  const handleBuyNow = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !jwtToken) {
      router.push(loginHref);
      return;
    }

    if (!noticeAccepted) {
      setError("Please confirm you have read the notice before using Buy Now.");
      return;
    }

    if (paymentBlocked) {
      router.push(paymentMethodHref);
      return;
    }

    if (!canBidOrBuyNow || !canShowBuyNow) {
      setError("Buy Now is no longer available on this listing.");
      return;
    }

    if (!buyNowPrice) {
      setError("Buy Now is not available for this listing.");
      return;
    }

    if (!window.confirm(`Use Buy Now for £${buyNowPrice.toLocaleString("en-GB")}?\n\nThis ends the auction immediately.`))
      return;

    try {
      setSubmitting(true);

      const amountInPence = Math.round(buyNowPrice * 100);

      const stripeRes = await fetch("/api/stripe/charge-off-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          amountInPence,
          description: `Buy Now - ${title}`,
          metadata: {
            listingId: listing.$id,
            type: "buy_now",
          },
        }),
      });

      const stripeData = await stripeRes.json().catch(() => ({} as any));

      if (!stripeRes.ok || !stripeData.ok) {
        if (stripeData?.requiresPaymentMethod) setHasPaymentMethod(false);
        throw new Error(stripeData?.error || "Your card could not be charged.");
      }

      const paymentIntentId: string | undefined =
        stripeData.paymentIntentId || stripeData.paymentIntentID;

      const res = await fetch("/api/buy-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          listingId: listing.$id,
          paymentIntentId,
          totalCharged: buyNowPrice,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data.error || "Could not complete Buy Now.");

      if (data.updatedListing) setListing(data.updatedListing);

      setSuccess("Buy Now successful. Your card has been charged. We’ll contact you with next steps.");
    } catch (err: any) {
      setError(err?.message || "Buy Now failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto mb-4">
        <Link href="/auctions" className="text-sm text-[#d6b45f] underline hover:opacity-90">
          ← Back to auctions
        </Link>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black border border-white/10">
          <Image src={heroImg} alt={title} width={1600} height={900} className="w-full h-[280px] object-cover" priority />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute left-0 bottom-0 p-5">
            <p className="text-xs text-white/70">Listing ID: {displayId}</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-white">{title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl border border-white/10 shadow-lg p-6 sm:p-8 space-y-8">
        <div className="flex justify-end gap-2">
          {isSoldForDisplay && <span className="px-4 py-1 bg-red-700 text-white rounded-full font-bold text-sm">SOLD</span>}
          {!isSoldForDisplay && canBidOrBuyNow && (
            <span className="px-4 py-1 bg-[#d6b45f] border border-black rounded-full font-bold text-sm text-black">
              LIVE
            </span>
          )}
          {!isSoldForDisplay && isComingStatus && !auctionEnded && (
            <span className="px-4 py-1 bg-gray-700 text-gray-100 rounded-full font-bold text-sm">Queued</span>
          )}
          {!isSoldForDisplay && auctionEnded && (
            <span className="px-4 py-1 bg-gray-600 text-gray-100 rounded-full font-bold text-sm">ENDED</span>
          )}
        </div>

        <div>
          <h2 className={`text-4xl font-extrabold ${isSoldForDisplay ? "text-red-400" : "text-green-400"}`}>
            £{effectiveBaseBid.toLocaleString("en-GB")}
          </h2>
          <p className="text-gray-300">{isSoldForDisplay ? "Winning bid" : "Current Bid"}</p>

          <p className="mt-4 font-semibold text-lg text-gray-100">
            {bidsCount} {bidsCount === 1 ? "Bid" : "Bids"}
          </p>

          {reserveMet && <p className="mt-2 font-bold text-green-400">Reserve Met</p>}

          {canShowBuyNow && buyNowPrice !== null && (
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              Buy Now available: £{buyNowPrice.toLocaleString("en-GB")}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">
            {auctionEnded ? "AUCTION ENDED" : isLiveStatus ? "AUCTION ENDS IN" : "AUCTION STARTS IN"}
          </p>
          <div className="inline-block mt-1 px-3 py-2 bg-black border border-white/10 rounded-lg shadow-sm font-semibold text-[#d6b45f]">
            <LocalAuctionTimer start={auctionStart} end={auctionEnd} status={timerStatus} />
          </div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-xl p-6 shadow-sm space-y-4">
          <div className="border border-white/10 bg-white/5 rounded-lg p-3 text-sm text-white/85">
            <p className="font-semibold">Important notice</p>
            <p className="mt-1">Please check the listing details carefully before bidding. All bids are binding.</p>

            {loggedIn && (
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={noticeAccepted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNoticeAccepted(checked);
                    if (typeof window !== "undefined" && listing?.$id) {
                      const key = `${NOTICE_KEY_PREFIX}${listing.$id}`;
                      window.localStorage.setItem(key, checked ? "true" : "false");
                    }
                  }}
                />
                <span className="text-white/85">I understand and accept this notice.</span>
              </label>
            )}
          </div>

          {loggedIn && (
            <div className="space-y-2 mt-2">
              {checkingPaymentMethod && <p className="text-xs text-gray-400">Checking your saved payment method…</p>}

              {paymentMethodError && (
                <p className="bg-red-900 text-red-100 border border-red-500 p-2 rounded text-xs">{paymentMethodError}</p>
              )}

              {hasPaymentMethod === false && !checkingPaymentMethod && !paymentMethodError && (
                <div className="bg-yellow-900 text-yellow-50 border border-yellow-600 p-3 rounded text-xs">
                  <p className="font-semibold">Action needed</p>
                  <p className="mt-1">Before you can bid or use Buy Now, you must add a payment method.</p>
                  <Link href={paymentMethodHref} className="mt-2 inline-block text-xs font-semibold text-yellow-200 underline">
                    Add / manage payment method
                  </Link>
                </div>
              )}
            </div>
          )}

          {!loggedIn ? (
            <div className="mt-4 border border-white/10 bg-black rounded-lg p-4 space-y-3">
              <p className="font-semibold text-[#d6b45f]">Log in to bid</p>
              <p className="text-sm text-gray-200">You need an account to place bids and use Buy Now.</p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link href={loginHref} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
                  Login
                </Link>
                <Link href="/register" className="px-5 py-2 rounded-lg border border-blue-400 text-blue-200 hover:bg-blue-950 font-semibold text-sm">
                  Register
                </Link>
              </div>
            </div>
          ) : auctionEnded ? (
            <div className="mt-4 border border-red-700 bg-red-950 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-100">
                {isSoldForDisplay ? "This listing has been sold." : "Auction has already ended."}
              </p>
              <p className="text-sm text-red-200">No further bids or Buy Now purchases can be made on this listing.</p>
            </div>
          ) : (
            <>
              {error && <p className="bg-red-950 text-red-100 border border-red-700 p-3 rounded whitespace-pre-line">{error}</p>}
              {success && <p className="bg-green-950 text-green-100 border border-green-700 p-3 rounded">{success}</p>}

              <p className="text-sm text-gray-200">
                Minimum bid: <strong>£{minimumAllowed.toLocaleString("en-GB")}</strong>
              </p>

              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minimumAllowed}
                placeholder={`£${minimumAllowed.toLocaleString("en-GB")}`}
                className="w-full border border-white/10 rounded-lg p-3 text-lg text-center bg-black text-gray-100"
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button
                  onClick={() => {
                    if (paymentBlocked) {
                      router.push(paymentMethodHref);
                      return;
                    }
                    void handleBid();
                  }}
                  disabled={!canBidOrBuyNow || submitting || checkingPaymentMethod}
                  className={`flex-1 rounded-lg py-3 text-lg font-semibold text-white ${
                    canBidOrBuyNow && !checkingPaymentMethod ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed"
                  }`}
                >
                  {canBidOrBuyNow
                    ? submitting
                      ? "Processing…"
                      : checkingPaymentMethod
                      ? "Checking Payment…"
                      : "Place Bid"
                    : "Auction Not Live"}
                </button>

                {canShowBuyNow && buyNowPrice !== null && (
                  <button
                    onClick={() => {
                      if (paymentBlocked) {
                        router.push(paymentMethodHref);
                        return;
                      }
                      void handleBuyNow();
                    }}
                    disabled={!canBidOrBuyNow || submitting || checkingPaymentMethod}
                    className={`flex-1 rounded-lg py-3 text-lg font-semibold ${
                      canBidOrBuyNow && !checkingPaymentMethod
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-gray-600 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {canBidOrBuyNow
                      ? submitting
                        ? "Processing Buy Now…"
                        : checkingPaymentMethod
                        ? "Checking Payment…"
                        : `Buy Now £${buyNowPrice.toLocaleString("en-GB")}`
                      : "Buy Now Unavailable"}
                  </button>
                )}
              </div>

              <div className="mt-3">
                <Link href={paymentMethodHref} className="text-xs text-blue-300 underline">
                  Manage payment method
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 mb-10 space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-2 text-[#d6b45f]">Description</h3>
          <div className="border border-white/10 rounded-lg p-4 bg-[#111111] text-sm text-gray-200 whitespace-pre-line">
            {listing.description || "No description has been added yet."}
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold mb-2 text-[#d6b45f]">History &amp; interesting facts</h3>
          <div className="border border-white/10 rounded-lg p-3 bg-[#111111] text-sm text-gray-200 whitespace-pre-line">
            {listing.interesting_fact || "No extra details have been added yet."}
          </div>
        </div>
      </div>
    </div>
  );
}