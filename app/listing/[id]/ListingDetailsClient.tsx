"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Client, Databases } from "appwrite";
import AuctionTimer from "../../current-listings/AuctionTimer";

// -----------------------------
// Appwrite client (browser)
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const databases = new Databases(client);

// Client-side envs must be NEXT_PUBLIC_*
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID!;
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID!;

// ✅ Storage bucket for camera images (still used for sanity checks)
const CAMERA_IMAGES_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "";

// -----------------------------
// Types
// -----------------------------
export type Listing = {
  $id: string;
  $createdAt?: string;

  status?: string;

  item_title?: string | null;
  brand?: string | null;
  model?: string | null;
  gear_type?: string | null;
  era?: string | null;
  condition?: string | null;
  description?: string | null;

  // Old approach
  image_url?: string | null;

  // New approach (Appwrite Storage)
  image_id?: string | null;

  shutter_count?: number | null;
  lens_mount?: string | null;
  focal_length?: string | null;
  max_aperture?: string | null;

  current_bid?: number | null;
  starting_price?: number | null;
  reserve_price?: number | null;
  reserve_met?: boolean | null;
  bids?: number | string | null;

  buy_now_price?: number | null;
  buy_now?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  sold_via?: "auction" | "buy_now" | null;
  sold_price?: number | null;

  listing_id?: string | null;

  // legacy fallback fields (if any docs still have them)
  registration?: string | null;
  reg_number?: string | null;

  // possible sale/payment markers (best-effort)
  sale_status?: string | null;
  payment_status?: string | null;

  [key: string]: any;
};

// -----------------------------
// Helpers
// -----------------------------
function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function niceEnum(s?: string | null) {
  const v = String(s || "").trim();
  if (!v) return "";
  return cap(v.replace(/_/g, " "));
}

function money(n?: number | null) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return `£${n.toLocaleString("en-GB")}`;
}

function pickBuyNow(l: Listing): number | null {
  const anyL = l as any;
  if (typeof anyL.buy_now_price === "number") return anyL.buy_now_price;
  if (typeof anyL.buy_now === "number") return anyL.buy_now;
  return null;
}

