// app/place_bid/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Client, Databases, Account } from "appwrite";
import Link from "next/link";
import Image from "next/image";
import NumberPlate from "@/components/ui/NumberPlate";
import DvlaPlate from "./DvlaPlate";

// ----------------------------------------------------
// Constants
// ----------------------------------------------------
const DVLA_FEE_GBP = 80; // £80 paperwork fee
const VEHICLE_NOTICE_KEY_PREFIX = "amp_vehicle_warning_accepted_";

// ✅ The ONLY two legacy listings where the buyer still pays £80 on top
const LEGACY_BUYER_PAYS_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

function buyerPaysTransferFeeForListing(listingId: string | undefined | null) {
  if (!listingId) return false;
  return LEGACY_BUYER_PAYS_IDS.has(listingId);
}

// ----------------------------------------------------
// Appwrite
// ----------------------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const db = new Databases(client);
const account = new Account(client);

const PLATES_DB = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const PLATES_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------
type Listing = {
  $id: string;
  registration?: string;
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

  // ✅ JWT used to authenticate server routes that require auth
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [checkingPaymentMethod, setCheckingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const [vehicleNoticeAccepted, setVehicleNoticeAccepted] = useState(false);

  const nextUrl = listingId ? `/place_bid?id=${encodeURIComponent(listingId)}` : "/current-listings";
  const paymentMethodHref = `/payment-method?next=${encodeURIComponent(nextUrl)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;

  // ----------------------------------------------------
  // LOGIN CHECK (Appwrite session)
  // ----------------------------------------------------
  useEffect(() => {
    const checkLogin = async () => {
      try {
        await account.get();
        setLoggedIn(true);

        // Create a short-lived JWT for server routes that must be authenticated
        const jwt = await account.createJWT();
        setJwtToken(jwt.jwt);
      } catch {
        setLoggedIn(false);
        setJwtToken(null);

        // Clear stale keys if you had them before
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("amp_user_email");
          window.localStorage.removeItem("amp_user_id");
        }
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
        if (!res.ok) throw new Error(data.error || "Could not verify your payment method.");

        setHasPaymentMethod(Boolean((data as any).hasPaymentMethod));
      } catch (err: any) {
        console.error("has-payment-method error:", err);
        const msg = err?.message || "Could not verify your payment method.";

        // If Stripe isn't configured, don't hard-block UI here (but server will still enforce on bid).
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
    if (!listingId) {
      setError("Missing listing ID.");
      setLoading(false);
      return;
    }

    db.getDocument(PLATES_DB, PLATES_COLLECTION, listingId)
      .then((doc) => setListing(doc as Listing))
      .catch(() => setError("Listing not found."))
      .finally(() => setLoading(false));
  }, [listingId]);

  // ----------------------------------------------------
  // PER-PLATE DVLA NOTICE STATE
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!listing?.$id) return;

    const key = `${VEHICLE_NOTICE_KEY_PREFIX}${listing.$id}`;
    const stored = window.localStorage.getItem(key);
    setVehicleNoticeAccepted(stored === "true");
  }, [listing?.$id]);

  // ----------------------------------------------------
  // EARLY RETURNS
  // ----------------------------------------------------
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-lg text-gray-200">Loading listing…</p>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-red-400 text-xl">Listing not found.</p>
      </div>
    );

  // ----------------------------------------------------
  // CALCULATIONS
  // ----------------------------------------------------
  const buyerPaysTransferFee = buyerPaysTransferFeeForListing(listing.$id);
  const dvlaFeeChargedToBuyer = buyerPaysTransferFee ? DVLA_FEE_GBP : 0;

  const effectiveBaseBid =
    listing.current_bid != null ? listing.current_bid : listing.starting_price ?? 0;

  const bidIncrement = getBidIncrement(effectiveBaseBid);
  const minimumAllowed = effectiveBaseBid + bidIncrement;

  const bidsCount = listing.bids ?? 0;

  const hasReserve = typeof listing.reserve_price === "number" && listing.reserve_price > 0;
  const reserveMet = hasReserve && effectiveBaseBid >= (listing.reserve_price as number);

  const rawBuyNow =
    (listing.buy_now as number | null | undefined) ??
    (listing.buy_now_price as number | null | undefined) ??
    null;

  const buyNowPrice = typeof rawBuyNow === "number" && rawBuyNow > 0 ? rawBuyNow : null;

  const isLiveStatus = listing.status === "live";
  const isComingStatus = listing.status === "queued";
  const isSoldStatus = listing.status === "sold";

  const displayId = listing.listing_id || `AMP-${listing.$id.slice(-6).toUpperCase()}`;

  const auctionStart = listing.auction_start ?? listing.start_time ?? null;
  const auctionEnd = listing.auction_end ?? listing.end_time ?? null;

  const auctionEndMs = auctionEnd ? Date.parse(auctionEnd) : null;
  const auctionEndedTime =
    auctionEndMs !== null && Number.isFinite(auctionEndMs) ? auctionEndMs <= Date.now() : false;

  const auctionEnded = auctionEndedTime || isSoldStatus;

  const isSoldForDisplay = isSoldStatus || (auctionEnded && reserveMet);

  const canBidOrBuyNow = isLiveStatus && !auctionEnded;

  const canShowBuyNow = buyNowPrice !== null && canBidOrBuyNow && effectiveBaseBid < buyNowPrice;

  let timerLabel: string;
  if (auctionEnded) timerLabel = "AUCTION ENDED";
  else if (isLiveStatus) timerLabel = "AUCTION ENDS IN";
  else timerLabel = "AUCTION STARTS IN";

  const timerStatus: TimerStatus =
    auctionEnded ? "ended" : isLiveStatus ? "live" : isComingStatus ? "queued" : "ended";

  const paymentBlocked =
    loggedIn && !checkingPaymentMethod && hasPaymentMethod === false && !paymentMethodError;

  // ----------------------------------------------------
  // HANDLE BID
  // ----------------------------------------------------
  const handleBid = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !jwtToken) {
      // UX: push them to login and return them here
      router.push(loginHref);
      return;
    }

    if (!vehicleNoticeAccepted) {
      setError("Please confirm you have read the DVLA notice before placing a bid.");
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
      setError(`Minimum bid is £${minimumAllowed.toLocaleString()}`);
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
        // Clean UX routing for the two main auth/gate cases:
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
  // HANDLE BUY NOW (left as-is, already uses jwtToken + redirects if paymentBlocked)
  // ----------------------------------------------------
  const handleBuyNow = async () => {
    setError(null);
    setSuccess(null);

    if (!loggedIn || !jwtToken) {
      router.push(loginHref);
      return;
    }

    if (!vehicleNoticeAccepted) {
      setError("Please confirm you have read the DVLA notice before using Buy Now.");
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

    const regLabel = listing.registration || displayId;

    const confirmMessage = buyerPaysTransferFee
      ? `Are you sure you want to use Buy Now and purchase ${regLabel} for £${buyNowPrice.toLocaleString()}?\n\nAn £${DVLA_FEE_GBP.toFixed(
          2
        )} DVLA paperwork fee will be added.\nThis will end the auction immediately and commit you to the purchase.`
      : `Are you sure you want to use Buy Now and purchase ${regLabel} for £${buyNowPrice.toLocaleString()}?\n\nNo additional DVLA paperwork fee will be added at checkout (transfer handling is covered seller-side).\nThis will end the auction immediately and commit you to the purchase.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setSubmitting(true);

      const totalToCharge = buyNowPrice + dvlaFeeChargedToBuyer;
      const amountInPence = Math.round(totalToCharge * 100);

      const stripeRes = await fetch("/api/stripe/charge-off-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          amountInPence,
          description: buyerPaysTransferFee
            ? `Buy Now - ${regLabel} (incl. £${DVLA_FEE_GBP} DVLA fee)`
            : `Buy Now - ${regLabel} (DVLA transfer handled seller-side)`,
          metadata: {
            listingId: listing.$id,
            type: "buy_now",
            buyerPaysTransferFee: buyerPaysTransferFee ? "true" : "false",
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
          totalCharged: totalToCharge,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data.error || "Could not complete Buy Now.");

      if (data.updatedListing) setListing(data.updatedListing);

      setSuccess(
        "Buy Now successful. Your card has been charged and this listing is now sold. We’ll contact you to complete the transfer."
      );
    } catch (err: any) {
      console.error("Buy Now error:", err);
      setError(err.message || "Buy Now failed.");
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
        <Link
          href="/current-listings"
          className="text-sm text-[#FFD500] underline hover:text-yellow-300"
        >
          ← Back to listings
        </Link>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
          <Image
            src="/car-rear.jpg"
            alt={`Rear of car with registration ${listing.registration || ""}`}
            width={1600}
            height={1067}
            className="w-full h-auto block"
            priority
          />

          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "29%" }}>
            <div style={{ transform: "scale(0.42)", transformOrigin: "center bottom" }}>
              <NumberPlate reg={listing.registration || ""} size="large" variant="rear" showBlueBand />
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-between text-sm text-gray-300">
          <span>Listing ID: {displayId}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl border border-yellow-700 shadow-lg p-6 sm:p-8 space-y-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#FFD500]">
              {listing?.registration || "Registration"}
            </h1>
            <p className="text-xs text-gray-400">Auction ID: {listing?.listing_id || listing?.$id}</p>
          </div>

          <div className="w-full sm:w-72 flex justify-end">
            <DvlaPlate registration={listing?.registration || ""} size="large" variant="rear" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {isSoldForDisplay && (
            <span className="px-4 py-1 bg-red-700 text-white rounded-full font-bold text-sm">SOLD</span>
          )}

          {!isSoldForDisplay && canBidOrBuyNow && (
            <span className="px-4 py-1 bg-[#FFD500] border border-black rounded-full font-bold text-sm text-black">
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
          <p className="text-xs text-gray-400 uppercase">Listing ID</p>
          <p className="font-bold text-lg text-gray-100">{displayId}</p>

          <h2 className={`text-4xl font-extrabold mt-4 ${isSoldForDisplay ? "text-red-400" : "text-green-400"}`}>
            £{effectiveBaseBid.toLocaleString()}
          </h2>
          <p className="text-gray-300">{isSoldForDisplay ? "Winning bid" : "Current Bid"}</p>

          <p className="mt-4 font-semibold text-lg text-gray-100">
            {bidsCount} {bidsCount === 1 ? "Bid" : "Bids"}
          </p>

          {reserveMet && <p className="mt-2 font-bold text-green-400">Reserve Met</p>}

          {canShowBuyNow && (
            <p className="mt-2 text-sm font-semibold text-blue-300">
              Buy Now available: £{buyNowPrice!.toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase">{timerLabel}</p>
          <div className="inline-block mt-1 px-3 py-2 bg-black border border-yellow-600 rounded-lg shadow-sm font-semibold text-[#FFD500]">
            <LocalAuctionTimer start={auctionStart} end={auctionEnd} status={timerStatus} />
          </div>
        </div>

        <div className="bg-[#181818] border border-gray-700 rounded-xl p-6 shadow-sm space-y-4">
          {buyerPaysTransferFee ? (
            <p className="text-sm text-gray-200">
              This listing is in the legacy format: an additional <strong>£80.00</strong> DVLA paperwork fee will be added
              to the winning bid / Buy Now price for transfer handling.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-200">
                Transfer handling is included seller-side for this listing — there is <strong>no additional £80 fee</strong> added
                at checkout for the buyer.
              </p>
              <p className="text-xs text-gray-400">
                Two plates listed earlier remain on the legacy “buyer pays £80” format. This listing is not one of them.
              </p>
            </div>
          )}

          <div className="mt-3 border border-yellow-500 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-900">
            <p className="font-semibold">Important notice</p>
            <p className="mt-1">
              Please be advised that this plate must go onto a vehicle which is <strong>taxed</strong> and holds a{" "}
              <strong>current MOT (if required)</strong>. Once the plate is transferred onto a vehicle, the registered keeper
              will become the legal owner and can then request a retention certificate.
            </p>

            {loggedIn && !vehicleNoticeAccepted && (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={vehicleNoticeAccepted}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setVehicleNoticeAccepted(checked);

                    if (typeof window !== "undefined" && listing?.$id) {
                      const key = `${VEHICLE_NOTICE_KEY_PREFIX}${listing.$id}`;
                      window.localStorage.setItem(key, checked ? "true" : "false");
                    }
                  }}
                />
                <span className="text-gray-900">I understand and accept this notice.</span>
              </label>
            )}

            {loggedIn && vehicleNoticeAccepted && (
              <p className="mt-2 text-xs text-green-700 font-semibold">
                Notice accepted for this plate. You won&apos;t be asked again when bidding on this plate from this device.
              </p>
            )}
          </div>

          {loggedIn && (
            <div className="space-y-2 mt-2">
              {checkingPaymentMethod && <p className="text-xs text-gray-400">Checking your saved payment method…</p>}

              {paymentMethodError && (
                <p className="bg-red-900 text-red-100 border border-red-500 p-2 rounded text-xs">
                  {paymentMethodError}
                </p>
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
            <div className="mt-4 border border-yellow-600 bg-black rounded-lg p-4 space-y-3">
              <p className="font-semibold text-[#FFD500]">Log in to bid</p>
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
              {error && <p className="bg-red-950 text-red-100 border border-red-700 p-3 rounded">{error}</p>}
              {success && <p className="bg-green-950 text-green-100 border border-green-700 p-3 rounded">{success}</p>}

              <p className="text-sm text-gray-200">
                Minimum bid: <strong>£{minimumAllowed.toLocaleString()}</strong>
              </p>

              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minimumAllowed}
                placeholder={`£${minimumAllowed.toLocaleString()}`}
                className="w-full border border-yellow-600 rounded-lg p-3 text-lg text-center bg-black text-gray-100"
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

                {canShowBuyNow && (
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
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-600 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {canBidOrBuyNow
                      ? submitting
                        ? "Processing Buy Now…"
                        : checkingPaymentMethod
                        ? "Checking Payment…"
                        : buyerPaysTransferFee
                        ? `Buy Now £${buyNowPrice!.toLocaleString()} + £${DVLA_FEE_GBP}`
                        : `Buy Now £${buyNowPrice!.toLocaleString()}`
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
          <h3 className="text-lg font-bold mb-2 text-[#FFD500]">Description</h3>
          <div className="border border-gray-700 rounded-lg p-4 bg-[#111111] text-sm text-gray-200 whitespace-pre-line">
            {listing.description || "No description has been added yet."}
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold mb-2 text-[#FFD500]">History &amp; interesting facts</h3>
          <div className="border border-gray-700 rounded-lg p-3 bg-[#111111] text-sm text-gray-200 whitespace-pre-line">
            {listing.interesting_fact || "No extra details have been added yet."}
          </div>
        </div>
      </div>
    </div>
  );
}