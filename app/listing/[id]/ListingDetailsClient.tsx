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

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID!;
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID!;

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
  image_ids?: string[] | null;

  shutter_count?: number | string | null;
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

  // legacy fallback fields
  registration?: string | null;
  reg_number?: string | null;

  // possible sale/payment markers
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

function formatUkDateTime(input: unknown) {
  const s = String(input || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
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

function buildLocalImageProxyUrl(fileId: string) {
  const id = String(fileId || "").trim();
  if (!id) return null;
  return `/api/camera-image/${encodeURIComponent(id)}`;
}

function coerceIdList(raw: any): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((x) => String(x || "").trim()).filter(Boolean);
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];

    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x || "").trim()).filter(Boolean);
        }
      } catch {
        // ignore
      }
    }

    return s
      .split(",")
      .map((x) => String(x || "").trim())
      .filter(Boolean);
  }

  return [];
}

function allImageIds(l: Listing): string[] {
  const anyL = l as any;

  const rawIds = anyL.image_ids ?? anyL.imageIds ?? anyL.images ?? null;
  const out = coerceIdList(rawIds);

  const single = String(anyL.image_id || anyL.imageId || "").trim();
  if (single && !out.includes(single)) out.push(single);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of out) {
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  return deduped;
}

function firstImageId(l: Listing): string | null {
  const ids = allImageIds(l);
  return ids.length ? ids[0] : null;
}

function pickImageSrc(l: Listing) {
  const anyL = l as any;

  const id = firstImageId(l);
  if (id) {
    const url = buildLocalImageProxyUrl(id);
    if (url) return url;
  }

  const explicit = String(anyL.image_url || "").trim();
  if (explicit) return explicit;

  return pickFallbackImage(l);
}

function normStatus(s: any) {
  return String(s || "").trim().toLowerCase();
}

function isLifecycleEndedStatus(statusLower: string) {
  return ["sold", "completed", "not_sold", "payment_required", "payment_failed"].includes(
    statusLower
  );
}

