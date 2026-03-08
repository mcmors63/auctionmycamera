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

const LISTINGS_DB =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID ||
  "";

// ----------------------------------------------------
// Types
// ----------------------------------------------------
type Listing = {
  $id: string;
  $createdAt?: string;

  item_title?: string | null;
  brand?: string | null;
  model?: string | null;

  gear_type?: string | null;
  era?: string | null;
  condition?: string | null;

  image_url?: string | null;
  image_id?: string | null;
  image_ids?: string[] | string | null;
  imageId?: string | null;
  imageIds?: string[] | string | null;
  image_file_id?: string | null;
  imageFileId?: string | null;

  listing_id?: string | null;
  status?: string | null;

  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | string | null;
  reserve_price?: number | null;
  reserve_met?: boolean | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  buy_now?: number | null;
  buy_now_price?: number | null;

  description?: string | null;
  interesting_fact?: string | null;

  sold_price?: number | null;
  sold_via?: "auction" | "buy_now" | null;
  sale_status?: string | null;
  payment_status?: string | null;
};

type TimerStatus = "queued" | "live" | "ended";

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
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

function formatUkDateTime(input?: string | null) {
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

function parseMaybeDate(input: unknown): number | null {
  const s = String(input || "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function parseBids(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseGBPWholePounds(input: string): number | null {
  const n = Number(String(input || "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

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

function getListingTitle(listing: Listing) {
  const itemTitle = String(listing.item_title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(listing.brand || "").trim();
  const model = String(listing.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const gearType = String(listing.gear_type || "").trim();
  if (gearType) return `${niceEnum(gearType)} listing`;

  return "Camera gear listing";
}

function getListingMeta(listing: Listing) {
  return [niceEnum(listing.gear_type), niceEnum(listing.condition), niceEnum(listing.era)]
    .filter(Boolean)
    .join(" • ");
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

function allImageIds(listing: Listing): string[] {
  const rawIds = (listing as any).image_ids ?? (listing as any).imageIds ?? null;
  const ids = coerceIdList(rawIds);

  const singles = [
    String(listing.image_id || "").trim(),
    String((listing as any).imageId || "").trim(),
    String((listing as any).image_file_id || "").trim(),
    String((listing as any).imageFileId || "").trim(),
  ].filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const id of [...ids, ...singles]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }

  return out;
}

function pickFallbackImage(listing: Listing) {
  const gear = String(listing.gear_type || "").toLowerCase();
  const era = String(listing.era || "").toLowerCase();

  if (era === "antique" || era === "vintage") return "/hero/antique-cameras.jpg";
  if (gear === "lens") return "/hero/modern-lens.jpg";
  return "/hero/modern-lens.jpg";
}

function pickMainImage(listing: Listing, selectedImageId: string | null) {
  if (selectedImageId) {
    return buildLocalImageProxyUrl(selectedImageId) || pickFallbackImage(listing);
  }

  const firstId = allImageIds(listing)[0];
  if (firstId) {
    return buildLocalImageProxyUrl(firstId) || pickFallbackImage(listing);
  }

  const direct = String(listing.image_url || "").trim();
  if (direct) return direct;

  return pickFallbackImage(listing);
}

function normStatus(s: unknown) {
  return String(s || "").trim().toLowerCase();
}

function isEndedLifecycleStatus(status: string) {
  return ["sold", "completed", "not_sold", "payment_required", "payment_failed"].includes(
    status
  );
}

function LocalAuctionTimer({
  start,
  end,
  status,
  nowMs,
}: {
  start: string | null;
  end: string | null;
  status: TimerStatus;
  nowMs: number | null;
}) {
  let targetStr: string | null = null;

  if (status === "queued") targetStr = start ?? null;
  else if (status === "live") targetStr = end ?? null;

  if (!targetStr) {
    return <span className="font-mono text-sm text-muted-foreground">—</span>;
  }

  const targetMs = Date.parse(targetStr);
  if (!Number.isFinite(targetMs)) {
    return <span className="font-mono text-sm text-muted-foreground">—</span>;
  }

  if (nowMs === null) {
    return <span className="font-mono text-sm">--:--:--</span>;
  }

  const diff = targetMs - nowMs;

  return (
    <span className="font-mono text-sm">
      {diff <= 0 ? "00:00:00" : formatRemaining(diff)}
    </span>
  );
}

// ----------------------------------------------------
// Page
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

  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const NOTICE_KEY_PREFIX = "amc_notice_accepted_";

  const nextUrl = listingId ? `/place_bid?id=${encodeURIComponent(listingId)}` : "/current-listings";
  const paymentMethodHref = `/payment-method?next=${encodeURIComponent(nextUrl)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ----------------------------------------------------
  // Login check
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
  // Payment method check
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
        if (!res.ok) {
          throw new Error((data as any).error || "Could not verify your payment method.");
        }

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
  // Load listing
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
  // Notice state
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!listing?.$id) return;

    const key = `${NOTICE_KEY_PREFIX}${listing.$id}`;
    setNoticeAccepted(window.localStorage.getItem(key) === "true");
  }, [listing?.$id]);

  // ----------------------------------------------------
  // Keep gallery selection valid
  // ----------------------------------------------------
  useEffect(() => {
    if (!listing) {
      setSelectedImageId(null);
      return;
    }

    const ids = allImageIds(listing);
    const first = ids[0] || null;

    setSelectedImageId((prev) => {
      if (prev && ids.includes(prev)) return prev;
      return first;
    });
  }, [listing]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-foreground">Loading listing…</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-2xl w-full">
          <p className="text-destructive text-xl whitespace-pre-line">
            {error || "Listing not found."}
          </p>
          <div className="mt-6">
            <Link
              href="/current-listings"
              className="text-sm text-primary underline hover:opacity-80"
            >
              ← Back to auctions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Calculations
  // ----------------------------------------------------
  const title = getListingTitle(listing);
  const metaLine = getListingMeta(listing);

  const effectiveBaseBid =
    listing.current_bid != null ? listing.current_bid : listing.starting_price ?? 0;

  const bidIncrement = getBidIncrement(effectiveBaseBid);
  const minimumAllowed = effectiveBaseBid + bidIncrement;

  const bidsCount = parseBids(listing.bids);

  const hasReserve =
    typeof listing.reserve_price === "number" && listing.reserve_price > 0;

  const reserveMet =
    typeof listing.reserve_met === "boolean"
      ? listing.reserve_met
      : hasReserve
      ? effectiveBaseBid >= (listing.reserve_price as number)
      : false;

  const reserveText =
    reserveMet ? "Reserve met" : hasReserve ? "Hidden reserve applies" : "No reserve shown";

  const buyNowPrice = pickBuyNow(listing);

  const statusLower = normStatus(listing.status);
  const isLiveStatus = statusLower === "live" || statusLower === "active";
  const isComingStatus = statusLower === "queued" || statusLower === "upcoming" || statusLower === "pending";
  const isSoldStatus = statusLower === "sold";

  const displayId = listing.listing_id || `AMC-${listing.$id.slice(-6).toUpperCase()}`;

  const auctionStart = listing.auction_start ?? listing.start_time ?? null;
  const auctionEnd = listing.auction_end ?? listing.end_time ?? null;

  const auctionEndMs = parseMaybeDate(auctionEnd);
  const auctionEndedTime = nowMs !== null && auctionEndMs !== null ? auctionEndMs <= nowMs : false;
  const auctionEnded = auctionEndedTime || isEndedLifecycleStatus(statusLower);

  const isSoldForDisplay = isSoldStatus || (auctionEnded && reserveMet);

  const canBidOrBuyNow = isLiveStatus && !auctionEnded;
  const canShowBuyNow =
    buyNowPrice !== null && canBidOrBuyNow && effectiveBaseBid < (buyNowPrice as number);

  const timerStatus: TimerStatus =
    auctionEnded ? "ended" : isLiveStatus ? "live" : isComingStatus ? "queued" : "ended";

  const paymentBlocked =
    loggedIn && !checkingPaymentMethod && hasPaymentMethod === false && !paymentMethodError;

  const heroImg = pickMainImage(listing, selectedImageId);
  const heroIsSameOrigin = heroImg.startsWith("/");
  const imageIds = allImageIds(listing);
  const fallbackImg = pickFallbackImage(listing);

  // ----------------------------------------------------
  // Handle bid
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

    const amount = parseGBPWholePounds(bidAmount);
    if (amount === null) {
      setError("Enter a valid number.");
      return;
    }

    if (amount < minimumAllowed) {
      setError(`Minimum bid is £${minimumAllowed.toLocaleString("en-GB")}.`);
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
          plateId: listing.$id,
          amount,
          bidAmount: amount,
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
      setSuccess("Bid placed successfully.");
      setBidAmount("");
    } catch (err: any) {
      setError(err?.message || "Failed to place bid.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Handle Buy Now
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

    if (
      !window.confirm(
        `Use Buy Now for £${buyNowPrice.toLocaleString("en-GB")}?\n\nThis ends the auction immediately.`
      )
    ) {
      return;
    }

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

  return (
    <main className="min-h-screen bg-background text-foreground py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <Link
            href="/current-listings"
            className="text-sm text-primary underline hover:opacity-80"
          >
            ← Back to auctions
          </Link>
        </div>

        {/* Hero */}
        <section className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 p-6 sm:p-7 border-b lg:border-b-0 lg:border-r border-border">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Place a bid
              </p>

              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                {title}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {metaLine ? `${metaLine}. ` : ""}
                Review the listing carefully, check the images, and place your bid only if you are ready to buy.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill label={`Listing ID: ${displayId}`} />
                {metaLine ? <InfoPill label={metaLine} /> : null}
              </div>

              <div className="mt-6">
                <div className="relative w-full rounded-2xl overflow-hidden bg-background border border-border">
                  {heroIsSameOrigin ? (
                    <Image
                      src={heroImg}
                      alt={title}
                      width={1600}
                      height={900}
                      className="w-full h-[320px] md:h-[420px] object-cover block"
                      priority
                    />
                  ) : (
                    <img
                      src={heroImg}
                      alt={title}
                      className="w-full h-[320px] md:h-[420px] object-cover block"
                      loading="eager"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (el.src !== fallbackImg) el.src = fallbackImg;
                      }}
                    />
                  )}
                </div>

                {imageIds.length > 1 ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{imageIds.length} photos</span>
                      <span>
                        {(selectedImageId ? Math.max(0, imageIds.indexOf(selectedImageId)) : 0) + 1} /{" "}
                        {imageIds.length}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {imageIds.slice(0, 16).map((id) => {
                        const src = buildLocalImageProxyUrl(id) || fallbackImg;
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
                                if (el.src !== fallbackImg) el.src = fallbackImg;
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Auction summary
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {isSoldForDisplay ? <StatusBadge tone="sold">Sold</StatusBadge> : null}
                {!isSoldForDisplay && canBidOrBuyNow ? <StatusBadge tone="live">Live</StatusBadge> : null}
                {!isSoldForDisplay && isComingStatus && !auctionEnded ? (
                  <StatusBadge tone="queued">Queued</StatusBadge>
                ) : null}
                {!isSoldForDisplay && auctionEnded ? <StatusBadge tone="muted">Ended</StatusBadge> : null}
                {canShowBuyNow ? <StatusBadge tone="buyNow">Buy Now available</StatusBadge> : null}
              </div>

              <div className="mt-5 space-y-4">
                <StatCard
                  label={isSoldForDisplay ? "Winning bid" : "Current bid"}
                  value={money(effectiveBaseBid) || "£0"}
                  accent
                  helper={
                    listing.current_bid == null && listing.starting_price
                      ? `Starting price is ${money(listing.starting_price)}.`
                      : "Latest visible auction price."
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Bids"
                    value={String(bidsCount)}
                    helper={`${bidsCount} ${bidsCount === 1 ? "bid" : "bids"} recorded.`}
                  />
                  <StatCard
                    label={auctionEnded ? "Auction ended" : isLiveStatus ? "Auction ends" : "Auction starts"}
                    value={
                      <LocalAuctionTimer
                        start={auctionStart}
                        end={auctionEnd}
                        status={timerStatus}
                        nowMs={nowMs}
                      />
                    }
                    helper={
                      auctionEnded
                        ? formatUkDateTime(auctionEnd) || "Auction closed"
                        : isLiveStatus
                        ? formatUkDateTime(auctionEnd) || "Live now"
                        : formatUkDateTime(auctionStart) || "Queued"
                    }
                  />
                </div>

                {buyNowPrice ? (
                  <StatCard
                    label="Buy Now"
                    value={money(buyNowPrice) || "Available"}
                    helper="This ends the auction immediately if used."
                  />
                ) : null}

                <StatCard label="Reserve" value={reserveText} helper="Listings only sell if the reserve is met." />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {!loggedIn ? (
                  <>
                    <Link
                      href={loginHref}
                      className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-primary text-primary-foreground"
                    >
                      Login to bid
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold border border-border bg-background hover:bg-accent"
                    >
                      Register
                    </Link>
                  </>
                ) : auctionEnded ? (
                  <>
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                      <p className="font-semibold">
                        {isSoldForDisplay ? "This listing has been sold." : "Auction has already ended."}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No further bids or Buy Now purchases can be made on this listing.
                      </p>
                    </div>

                    <Link
                      href="/current-listings"
                      className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-primary text-primary-foreground"
                    >
                      Browse current auctions
                    </Link>
                  </>
                ) : (
                  <>
                    {error ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm whitespace-pre-line">
                        {error}
                      </div>
                    ) : null}

                    {success ? (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                        {success}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-sm text-muted-foreground">
                        Minimum bid:{" "}
                        <strong className="text-foreground">
                          £{minimumAllowed.toLocaleString("en-GB")}
                        </strong>{" "}
                        <span className="text-xs">
                          (increments of £{bidIncrement.toLocaleString("en-GB")})
                        </span>
                      </p>

                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={minimumAllowed}
                        step={bidIncrement}
                        inputMode="numeric"
                        placeholder={`£${minimumAllowed.toLocaleString("en-GB")}`}
                        className="w-full mt-4 rounded-xl border border-border p-3 text-lg text-center bg-background"
                      />
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4 text-sm">
                      <p className="font-semibold">Important notice</p>
                      <p className="mt-2 text-muted-foreground">
                        Please check the listing details carefully before bidding. All bids are binding.
                      </p>

                      <label className="mt-3 flex items-start gap-2 text-sm">
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
                          className="mt-1"
                        />
                        <span className="text-muted-foreground">
                          I understand and accept this notice.
                        </span>
                      </label>
                    </div>

                    {checkingPaymentMethod ? (
                      <p className="text-sm text-muted-foreground">
                        Checking your saved payment method…
                      </p>
                    ) : null}

                    {paymentMethodError ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                        {paymentMethodError}
                      </div>
                    ) : null}

                    {hasPaymentMethod === false && !checkingPaymentMethod && !paymentMethodError ? (
                      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
                        <p className="font-semibold">Action needed</p>
                        <p className="mt-1 text-muted-foreground">
                          Before you can bid or use Buy Now, you must add a payment method.
                        </p>
                        <Link
                          href={paymentMethodHref}
                          className="mt-3 inline-block text-primary underline hover:opacity-80"
                        >
                          Add or manage payment method
                        </Link>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          if (paymentBlocked) {
                            router.push(paymentMethodHref);
                            return;
                          }
                          void handleBid();
                        }}
                        disabled={!canBidOrBuyNow || submitting || checkingPaymentMethod}
                        className="rounded-xl py-3 text-lg font-semibold text-white transition disabled:cursor-not-allowed"
                        style={{
                          backgroundColor:
                            canBidOrBuyNow && !checkingPaymentMethod ? "#2563eb" : "rgba(107,114,128,0.8)",
                        }}
                      >
                        {canBidOrBuyNow
                          ? submitting
                            ? "Processing…"
                            : checkingPaymentMethod
                            ? "Checking payment…"
                            : "Place bid"
                          : "Auction not live"}
                      </button>

                      {canShowBuyNow && buyNowPrice !== null ? (
                        <button
                          onClick={() => {
                            if (paymentBlocked) {
                              router.push(paymentMethodHref);
                              return;
                            }
                            void handleBuyNow();
                          }}
                          disabled={!canBidOrBuyNow || submitting || checkingPaymentMethod}
                          className="rounded-xl py-3 text-lg font-semibold text-white transition disabled:cursor-not-allowed"
                          style={{
                            backgroundColor:
                              canBidOrBuyNow && !checkingPaymentMethod
                                ? "rgba(16,185,129,0.88)"
                                : "rgba(107,114,128,0.8)",
                          }}
                        >
                          {canBidOrBuyNow
                            ? submitting
                              ? "Processing Buy Now…"
                              : checkingPaymentMethod
                              ? "Checking payment…"
                              : `Buy Now £${buyNowPrice.toLocaleString("en-GB")}`
                            : "Buy Now unavailable"}
                        </button>
                      ) : null}
                    </div>

                    <div>
                      <Link
                        href={paymentMethodHref}
                        className="text-xs text-primary underline hover:opacity-80"
                      >
                        Manage payment method
                      </Link>
                    </div>
                  </>
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

        {/* Description / extra info */}
        <div className="mt-6 grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">Description</h2>
            <div className="mt-4 rounded-2xl border border-border bg-background p-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {listing.description || "No description has been added yet."}
            </div>
          </section>

          <section className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold">History & interesting facts</h2>
            <div className="mt-4 rounded-2xl border border-border bg-background p-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {listing.interesting_fact || "No extra details have been added yet."}
            </div>
          </section>
        </div>
      </div>
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
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${cls}`}
    >
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
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className={`mt-2 text-lg font-extrabold ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
      {helper ? (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{helper}</p>
      ) : null}
    </div>
  );
}