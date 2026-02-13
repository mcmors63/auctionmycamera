// app/current-listings/ListingCard.tsx
"use client";

import Link from "next/link";
import AuctionTimer from "./AuctionTimer";
import NumberPlate from "@/components/ui/NumberPlate";

type Listing = {
  $id: string;
  $createdAt?: string;
  listing_id?: string;
  registration?: string;
  status?: string;
  current_bid?: number | null;
  bids?: number | null;
  reserve_price?: number | null;
  buy_now?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  sold_price?: number | null;
  sale_status?: string | null;

  // Optional / future-proof fee flags (schema tolerant)
  // Any of these (if present) will override the default.
  transferFeeMode?: "buyer" | "seller" | string | null;
  buyerPaysTransferFee?: boolean | null;
  dvlaFeePaidBy?: "buyer" | "seller" | string | null;
};

type Props = {
  listing: Listing;
};

const ACCENT = "#d6b45f";

/**
 * IMPORTANT:
 * These are the TWO legacy listings that must remain "buyer pays £80".
 * These are Appwrite document IDs (the listing $id values).
 */
const LEGACY_BUYER_PAYS_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

function normalizeParty(v: unknown): "buyer" | "seller" | null {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "buyer") return "buyer";
    if (s === "seller") return "seller";
  }
  return null;
}

function computeBuyerPaysTransferFee(listing: Listing): boolean {
  // 1) Hard grandfather: the two legacy IDs
  if (LEGACY_BUYER_PAYS_IDS.has(listing.$id)) return true;

  // 2) If you already store a mode/flag on the listing, respect it (schema tolerant)
  if (typeof listing.buyerPaysTransferFee === "boolean")
    return listing.buyerPaysTransferFee;

  const m1 = normalizeParty(listing.transferFeeMode);
  if (m1) return m1 === "buyer";

  const m2 = normalizeParty(listing.dvlaFeePaidBy);
  if (m2) return m2 === "buyer";

  // 3) Default going forward: buyer does NOT pay extra (fee baked into seller calc)
  return false;
}