export default function ListingDetailsClient({ initial }: { initial: Listing }) {
  const [listing, setListing] = useState<Listing | null>(initial ?? null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);

  const [outbidPopup, setOutbidPopup] = useState<null | { oldBid: number; newBid: number }>(
    null
  );
  const [softClosePopup, setSoftClosePopup] = useState<null | { oldEnd: string; newEnd: string }>(
    null
  );

  const [nowMs, setNowMs] = useState<number | null>(null);

  const listingRef = useRef<Listing | null>(initial ?? null);
  useEffect(() => {
    listingRef.current = listing;
  }, [listing]);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Gallery state
  const ids = useMemo(() => {
    const src = listing ?? initial;
    return allImageIds(src);
  }, [listing, initial]);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(() => {
    const first = firstImageId(initial);
    return first || null;
  });

  useEffect(() => {
    const nextIds = allImageIds(listing ?? initial);
    const first = nextIds[0] || null;

    setSelectedImageId((prev) => {
      if (prev && nextIds.includes(prev)) return prev;
      return first;
    });
  }, [listing, initial]);

  const mainImgSrc = useMemo(() => {
    const srcListing = listing ?? initial;

    if (selectedImageId) {
      return buildLocalImageProxyUrl(selectedImageId) || pickFallbackImage(srcListing);
    }

    return pickImageSrc(srcListing);
  }, [selectedImageId, listing, initial]);

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
          setRefreshNote("Live updates may be limited on this page, but the displayed details are still valid.");
        }
      }
    }

    const t = setTimeout(refreshOnce, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [initial?.$id]);

  // Realtime updates
  useEffect(() => {
    if (!listing?.$id) return;

    const currentId = listing.$id;

    const unsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${LISTINGS_COLLECTION_ID}.documents.${currentId}`,
      (event) => {
        if (!isUpdateEvent((event as any)?.events)) return;

        const payload = (event as any).payload as Listing;
        const prev = listingRef.current;

        const prevBid = prev?.current_bid ?? 0;
        const nextBid = payload.current_bid ?? 0;
        if (typeof nextBid === "number" && nextBid > prevBid) {
          setOutbidPopup({ oldBid: prevBid, newBid: nextBid });
        }

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
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-semibold">Listing not found.</p>
          <Link
            href="/current-listings"
            className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-xl font-semibold bg-primary text-primary-foreground"
          >
            Back to listings
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

  const isCompleted = statusLower === "completed";
  const isNotSold = statusLower === "not_sold";
  const isPaymentRequired = statusLower === "payment_required";
  const isPaymentFailed = statusLower === "payment_failed";

  const name = getListingName(listing);
  const buyNow = pickBuyNow(listing);

  const currentBidRaw = typeof anyL.current_bid === "number" ? anyL.current_bid : null;

  const startingPrice =
    typeof anyL.starting_price === "number" && anyL.starting_price > 0
      ? anyL.starting_price
      : null;

  const bidsCount = parseBids(anyL.bids);
  const reserveMet = typeof anyL.reserve_met === "boolean" ? anyL.reserve_met : null;

  const displayRef = String(anyL.listing_id || `AMC-${listing.$id.slice(-6).toUpperCase()}`);

  const metaBits = [niceEnum(anyL.gear_type), niceEnum(anyL.condition), niceEnum(anyL.era)].filter(
    Boolean
  );
  const metaLine = metaBits.join(" • ");

  const rawEndStr = String(anyL.auction_end ?? anyL.end_time ?? "");
  const rawStartStr = String(anyL.auction_start ?? anyL.start_time ?? "");

  const endMs = parseMaybeDate(rawEndStr);

  const endedByClock = nowMs !== null && !!endMs && endMs <= nowMs;
  const endedByStatus = isLifecycleEndedStatus(statusLower);

  const auctionEnded = endedByClock || endedByStatus;
  const isLive = isLiveStatus && !auctionEnded && !isSold;

  const extraLine =
    String(anyL.gear_type || "").toLowerCase() === "camera" && String(anyL.shutter_count || "").trim()
      ? `Shutter count: ${String(anyL.shutter_count).trim()}`
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

  const currentBidDisplay: string =
    currentBidRaw == null ? (startingPrice != null ? "No bids yet" : money(0) || "£0") : money(currentBidRaw) || "£0";

  const reserveText =
    reserveMet === true ? "Reserve met" : reserveMet === false ? "Reserve not met" : "Hidden reserve";

  const canShowBuyNow =
    typeof buyNow === "number" &&
    buyNow > 0 &&
    isLive &&
    (currentBidRaw ?? 0) < buyNow;

  const showEndedInfoBanner =
    !isSold &&
    (isCompleted || isNotSold || isPaymentRequired || isPaymentFailed || endedByClock);

  const endedBanner = (() => {
    if (isPaymentRequired) {
      return {
        tone: "amber" as const,
        title: "Payment required",
        body:
          "The winner needs to add a saved card to complete payment. If you are the winner, add or verify your payment method in your account.",
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
    if (endedByClock) {
      return {
        tone: "slate" as const,
        title: "Auction ended",
        body: "This auction has ended. If you participated, check your dashboard for any updates.",
        ctaPrimary: { href: "/dashboard?tab=transactions", label: "Go to dashboard" },
        ctaSecondary: { href: "/current-listings", label: "Browse current listings" },
      };
    }
    return null;
  })();

  const chip = (() => {
    if (isSold) return { label: "Sold", tone: "sold" as const };
    if (isPaymentRequired) return { label: "Payment required", tone: "queued" as const };
    if (isPaymentFailed) return { label: "Payment failed", tone: "sold" as const };
    if (isCompleted) return { label: "Processing", tone: "muted" as const };
    if (isNotSold) return { label: "Not sold", tone: "muted" as const };
    if (isComing) return { label: "Queued", tone: "queued" as const };
    if (isLive) return { label: "Live", tone: "live" as const };
    if (auctionEnded) return { label: "Ended", tone: "muted" as const };
    return { label: statusLower ? niceEnum(statusLower) : "Listing", tone: "muted" as const };
  })();

  const selectedIndex = selectedImageId ? Math.max(0, ids.indexOf(selectedImageId)) : 0;

  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Top nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <Link
            href="/current-listings"
            className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            ← Back to listings
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={chip.tone}>{chip.label}</StatusBadge>
            {canShowBuyNow ? <StatusBadge tone="buyNow">Buy Now available</StatusBadge> : null}
          </div>
        </div>

        {/* Hero */}
        <section className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-12 gap-0">
            {/* Left */}
            <div className="lg:col-span-7 p-6 sm:p-7 border-b lg:border-b-0 lg:border-r border-border">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Camera gear listing
              </p>

              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                {name}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {metaLine ? `${metaLine}. ` : ""}
                Review the listing, check the images carefully, and follow the auction status through to completion.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill label={`Listing ID: ${displayRef}`} />
                {metaLine ? <InfoPill label={metaLine} /> : null}
                {extraLine ? <InfoPill label={extraLine} /> : null}
              </div>

              {refreshNote ? (
                <p className="mt-4 text-xs text-muted-foreground">{refreshNote}</p>
              ) : null}

              <div className="mt-6">
                <div className="relative w-full rounded-2xl overflow-hidden bg-background border border-border">
                  <img
                    src={mainImgSrc}
                    alt={name}
                    className="w-full h-[320px] md:h-[460px] object-cover block"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      const fallback = pickFallbackImage(listing);
                      if (el.src !== fallback) el.src = fallback;
                    }}
                  />
                </div>

                {ids.length > 1 ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{ids.length} photos</span>
                      <span>
                        {selectedIndex + 1} / {ids.length}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {ids.slice(0, 16).map((id) => {
                        const src = buildLocalImageProxyUrl(id) || pickFallbackImage(listing);
                        const isSel = id === selectedImageId;

                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedImageId(id)}
                            className={[
                              "rounded-lg overflow-hidden border bg-background",
                              isSel ? "border-primary" : "border-border",
                            ].join(" ")}
                            aria-label="View photo"
                            title="View photo"
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-16 w-full object-cover block"
                              loading="lazy"
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                const fallback = pickFallbackImage(listing);
                                if (el.src !== fallback) el.src = fallback;
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {ids.length > 16 ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Showing 16 of {ids.length} photos.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-5 p-6 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Auction summary
              </p>

              {isSold ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="text-sm font-semibold text-foreground/80">Sold status</p>
                  <p className="mt-2 text-3xl font-extrabold">SOLD</p>
                  <p className="mt-3 text-lg font-bold text-primary">
                    {soldPrice != null ? money(soldPrice) : "Sold"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {anyL.sold_via === "buy_now" ? "Bought via Buy Now." : "Sold at auction."}
                  </p>
                </div>
              ) : showEndedInfoBanner && endedBanner ? (
                <div
                  className={[
                    "mt-4 rounded-2xl border p-5",
                    endedBanner.tone === "amber"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : endedBanner.tone === "rose"
                      ? "border-destructive/30 bg-destructive/10"
                      : "border-border bg-background",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-foreground">{endedBanner.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {endedBanner.body}
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Link
                      href={endedBanner.ctaPrimary.href}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold bg-primary text-primary-foreground"
                    >
                      {endedBanner.ctaPrimary.label}
                    </Link>
                    <Link
                      href={endedBanner.ctaSecondary.href}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold border border-border bg-card hover:bg-accent"
                    >
                      {endedBanner.ctaSecondary.label}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <StatCard
                    label="Current bid"
                    value={currentBidDisplay}
                    accent
                    helper={
                      currentBidRaw == null && startingPrice != null
                        ? `First bid starts at ${money(startingPrice)}.`
                        : "Latest visible bid on this listing."
                    }
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      label="Bids"
                      value={String(bidsCount)}
                      helper={`${bidsCount} ${bidsCount === 1 ? "bid" : "bids"} recorded.`}
                    />
                    <StatCard
                      label={isLive ? "Auction ends" : "Auction starts"}
                      value={
                        isLive ? (
                          <AuctionTimer mode="live" endTime={rawEndStr || undefined} />
                        ) : (
                          <AuctionTimer mode="coming" endTime={rawStartStr || undefined} />
                        )
                      }
                      helper={
                        isLive
                          ? formatUkDateTime(rawEndStr) || "Live now"
                          : formatUkDateTime(rawStartStr) || "Queued"
                      }
                    />
                  </div>

                  {typeof buyNow === "number" && buyNow > 0 ? (
                    <StatCard
                      label="Buy Now"
                      value={money(buyNow) || "Available"}
                      helper="This ends the auction immediately if used."
                    />
                  ) : null}

                  <StatCard label="Reserve" value={reserveText} helper="Listings only sell if the reserve is met." />
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {!isSold ? (
                  isLive ? (
                    <>
                      <Link
                        href={`/place_bid?id=${listing.$id}`}
                        className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold shadow-sm bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Place a bid
                      </Link>

                      {typeof buyNow === "number" && buyNow > 0 ? (
                        <Link
                          href={`/buy_now?id=${listing.$id}`}
                          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Buy Now {money(buyNow)}
                        </Link>
                      ) : null}
                    </>
                  ) : auctionEnded ? (
                    <div className="flex flex-col gap-3">
                      <Link
                        href="/current-listings"
                        className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold shadow-sm bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Browse current listings
                      </Link>
                      <Link
                        href="/sell"
                        className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold border border-border bg-card hover:bg-accent"
                      >
                        Sell camera gear
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Link
                        href="/current-listings"
                        className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold shadow-sm bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Browse current listings
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Bidding opens when this item goes live.
                      </p>
                    </div>
                  )
                ) : (
                  <Link
                    href="/sell"
                    className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold shadow-sm bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Sell camera gear
                  </Link>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  New here?{" "}
                  <Link href="/how-it-works" className="text-primary underline hover:opacity-80">
                    Read how it works
                  </Link>
                  {" "}or{" "}
                  <Link href="/fees" className="text-primary underline hover:opacity-80">
                    see fees
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Details / advice */}
        <div className="mt-6 grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">Auction details</h2>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <DetailCard label="Listing reference" value={displayRef} />
              <DetailCard
                label="Status"
                value={
                  isSold
                    ? "Sold"
                    : isLive
                    ? "Live"
                    : isComing
                    ? "Queued"
                    : isCompleted
                    ? "Processing"
                    : isPaymentRequired
                    ? "Payment required"
                    : isPaymentFailed
                    ? "Payment failed"
                    : isNotSold
                    ? "Not sold"
                    : "Ended"
                }
              />
              <DetailCard label="Current bid" value={currentBidDisplay} />
              <DetailCard label="Number of bids" value={String(bidsCount)} />
              {startingPrice != null ? (
                <DetailCard label="Starting price" value={money(startingPrice) || "—"} />
              ) : null}
              {typeof buyNow === "number" && buyNow > 0 ? (
                <DetailCard label="Buy Now price" value={money(buyNow) || "—"} />
              ) : null}
              {formatUkDateTime(rawStartStr) ? (
                <DetailCard label="Auction start" value={formatUkDateTime(rawStartStr) || "—"} />
              ) : null}
              {formatUkDateTime(rawEndStr) ? (
                <DetailCard
                  label={auctionEnded ? "Auction ended" : "Auction end"}
                  value={formatUkDateTime(rawEndStr) || "—"}
                />
              ) : null}
              {metaLine ? <DetailCard label="Item type" value={metaLine} /> : null}
              {extraLine ? <DetailCard label="Extra detail" value={extraLine} /> : null}
            </div>
          </section>

          <section className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">Buying tips</h2>

            <div className="mt-5 space-y-4">
              <ProcessStep
                number="1"
                title="Check the condition notes"
                body="Look carefully for wear, faults, fungus or haze, battery health, and anything the seller has highlighted."
              />
              <ProcessStep
                number="2"
                title="Review what’s included"
                body="Caps, chargers, boxes, filters, straps, cases, and accessories can all affect value."
              />
              <ProcessStep
                number="3"
                title="Treat shutter count as one clue"
                body="Useful when provided, but it should sit alongside condition, service history, and overall description."
              />
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Payments are handled securely and both sides follow the post-sale steps once an item is won.
              </p>
            </div>
          </section>
        </div>

        {/* Description */}
        <div className="mt-6 grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">Description</h2>
            <div className="mt-4 rounded-2xl border border-border bg-background p-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {String(anyL.description || "").trim() || "No description has been added yet."}
            </div>
          </section>

          <section className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">Quick next step</h2>
            <div className="mt-4 rounded-2xl border border-border bg-background p-5 text-sm leading-relaxed text-muted-foreground">
              {isLive
                ? "This item is live. If you are ready, go to the bid page and follow the payment method and auction steps there."
                : auctionEnded
                ? "This auction has ended. Browse current listings or check your dashboard if you took part."
                : "This listing is queued. You can review the details now and come back once bidding opens."}
            </div>
          </section>
        </div>
      </div>

      {/* OUTBID POPUP */}
      {outbidPopup && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-destructive/30 bg-destructive text-destructive-foreground p-4 shadow-2xl">
          <h3 className="text-lg font-bold mb-1">You’ve been outbid</h3>
          <p className="text-sm">
            New highest bid: <strong>£{outbidPopup.newBid.toLocaleString("en-GB")}</strong>
          </p>
          <button
            className="mt-3 w-full rounded-xl py-2 font-semibold bg-white text-red-700"
            onClick={() => setOutbidPopup(null)}
          >
            OK
          </button>
        </div>
      )}

      {/* SOFT CLOSE POPUP */}
      {softClosePopup && (
        <div className="fixed bottom-6 left-6 z-50 w-80 rounded-2xl border border-primary/30 bg-primary text-primary-foreground p-4 shadow-2xl">
          <h3 className="text-lg font-bold mb-1">Auction extended</h3>
          <p className="text-sm">Extra time has been added due to late bidding.</p>
          <button
            onClick={() => setSoftClosePopup(null)}
            className="mt-3 w-full rounded-xl py-2 font-semibold bg-black text-white"
          >
            OK
          </button>
        </div>
      )}
    </main>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "live" | "queued" | "sold" | "buyNow" | "muted";
}) {
  const cls =
    tone === "live"
      ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
      : tone === "queued"
      ? "border-primary/30 bg-primary/10 text-foreground"
      : tone === "sold"
      ? "border-destructive/30 bg-destructive/10 text-foreground"
      : tone === "buyNow"
      ? "border-sky-500/30 bg-sky-500/10 text-foreground"
      : "border-border bg-background text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${cls}`}>
      {children}
    </span>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border border-border bg-background text-muted-foreground">
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className={`mt-2 text-lg font-extrabold ${accent ? "text-primary" : ""}`}>{value}</div>
      {helper ? <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{helper}</p> : null}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 bg-primary text-primary-foreground">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}