function getListingName(l: Listing) {
  const anyL = l as any;

  const itemTitle = String(anyL.item_title || anyL.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(anyL.brand || "").trim();
  const model = String(anyL.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const legacy = String(anyL.registration || anyL.reg_number || "").trim();
  if (legacy) return legacy;

  const gearType = String(anyL.gear_type || anyL.type || "").trim();
  if (gearType) return `${niceEnum(gearType)} listing`;

  return "Camera gear listing";
}

function pickFallbackImage(l: Listing) {
  const gear = String(l.gear_type || "").toLowerCase();
  const era = String(l.era || "").toLowerCase();

  if (era === "antique" || era === "vintage") return "/hero/antique-cameras.jpg";
  if (gear === "lens") return "/hero/modern-lens.jpg";
  return "/hero/modern-lens.jpg";
}

function parseBids(bids: Listing["bids"]) {
  if (typeof bids === "number") return bids;
  if (typeof bids === "string") {
    const n = parseInt(bids, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseMaybeDate(input: unknown): number | null {
  const s = String(input || "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function isUpdateEvent(events: string[] | undefined) {
  if (!Array.isArray(events)) return false;
  return events.some((e) => typeof e === "string" && e.endsWith(".update"));
}

// ✅ Serve images via OUR domain so it works even if bucket is private
function buildLocalImageProxyUrl(fileId: string) {
  const id = String(fileId || "").trim();
  if (!id) return null;

  if (!CAMERA_IMAGES_BUCKET_ID) return null;

  return `/api/camera-image/${encodeURIComponent(id)}`;
}

// ✅ Prefer: image_url (public) -> image_id (proxy) -> fallback
function pickImageSrc(l: Listing) {
  const anyL = l as any;

  const explicit = String(anyL.image_url || "").trim();
  if (explicit) return explicit;

  const id = String(anyL.image_id || "").trim();
  if (id) {
    const url = buildLocalImageProxyUrl(id);
    if (url) return url;
  }

  return pickFallbackImage(l);
}

function normStatus(s: any) {
  return String(s || "").trim().toLowerCase();
}

function isLifecycleEndedStatus(statusLower: string) {
  return ["sold", "completed", "not_sold", "payment_required", "payment_failed"].includes(statusLower);
}

export default function ListingDetailsClient({ initial }: { initial: Listing }) {
  const [listing, setListing] = useState<Listing | null>(initial ?? null);

  // Never let a failed client refresh wipe valid SSR HTML
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const [outbidPopup, setOutbidPopup] = useState<null | { oldBid: number; newBid: number }>(null);
  const [softClosePopup, setSoftClosePopup] = useState<null | { oldEnd: string; newEnd: string }>(
    null
  );

  const listingRef = useRef<Listing | null>(initial ?? null);
  useEffect(() => {
    listingRef.current = listing;
  }, [listing]);

  // ✅ FIX: hooks must run before any early return
  const imgSrc = useMemo(() => {
    if (listing) return pickImageSrc(listing);
    // fallback if listing missing (rare)
    return pickFallbackImage(initial);
  }, [listing, initial]);

  // Best-effort client refresh
  useEffect(() => {
    if (!initial?.$id) return;

    let cancelled = false;

    async function refreshOnce() {
      try {
        setRefreshNote(null);
        const doc = await databases.getDocument(DATABASE_ID, LISTINGS_COLLECTION_ID, initial.$id);
        if (!cancelled) setListing(doc as unknown as Listing);
      } catch (err) {
        console.warn("[listing] Client refresh failed (keeping SSR content):", err);
        if (!cancelled) {
          setRefreshNote("Live updates may be limited on this page (displayed details are still valid).");
        }
      }
    }

    const t = setTimeout(refreshOnce, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [initial?.$id]);

  // Realtime updates (best-effort)
  useEffect(() => {
    if (!listing?.$id) return;

    const currentId = listing.$id;

    const unsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${LISTINGS_COLLECTION_ID}.documents.${currentId}`,
      (event) => {
        if (!isUpdateEvent((event as any)?.events)) return;

        const payload = (event as any).payload as Listing;
        const prev = listingRef.current;

        // Outbid popup
        const prevBid = prev?.current_bid ?? 0;
        const nextBid = payload.current_bid ?? 0;
        if (typeof nextBid === "number" && nextBid > prevBid) {
          setOutbidPopup({ oldBid: prevBid, newBid: nextBid });
        }

        // Soft close popup (only if end time moved forward)
        const oldEnd = String(prev?.auction_end ?? prev?.end_time ?? "");
        const newEnd = String(payload.auction_end ?? payload.end_time ?? "");
        const oldT = parseMaybeDate(oldEnd) ?? 0;
        const newT = parseMaybeDate(newEnd) ?? 0;
        if (newT > oldT && newT > 0) {
          setSoftClosePopup({ oldEnd, newEnd });
        }

        listingRef.current = payload;
        setListing(payload);
      }
    );

    return () => unsub();
  }, [listing?.$id]);

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

  const anyL = listing as any;

  const statusLower = normStatus(anyL.status);
  const isLiveStatus = statusLower === "live";
  const isComing = statusLower === "queued";
  const isSold = statusLower === "sold";

  // New lifecycle states from scheduler
  const isCompleted = statusLower === "completed"; // auction ended, processing / charging
  const isNotSold = statusLower === "not_sold";
  const isPaymentRequired = statusLower === "payment_required";
  const isPaymentFailed = statusLower === "payment_failed";

  const name = getListingName(listing);
  const buyNow = pickBuyNow(listing);

  const currentBidRaw = typeof anyL.current_bid === "number" ? anyL.current_bid : null;

  const startingPrice =
    typeof anyL.starting_price === "number" && anyL.starting_price > 0 ? anyL.starting_price : null;

  const bidsCount = parseBids(anyL.bids);
  const reserveMet = typeof anyL.reserve_met === "boolean" ? anyL.reserve_met : null;

  const displayRef = String(anyL.listing_id || `AMC-${listing.$id.slice(-6).toUpperCase()}`);

  const metaBits = [niceEnum(anyL.gear_type), niceEnum(anyL.condition), niceEnum(anyL.era)].filter(Boolean);
  const metaLine = metaBits.join(" • ");

  const rawEndStr = String(anyL.auction_end ?? anyL.end_time ?? "");
  const rawStartStr = String(anyL.auction_start ?? anyL.start_time ?? "");

  const endMs = parseMaybeDate(rawEndStr);

  // Clock-based ended (for live/queued)
  const endedByClock = !!endMs && endMs <= Date.now();

  // ✅ Treat these statuses as ended even if the end time is missing
  const endedByStatus = isLifecycleEndedStatus(statusLower);

  const auctionEnded = endedByClock || endedByStatus;

  // "Live" should only be true when status is live AND not ended
  const isLive = isLiveStatus && !auctionEnded && !isSold;

  const extraLine =
    String(anyL.gear_type || "").toLowerCase() === "camera" && typeof anyL.shutter_count === "number"
      ? `Shutter count: ${anyL.shutter_count.toLocaleString("en-GB")}`
      : String(anyL.gear_type || "").toLowerCase() === "lens"
      ? [anyL.lens_mount ? `Mount: ${anyL.lens_mount}` : "", anyL.focal_length || "", anyL.max_aperture || ""]
          .filter(Boolean)
          .join(" • ")
      : "";

  const soldPrice =
    typeof anyL.sold_price === "number"
      ? anyL.sold_price
      : anyL.sold_via === "buy_now" && typeof buyNow === "number"
      ? buyNow
      : typeof currentBidRaw === "number"
      ? currentBidRaw
      : null;

  const currentBidDisplay =
    currentBidRaw == null ? (startingPrice != null ? "No bids yet" : money(0)) : money(currentBidRaw);

  // Banner + CTA logic for ended states (non-sold)
  const showEndedInfoBanner = !isSold && (isCompleted || isNotSold || isPaymentRequired || isPaymentFailed || endedByClock);

  const endedBanner = (() => {
    if (isPaymentRequired) {
      return {
        tone: "amber" as const,
        title: "Payment required",
        body:
          "The winner needs to add a saved card to complete payment. If you are the winner, add/verify your payment method in your account.",
        ctaPrimary: { href: "/payment-method", label: "Manage payment method" },
        ctaSecondary: { href: "/dashboard?tab=transactions", label: "Go to dashboard" },
      };
    }
    if (isPaymentFailed) {
      return {
        tone: "rose" as const,
        title: "Payment failed",
        body:
          "The winner’s payment could not be taken automatically. If you are the winner, update your saved card and we’ll attempt payment again.",
        ctaPrimary: { href: "/payment-method", label: "Update saved card" },
        ctaSecondary: { href: "/dashboard?tab=transactions", label: "Go to dashboard" },
      };
    }
    if (isCompleted) {
      return {
        tone: "slate" as const,
        title: "Auction ended (processing)",
        body:
          "This auction has ended and we’re processing the result. If you won, keep an eye on your dashboard for the next step.",
        ctaPrimary: { href: "/dashboard?tab=transactions", label: "Go to dashboard" },
        ctaSecondary: { href: "/current-listings", label: "Browse current listings" },
      };
    }
    if (isNotSold) {
      return {
        tone: "slate" as const,
        title: "Auction ended (not sold)",
        body:
          "This item didn’t sell in the last auction window. If you’re the seller, it may be re-listed depending on your auto-relist setting.",
        ctaPrimary: { href: "/current-listings", label: "Browse current listings" },
        ctaSecondary: { href: "/sell", label: "Sell camera gear" },
      };
    }
    // ended-by-clock fallback
    if (endedByClock) {
      return {
        tone: "slate" as const,
        title: "Auction ended",
        body:
          "This auction has ended. If you participated, check your dashboard for any updates.",
        ctaPrimary: { href: "/dashboard?tab=transactions", label: "Go to dashboard" },
        ctaSecondary: { href: "/current-listings", label: "Browse current listings" },
      };
    }
    return null;
  })();

  const chip = (() => {
    if (isSold) return { label: "SOLD", cls: "bg-gray-200 text-gray-700" };
    if (isPaymentRequired) return { label: "PAYMENT REQUIRED", cls: "bg-yellow-100 text-yellow-800" };
    if (isPaymentFailed) return { label: "PAYMENT FAILED", cls: "bg-red-100 text-red-700" };
    if (isCompleted) return { label: "PROCESSING", cls: "bg-gray-200 text-gray-700" };
    if (isNotSold) return { label: "NOT SOLD", cls: "bg-gray-200 text-gray-700" };
    if (isComing) return { label: "Queued", cls: "bg-yellow-100 text-yellow-800" };
    if (isLive) return { label: "LIVE", cls: "bg-green-100 text-green-800" };
    if (auctionEnded) return { label: "ENDED", cls: "bg-gray-200 text-gray-700" };
    return { label: statusLower ? niceEnum(statusLower) : "Listing", cls: "bg-gray-200 text-gray-700" };
  })();

  const bannerToneClasses =
    endedBanner?.tone === "amber"
      ? "bg-yellow-500 text-black"
      : endedBanner?.tone === "rose"
      ? "bg-red-600 text-white"
      : "bg-gray-200 text-gray-800";

  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-yellow-100 overflow-hidden text-sm md:text-base">
        {/* NAV */}
        <div className="flex justify-between items-center px-6 pt-4 pb-3 border-b border-gray-100">
          <Link href="/current-listings" className="text-blue-700 underline text-sm">
            ← Back to listings
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${chip.cls}`}>
              {chip.label}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="px-6 pt-5">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">{name}</h1>

          <p className="mt-2 text-xs text-gray-600">
            {metaLine ? <span className="font-semibold">{metaLine}</span> : null}
            {metaLine ? " • " : null}
            Listing ID: {displayRef} <span className="text-gray-400">•</span>{" "}
            <Link href="/how-it-works" className="text-blue-700 underline">
              How it works
            </Link>{" "}
            <span className="text-gray-400">•</span>{" "}
            <Link href="/fees" className="text-blue-700 underline">
              Fees
            </Link>{" "}
            <span className="text-gray-400">•</span>{" "}
            <Link href="/faq" className="text-blue-700 underline">
              FAQ
            </Link>
          </p>

          {extraLine ? <p className="mt-2 text-xs text-gray-600">{extraLine}</p> : null}
          {refreshNote ? <p className="mt-2 text-xs text-gray-600">{refreshNote}</p> : null}
        </div>

        {/* Image */}
        <div className="px-6 pb-6 pt-4">
          <div className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-lg bg-black">
            <img
              src={imgSrc}
              alt={name}
              className="w-full h-[320px] md:h-[420px] object-cover block"
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.src = pickFallbackImage(listing);
              }}
            />
          </div>
        </div>

        {/* SOLD Banner */}
        {isSold && (
          <div className="mx-6 my-6 p-5 bg-green-600 text-white rounded-xl shadow text-center">
            <p className="text-2xl font-extrabold">SOLD</p>
            {soldPrice != null ? (
              <p className="text-lg mt-2">
                Final Price: <span className="font-bold">{money(soldPrice)}</span>
              </p>
            ) : null}
            <p className="text-sm opacity-90 mt-1">
              {anyL.sold_via === "buy_now" ? "Bought via Buy Now" : "Sold at Auction"}
            </p>
          </div>
        )}

        {/* Ended / processing banner */}
        {showEndedInfoBanner && endedBanner && !isSold && (
          <div className={`mx-6 my-4 p-5 rounded-xl shadow text-center ${bannerToneClasses}`}>
            <p className="text-xl md:text-2xl font-extrabold">{endedBanner.title}</p>
            <p className="text-sm md:text-base mt-2 opacity-90">{endedBanner.body}</p>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={endedBanner.ctaPrimary.href}
                className={`inline-flex items-center justify-center rounded-md px-5 py-3 font-semibold ${
                  endedBanner.tone === "slate"
                    ? "bg-black text-white hover:bg-gray-900"
                    : "bg-black text-yellow-200 hover:bg-gray-900"
                }`}
              >
                {endedBanner.ctaPrimary.label}
              </Link>

              <Link
                href={endedBanner.ctaSecondary.href}
                className="inline-flex items-center justify-center rounded-md border border-black/20 bg-white/60 px-5 py-3 font-semibold text-black hover:bg-white"
              >
                {endedBanner.ctaSecondary.label}
              </Link>
            </div>
          </div>
        )}

        {/* Auction details */}
        <div className="mt-2 mx-6 mb-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-yellow-600">Auction details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              {!isSold ? (
                <>
                  <p>
                    <span className="font-semibold">Current bid:</span> {currentBidDisplay}
                  </p>

                  <p>
                    <span className="font-semibold">Number of bids:</span> {bidsCount}
                  </p>

                  {startingPrice != null && (
                    <p>
                      <span className="font-semibold">Starting price:</span> {money(startingPrice)}
                      {currentBidRaw == null ? " (first bid starts here)" : ""}
                    </p>
                  )}

                  {typeof buyNow === "number" && buyNow > 0 ? (
                    <p>
                      <span className="font-semibold">Buy Now:</span> {money(buyNow)}
                    </p>
                  ) : null}

                  <p className="text-xs text-gray-600">
                    Reserve:{" "}
                    <span className="font-semibold">
                      {reserveMet === true ? "met" : reserveMet === false ? "not met" : "hidden"}
                    </span>
                  </p>

                  {isPaymentRequired && (
                    <p className="text-xs text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-md px-3 py-2 mt-2">
                      Winner payment is required to complete this sale.
                    </p>
                  )}
                  {isPaymentFailed && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
                      Winner payment failed. If you’re the winner, update your saved card.
                    </p>
                  )}
                </>
              ) : (
                <p className="font-semibold text-gray-700">This auction has ended.</p>
              )}
            </div>

            <div className="space-y-2 md:text-right">
              {!isSold ? (
                auctionEnded ? (
                  <p className="font-semibold text-red-600">
                    {isCompleted
                      ? "Auction ended (processing)"
                      : isPaymentRequired
                      ? "Auction ended (payment required)"
                      : isPaymentFailed
                      ? "Auction ended (payment failed)"
                      : isNotSold
                      ? "Auction ended (not sold)"
                      : "Auction ended"}
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-semibold">{isLive ? "Auction ends in:" : "Auction starts in:"}</span>
                    </p>
                    <div className="mt-1 inline-block">
                      {isLive ? (
                        <AuctionTimer mode="live" endTime={rawEndStr || undefined} />
                      ) : (
                        <AuctionTimer mode="coming" endTime={rawStartStr || undefined} />
                      )}
                    </div>
                  </>
                )
              ) : (
                <p className="font-semibold text-red-600">Auction ended</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mx-6 mb-8 space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2 text-yellow-600">Description</h3>
            <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-800 whitespace-pre-line">
              {String(anyL.description || "").trim() || "No description has been added yet."}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-800">
            <h2 className="text-base md:text-lg font-bold text-gray-900">Buying tips</h2>
            <ul className="mt-3 list-disc list-inside space-y-1 text-sm">
              <li>Check condition notes carefully (marks, fungus/haze, faults, battery health, etc.).</li>
              <li>Confirm what’s included (caps, straps, chargers, boxes, filters, tripod).</li>
              <li>If it’s a camera, shutter count (if provided) is helpful — but not the whole story.</li>
            </ul>
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

                {typeof buyNow === "number" && buyNow > 0 ? (
                  <Link
                    href={`/buy_now?id=${listing.$id}`}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    Buy Now {money(buyNow)}
                  </Link>
                ) : null}

                <p className="text-xs text-gray-600">
                  New here?{" "}
                  <Link href="/how-it-works" className="text-blue-700 underline">
                    Read how it works
                  </Link>
                  .
                </p>
              </div>
            ) : auctionEnded ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  This auction has ended.{" "}
                  <Link href="/current-listings" className="text-blue-700 underline">
                    Browse current listings
                  </Link>
                  .
                </p>

                {(isPaymentRequired || isPaymentFailed || isCompleted) && (
                  <p className="text-xs text-gray-600">
                    If you took part, check{" "}
                    <Link href="/dashboard?tab=transactions" className="text-blue-700 underline">
                      your dashboard
                    </Link>{" "}
                    for updates.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                Bidding opens when this item goes live.{" "}
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
                href="/sell"
                className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-600 w-fit"
              >
                Sell camera gear
              </Link>
            </div>
          )}

          <p className="text-xs text-gray-500 sm:text-right">Listings are only sold if the reserve is met.</p>
        </div>
      </div>

      {/* OUTBID POPUP */}
      {outbidPopup && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-xl shadow-xl z-50 w-80 animate-bounce">
          <h3 className="text-xl font-bold mb-1">You've been outbid!</h3>
          <p className="text-lg">
            New highest bid: <strong>£{outbidPopup.newBid.toLocaleString("en-GB")}</strong>
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
          <p className="text-lg">Extra time added!</p>
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