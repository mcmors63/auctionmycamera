"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Client, Databases } from "appwrite";
import AuctionTimer from "../../current-listings/AuctionTimer";
import NumberPlate from "@/components/ui/NumberPlate";

// -----------------------------
// Appwrite client (browser)
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

// -----------------------------
// Types
// -----------------------------
export type Listing = {
  $id: string;
  registration?: string;
  listing_id?: string;
  description?: string;
  image_url?: string;
  status?: string;
  auction_start?: string | null;
  auction_end?: string | null;

  // NOTE: your admin UI uses buy_now, this page uses buy_now_price.
  // We support both to avoid "missing" BIN in UI/SEO.
  buy_now_price?: number | null;
  buy_now?: number | null;

  current_bid?: number | null;
  starting_price?: number | null;
  reserve_price?: number | null;
  reserve_met?: boolean;
  plate_type?: string;
  certificate?: boolean;
  expiry_date?: string | null;
  bids?: number | string | null;
  sold_via?: "auction" | "buy_now" | null;
  interesting_fact?: string | null;
  [key: string]: any;
};

// -----------------------------
// Helpers
// -----------------------------
function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRegDisplay(reg?: string) {
  return String(reg || "").trim().toUpperCase();
}

export default function ListingDetailsClient({ initial }: { initial: Listing }) {
  const [listing, setListing] = useState<Listing | null>(initial ?? null);

  // 🔥 IMPORTANT: never let a failed client refresh replace valid server HTML
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const [outbidPopup, setOutbidPopup] = useState<null | {
    oldBid: number;
    newBid: number;
  }>(null);

  const [softClosePopup, setSoftClosePopup] = useState<null | {
    oldEnd: string;
    newEnd: string;
  }>(null);

  // Keep a ref to the latest listing so realtime callbacks compare correctly
  const listingRef = useRef<Listing | null>(initial ?? null);
  useEffect(() => {
    listingRef.current = listing;
  }, [listing]);

  // Optional: client re-fetch (best-effort only)
  useEffect(() => {
    if (!initial?.$id) return;

    let cancelled = false;

    async function refreshOnce() {
      try {
        setRefreshNote(null);

        const doc = await databases.getDocument(
          DATABASE_ID,
          LISTINGS_COLLECTION_ID,
          initial.$id
        );

        if (!cancelled) setListing(doc as Listing);
      } catch (err) {
        // ✅ Keep existing content; do NOT show "Listing not found" just because public read is blocked
        console.warn("[listing] Client refresh failed (keeping SSR content):", err);
        if (!cancelled) {
          setRefreshNote(
            "Live updates may be limited on this page (displayed details are still valid)."
          );
        }
      }
    }

    // Refresh once shortly after hydration (helps if SSR was cached briefly)
    const t = setTimeout(refreshOnce, 600);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [initial?.$id]);

  // REALTIME updates (best-effort) — subscribe once per listing id (no re-subscribe on every bid)
  useEffect(() => {
    if (!listing?.$id) return;

    const currentId = listing.$id;

    const unsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${LISTINGS_COLLECTION_ID}.documents.${currentId}`,
      (event) => {
        if (
          !event.events.includes("databases.*.collections.*.documents.*.update")
        ) {
          return;
        }

        const payload = event.payload as Listing;
        const prev = listingRef.current;

        // Outbid popup
        const prevBid = prev?.current_bid ?? 0;
        const nextBid = payload.current_bid ?? 0;
        if (nextBid > prevBid) {
          setOutbidPopup({ oldBid: prevBid, newBid: nextBid });
        }

        // Soft close popup
        const oldEnd = prev?.auction_end ?? "";
        const newEnd = payload.auction_end ?? "";
        const oldT = Date.parse(oldEnd);
        const newT = Date.parse(newEnd);
        if ((Number.isFinite(newT) ? newT : 0) > (Number.isFinite(oldT) ? oldT : 0)) {
          setSoftClosePopup({ oldEnd, newEnd });
        }

        listingRef.current = payload;
        setListing(payload);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.$id]);

  // If we truly have no listing, show not found UI
  if (!listing) {
    return (
      <main className="min-h-screen bg-black text-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md bg-white rounded-2xl shadow-lg border border-yellow-100 p-6 text-center">
          <p className="text-red-600 text-base mb-2">Listing not found.</p>
          <Link
            href="/current-listings"
            className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-md bg-yellow-500 text-sm font-semibold text-black hover:bg-yellow-600"
          >
            ← Back to listings
          </Link>
        </div>
      </main>
    );
  }

  // VALUES
  const {
    registration,
    listing_id,
    description,
    status,
    current_bid,
    starting_price,
    plate_type,
    certificate,
    expiry_date,
    bids,
    sold_via,
    interesting_fact,
    reserve_met,
  } = listing;

  const isLive = status === "live";
  const isComing = status === "queued";
  const isSold = status === "sold";

  const regDisplay = formatRegDisplay(registration);

  // Support both field names
  const buyNowPrice =
    (listing.buy_now_price ?? null) ??
    (typeof listing.buy_now === "number" ? listing.buy_now : null);

  const expiryText = certificate && expiry_date ? formatDate(expiry_date) : null;

  const displayRef = listing_id || `AMP-${listing.$id.slice(-6).toUpperCase()}`;

  const numberOfBids =
    typeof bids === "number"
      ? bids
      : typeof bids === "string"
        ? parseInt(bids, 10)
        : 0;

  const hasStartingPrice = starting_price != null && starting_price > 0;

  const currentBidDisplay =
    current_bid != null
      ? `£${current_bid.toLocaleString()}`
      : hasStartingPrice
        ? "No bids yet"
        : "£0";

  const soldPrice = current_bid ?? buyNowPrice ?? 0;

  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-yellow-100 overflow-hidden text-sm md:text-base">
        {/* NAV */}
        <div className="flex justify-between items-center px-6 pt-4 pb-3 border-b border-gray-100">
          <Link href="/current-listings" className="text-blue-700 underline text-sm">
            ← Back to listings
          </Link>

          <div className="flex items-center gap-3 text-xs">
            {isSold && (
              <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 font-semibold text-gray-700">
                SOLD
              </span>
            )}
            {isComing && !isSold && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800">
                Queued
              </span>
            )}
            {isLive && !isSold && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800">
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* ✅ H1 for SEO + clarity */}
        <div className="px-6 pt-5">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
            {regDisplay ? `Private number plate ${regDisplay}` : "Private number plate listing"}
          </h1>

          <p className="mt-2 text-xs text-gray-600">
            Browse auctions, bid securely, and complete the DVLA assignment process after sale.{" "}
            <Link href="/how-it-works" className="text-blue-700 underline">
              How it works
            </Link>{" "}
            •{" "}
            <Link href="/fees" className="text-blue-700 underline">
              Fees
            </Link>
          </p>

          {refreshNote && (
            <p className="mt-2 text-xs text-gray-600">{refreshNote}</p>
          )}
        </div>

        {/* IMAGE + OVERLAYED PLATE */}
        <div className="px-6 pb-6 pt-4">
          <div className="relative w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
            <Image
              src="/car-rear.jpg"
              alt={`Rear of car with registration ${regDisplay || ""}`}
              width={1600}
              height={1067}
              className="w-full h-auto block"
              priority
            />

            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "29%" }}>
              <div
                style={{
                  transform: "scale(0.42)",
                  transformOrigin: "center bottom",
                }}
              >
                <NumberPlate
                  reg={regDisplay || ""}
                  size="large"
                  variant="rear"
                  showBlueBand={true}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-between text-sm text-gray-600">
            <span>Listing ID: {displayRef}</span>
            {plate_type && <span>Type: {plate_type}</span>}
          </div>
        </div>

        {/* SOLD BANNER */}
        {isSold && (
          <div className="mx-6 my-6 p-5 bg-green-600 text-white rounded-xl shadow text-center">
            <p className="text-2xl font-extrabold">SOLD</p>
            <p className="text-lg mt-2">
              Final Price: <span className="font-bold">£{soldPrice.toLocaleString()}</span>
            </p>
            <p className="text-sm opacity-90 mt-1">
              {sold_via === "buy_now" ? "Bought via Buy Now" : "Sold at Auction"}
            </p>
          </div>
        )}

        {/* Auction Details */}
        <div className="mt-2 mx-6 mb-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-yellow-500">
            Auction details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              {!isSold ? (
                <>
                  <p>
                    <span className="font-semibold">Current bid:</span> {currentBidDisplay}
                  </p>

                  <p>
                    <span className="font-semibold">Number of bids:</span> {numberOfBids}
                  </p>

                  {hasStartingPrice && (
                    <p>
                      <span className="font-semibold">Starting price:</span> £
                      {starting_price!.toLocaleString()}
                      {current_bid == null && " (first bid starts here)"}
                    </p>
                  )}

                  {buyNowPrice && (
                    <p>
                      <span className="font-semibold">Buy Now:</span> £
                      {buyNowPrice.toLocaleString()}
                    </p>
                  )}

                  <p className="text-xs text-gray-600">
                    Reserve:{" "}
                    <span className="font-semibold">
                      {reserve_met ? "met" : "not shown (hidden)"}
                    </span>{" "}
                    — plates only sell if the reserve is met.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="font-semibold">Final price:</span> £
                    {soldPrice.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Method:</span>{" "}
                    {sold_via === "buy_now" ? "Buy Now" : "Auction"}
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2 md:text-right">
              {expiryText && (
                <p>
                  <span className="font-semibold">Expiry date:</span> {expiryText}
                </p>
              )}

              {!isSold ? (
                <>
                  <p>
                    <span className="font-semibold">
                      {isLive ? "Auction ends in:" : "Auction starts in:"}
                    </span>
                  </p>
                  <div className="mt-1 inline-block">
                    {isLive ? <AuctionTimer mode="live" /> : <AuctionTimer mode="coming" />}
                  </div>
                </>
              ) : (
                <p className="font-semibold text-red-600">Auction ended</p>
              )}
            </div>
          </div>
        </div>

        {/* TRUST / PROCESS (SEO + confidence) */}
        <div className="mx-6 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-800">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              What happens after you win?
            </h2>
            <ul className="mt-3 list-disc list-inside space-y-1 text-sm">
              <li>Winning bidder pays securely online.</li>
              <li>Buyer/seller upload the required DVLA documents via their dashboards.</li>
              <li>We manage the assignment process and confirm completion before payout.</li>
            </ul>

            <p className="mt-3 text-xs text-gray-600">
              DVLA fee: by default the seller covers the £80 assignment fee (deducted from seller payout).
              A small number of legacy listings charge it to the buyer and are clearly labelled.{" "}
              <Link href="/fees" className="text-blue-700 underline">
                See fees
              </Link>
              .
            </p>

            <p className="mt-2 text-[11px] text-gray-500">
              AuctionMyPlate.co.uk is an independent marketplace and is not affiliated with the DVLA.
            </p>
          </div>
        </div>

        {/* DESCRIPTION + HISTORY */}
        <div className="mx-6 mb-8 space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2 text-yellow-500">
              Description
            </h3>
            <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-800 whitespace-pre-line">
              {description || "No description has been added yet."}
            </div>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-bold mb-2 text-yellow-500">
              Plate history &amp; interesting facts
            </h3>
            <div className="border rounded-lg p-3 bg-white text-sm text-gray-800 whitespace-pre-line">
              {interesting_fact || "No extra history or interesting facts have been added yet."}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-6 mb-8 flex flex-col sm:flex-row sm:justify-between gap-4 text-sm">
          {!isSold ? (
            isLive ? (
              <div className="flex flex-col gap-3">
                <Link
                  href={`/place_bid?id=${listing.$id}`}
                  className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-600"
                >
                  Place a bid
                </Link>

                {buyNowPrice && (
                  <Link
                    href={`/buy_now?id=${listing.$id}`}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    Buy Now £{buyNowPrice.toLocaleString()}
                  </Link>
                )}

                {hasStartingPrice && current_bid == null && (
                  <p className="text-xs text-gray-600">
                    First bid must be at least £{starting_price!.toLocaleString()}.
                  </p>
                )}

                <p className="text-xs text-gray-600">
                  New to auctions?{" "}
                  <Link href="/how-it-works" className="text-blue-700 underline">
                    Read how it works
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                Bidding opens when this plate goes live.{" "}
                <Link href="/current-listings" className="text-blue-700 underline">
                  Browse current listings
                </Link>
                .
              </p>
            )
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-red-600">This auction has ended.</p>
              <Link
                href="/sell-my-plate"
                className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-600 w-fit"
              >
                Sell your plate
              </Link>
            </div>
          )}

          <p className="text-xs text-gray-500 sm:text-right">
            Plates will only be sold if the reserve has been met.
          </p>
        </div>
      </div>

      {/* OUTBID POPUP */}
      {outbidPopup && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-xl shadow-xl z-50 w-80 animate-bounce">
          <h3 className="text-xl font-bold mb-1">You've been outbid!</h3>
          <p className="text-lg">
            New highest bid:{" "}
            <strong>£{outbidPopup.newBid.toLocaleString()}</strong>
          </p>
          <button
            className="mt-3 w-full bg-white text-red-600 font-semibold rounded-lg py-2 hover:bg-gray-200"
            onClick={() => setOutbidPopup(null)}
          >
            OK
          </button>
        </div>
      )}

      {/* SOFT CLOSE POPUP */}
      {softClosePopup && (
        <div className="fixed bottom-6 left-6 bg-yellow-500 text-black p-4 rounded-xl shadow-xl z-50 w-80 animate-pulse">
          <h3 className="text-xl font-bold mb-1">Auction Extended</h3>
          <p className="text-lg">Extra 2 minutes added!</p>
          <button
            onClick={() => setSoftClosePopup(null)}
            className="mt-3 w-full bg-black text-yellow-400 font-semibold rounded-lg py-2 hover:bg-gray-900"
          >
            OK
          </button>
        </div>
      )}
    </main>
  );
}