export default function ListingCard({ listing }: Props) {
  const {
    $id,
    $createdAt,
    listing_id,
    registration,
    status,
    current_bid,
    bids,
    reserve_price,
    buy_now,
    auction_start,
    auction_end,
    start_time,
    end_time,
    sold_price,
    sale_status,
  } = listing;

  const listingUrl = `/listing/${$id}`;

  // -----------------------------
  // Status flags
  // -----------------------------
  const lowerStatus = (status || "").toLowerCase();
  const saleStatusLower = (sale_status || "").toLowerCase();

  const isLiveStatus = lowerStatus === "live";
  const isQueuedStatus = lowerStatus === "queued";

  const isSold =
    lowerStatus === "sold" ||
    saleStatusLower === "sold" ||
    (typeof sold_price === "number" && sold_price > 0);

  // Work out if auction end time is in the past
  const rawEnd = auction_end ?? end_time ?? null;
  let auctionEnded = false;
  if (rawEnd) {
    const endMs = Date.parse(rawEnd);
    if (Number.isFinite(endMs)) {
      auctionEnded = endMs <= Date.now();
    }
  }

  // Treat something as "live" on the card ONLY if status is live AND it hasn't ended
  const isLive = isLiveStatus && !auctionEnded && !isSold;
  const isQueued = isQueuedStatus && !auctionEnded && !isSold;

  const timerLabel = isSold
    ? "SOLD"
    : auctionEnded
    ? "AUCTION ENDED"
    : isLive
    ? "AUCTION ENDS IN"
    : "AUCTION STARTS IN";

  // -----------------------------
  // "NEW" badge logic (no interval)
  // -----------------------------
  const createdMs = $createdAt ? Date.parse($createdAt) : NaN;
  const isNew =
    Number.isFinite(createdMs) && Date.now() - createdMs < 24 * 60 * 60 * 1000;
  const showNewBadge = isNew && !isSold && !auctionEnded;

  // -----------------------------
  // Reserve status
  // -----------------------------
  const numericCurrentBid = current_bid ?? 0;
  const hasReserve = typeof reserve_price === "number" && reserve_price > 0;
  const reserveMet = hasReserve && numericCurrentBid >= (reserve_price as number);

  // -----------------------------
  // Buy Now visibility
  // -----------------------------
  const hasBuyNow =
    !isSold &&
    !auctionEnded &&
    isLive &&
    typeof buy_now === "number" &&
    buy_now > 0 &&
    numericCurrentBid < buy_now;

  // Can user still bid from this card?
  const canBid = isLive && !isSold && !auctionEnded;

  const displayId = listing_id || `AMP-${$id.slice(-6).toUpperCase()}`;

  // -----------------------------
  // DVLA fee messaging (legacy vs new default)
  // -----------------------------
  const buyerPaysTransferFee = computeBuyerPaysTransferFee(listing);

  const dvlaNote = isSold
    ? null
    : buyerPaysTransferFee
    ? "Winner pays an additional £80 DVLA paperwork fee for transfer handling (legacy listing)."
    : "£80 DVLA paperwork fee is built into the seller-side calculation (no extra buyer charge).";

  return (
    <div
      className="rounded-2xl border p-4 shadow-xl transition hover:shadow-2xl"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
        color: "#e8e8e8",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            Listing
          </p>
          <p className="mt-1 font-semibold text-sm text-white truncate">
            {displayId}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            Registration
          </p>

          {/* ✅ Make the reg a clean internal link to the listing page */}
          <Link
            href={listingUrl}
            className="mt-1 inline-block font-extrabold text-lg tracking-wide text-white hover:underline"
            aria-label={`View listing for ${registration || "registration"}`}
          >
            {registration || "—"}
          </Link>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isSold && <Badge text="SOLD" tone="danger" />}
        {!isSold && isLive && <Badge text="LIVE" tone="accent" />}
        {!isSold && isQueued && <Badge text="COMING NEXT" tone="muted" />}
        {!isSold && auctionEnded && <Badge text="ENDED" tone="muted" />}
        {showNewBadge && <Badge text="NEW" tone="success" />}
      </div>

      {/* Plates */}
      <div
        className="mt-4 rounded-2xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(0,0,0,0.25)",
        }}
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-white/55 uppercase tracking-wide">
              Front
            </p>
            <NumberPlate reg={registration || ""} variant="front" size="card" showBlueBand />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] text-white/55 uppercase tracking-wide">
              Rear
            </p>
            <NumberPlate reg={registration || ""} variant="rear" size="card" showBlueBand />
          </div>
        </div>
      </div>

      {/* Timer + price */}
      <div className="mt-4 flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 mb-2">
            {timerLabel}
          </p>
          <div
            className="inline-block rounded-xl border px-3 py-2"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          >
            {isSold ? (
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                Sold – bidding closed
              </span>
            ) : auctionEnded ? (
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                Auction ended
              </span>
            ) : isLive || isQueued ? (
              <AuctionTimer
                mode={isLive ? "live" : "coming"}
                endTime={isLive ? rawEnd ?? undefined : auction_start ?? start_time ?? undefined}
              />
            ) : (
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.70)" }}>
                No active auction
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Current bid
            </p>
            {isSold ? (
              <p className="mt-1 text-sm font-semibold text-white/70">Sold</p>
            ) : (
              <p className="mt-1 text-lg font-extrabold" style={{ color: ACCENT }}>
                £{numericCurrentBid.toLocaleString("en-GB")}
              </p>
            )}

            {reserveMet && !isSold && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-300">
                Reserve met
              </p>
            )}

            {hasBuyNow && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-300">
                Buy now: £{buy_now!.toLocaleString("en-GB")}
              </p>
            )}

            {dvlaNote && <p className="mt-2 text-[11px] text-white/55">{dvlaNote}</p>}
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Bids</p>
            <p className="mt-1 text-sm font-semibold text-white">{bids || 0}</p>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="mt-4 flex justify-between items-center">
        {canBid ? (
          <>
            {/* ✅ View goes to the real listing page */}
            <Link href={listingUrl} className="text-sm underline text-white/75">
              View listing
            </Link>

            {/* ✅ Bid still goes to place bid */}
            <Link
              href={`/place_bid?id=${$id}`}
              className="px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition"
              style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
            >
              Bid
            </Link>
          </>
        ) : (
          <Link
            href={listingUrl}
            className="ml-auto px-4 py-2 rounded-xl font-bold text-sm border transition"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              backgroundColor: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            View listing
          </Link>
        )}
      </div>
    </div>
  );
}

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: "accent" | "muted" | "danger" | "success";
}) {
  const styles: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    accent: {
      bg: "rgba(214,180,95,0.18)",
      fg: "#ffffff",
      border: "rgba(214,180,95,0.35)",
    },
    muted: {
      bg: "rgba(255,255,255,0.06)",
      fg: "rgba(255,255,255,0.85)",
      border: "rgba(255,255,255,0.12)",
    },
    danger: {
      bg: "rgba(239,68,68,0.18)",
      fg: "#ffffff",
      border: "rgba(239,68,68,0.35)",
    },
    success: {
      bg: "rgba(16,185,129,0.18)",
      fg: "#ffffff",
      border: "rgba(16,185,129,0.35)",
    },
  };

  const s = styles[tone];

  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] border"
      style={{ backgroundColor: s.bg, color: s.fg, borderColor: s.border }}
    >
      {text}
    </span>
  );
}
