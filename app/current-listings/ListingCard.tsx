// app/current-listings/ListingCard.tsx
"use client";

import Link from "next/link";
import AuctionTimer from "./AuctionTimer";

type Listing = {
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

  image_url?: string | null;

  shutter_count?: number | null;
  lens_mount?: string | null;
  focal_length?: string | null;
  max_aperture?: string | null;

  current_bid?: number | null;
  starting_price?: number | null;
  bids?: number | null;
  reserve_price?: number | null;
  reserve_met?: boolean | null;

  buy_now?: number | null;
  buy_now_price?: number | null;

  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  sold_price?: number | null;
  sale_status?: string | null;
  sold_via?: "auction" | "buy_now" | null;

  listing_id?: string | null;

  registration?: string | null;
  reg_number?: string | null;
};

type Props = {
  listing: Listing;
};

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function niceEnum(s?: string | null) {
  const v = String(s || "").trim();
  if (!v) return "";
  return cap(v.replace(/_/g, " "));
}

function getTitle(l: Listing) {
  const itemTitle = String(l.item_title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(l.brand || "").trim();
  const model = String(l.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const legacy = String(l.registration || l.reg_number || "").trim();
  if (legacy) return legacy;

  const gear = String(l.gear_type || "").trim();
  if (gear) return `${niceEnum(gear)} listing`;

  return "Camera gear listing";
}

function getMetaLine(l: Listing) {
  const bits = [
    l.gear_type ? niceEnum(l.gear_type) : "",
    l.condition ? niceEnum(l.condition) : "",
    l.era ? niceEnum(l.era) : "",
  ].filter(Boolean);
  return bits.join(" • ");
}

function pickBuyNow(l: Listing): number | null {
  if (typeof l.buy_now_price === "number" && l.buy_now_price > 0) return l.buy_now_price;
  if (typeof l.buy_now === "number" && l.buy_now > 0) return l.buy_now;
  return null;
}

function pickFallbackImage(l: Listing) {
  const gear = String(l.gear_type || "").toLowerCase();
  const era = String(l.era || "").toLowerCase();
  if (era === "antique" || era === "vintage") return "/hero/antique-cameras.jpg";
  if (gear === "lens") return "/hero/modern-lens.jpg";
  return "/hero/modern-lens.jpg";
}

export default function ListingCard({ listing }: Props) {
  const {
    $id,
    $createdAt,
    status,
    current_bid,
    starting_price,
    bids,
    reserve_price,
    reserve_met,
    auction_start,
    auction_end,
    start_time,
    end_time,
    sold_price,
    sale_status,
    listing_id,
    shutter_count,
    lens_mount,
    focal_length,
    max_aperture,
  } = listing;

  const listingUrl = `/listing/${$id}`;

  const lowerStatus = String(status || "").toLowerCase();
  const saleStatusLower = String(sale_status || "").toLowerCase();

  const isLiveStatus = lowerStatus === "live";
  const isQueuedStatus = lowerStatus === "queued";

  const isSold =
    lowerStatus === "sold" ||
    saleStatusLower === "sold" ||
    (typeof sold_price === "number" && sold_price > 0);

  const rawEnd = auction_end ?? end_time ?? null;
  const rawStart = auction_start ?? start_time ?? null;

  let auctionEnded = false;
  if (rawEnd) {
    const endMs = Date.parse(rawEnd);
    if (Number.isFinite(endMs)) auctionEnded = endMs <= Date.now();
  }

  const isLive = isLiveStatus && !auctionEnded && !isSold;
  const isQueued = isQueuedStatus && !auctionEnded && !isSold;

  const timerLabel = isSold
    ? "SOLD"
    : auctionEnded
    ? "AUCTION ENDED"
    : isLive
    ? "AUCTION ENDS IN"
    : "AUCTION STARTS IN";

  // NEW badge (24h)
  const createdMs = $createdAt ? Date.parse($createdAt) : NaN;
  const isNew = Number.isFinite(createdMs) && Date.now() - createdMs < 24 * 60 * 60 * 1000;
  const showNewBadge = isNew && !isSold && !auctionEnded;

  const numericCurrentBid = typeof current_bid === "number" ? current_bid : 0;
  const hasBid = typeof current_bid === "number";

  const startPrice = typeof starting_price === "number" && starting_price > 0 ? starting_price : null;

  const priceToShow = !isSold && !hasBid && startPrice ? startPrice : numericCurrentBid;
  const priceSubLabel = !isSold && !hasBid && startPrice ? "Starting price" : null;

  const hasReserve = typeof reserve_price === "number" && reserve_price > 0;
  const reserveMet =
    typeof reserve_met === "boolean"
      ? reserve_met
      : hasReserve
      ? numericCurrentBid >= (reserve_price as number)
      : false;

  const buyNow = pickBuyNow(listing);
  const hasBuyNow =
    !isSold &&
    !auctionEnded &&
    isLive &&
    typeof buyNow === "number" &&
    buyNow > 0 &&
    numericCurrentBid < buyNow;

  const canBid = isLive && !isSold && !auctionEnded;

  const title = getTitle(listing);
  const metaLine = getMetaLine(listing);

  const displayId = listing_id || `AMC-${$id.slice(-6).toUpperCase()}`;

  const imageSrc = String(listing.image_url || "").trim() || pickFallbackImage(listing);

  const gear = String(listing.gear_type || "").toLowerCase();
  const extraLine =
    gear === "camera" && typeof shutter_count === "number" && shutter_count >= 0
      ? `Shutter count: ${shutter_count.toLocaleString("en-GB")}`
      : gear === "lens"
      ? [lens_mount ? `Mount: ${lens_mount}` : "", focal_length || "", max_aperture || ""]
          .filter(Boolean)
          .join(" • ")
      : "";

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Listing</p>
          <p className="mt-1 font-semibold text-sm truncate">{displayId}</p>
        </div>

        <div className="text-right min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Item</p>
          <Link
            href={listingUrl}
            className="mt-1 inline-block font-extrabold text-sm sm:text-base underline hover:opacity-80 truncate max-w-[220px]"
            title={title}
          >
            {title}
          </Link>
          {metaLine ? <p className="mt-1 text-[11px] text-muted-foreground">{metaLine}</p> : null}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isSold && <Badge text="SOLD" tone="danger" />}
        {!isSold && isLive && <Badge text="LIVE" tone="primary" />}
        {!isSold && isQueued && <Badge text="COMING NEXT" tone="muted" />}
        {!isSold && auctionEnded && <Badge text="ENDED" tone="muted" />}
        {showNewBadge && <Badge text="NEW" tone="success" />}
      </div>

      {/* Image */}
      <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-background">
        {/* Use <img> so remote image_url never needs next/image config */}
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-[180px] object-cover block"
          loading="lazy"
          decoding="async"
        />
      </div>

      {extraLine ? <p className="mt-2 text-[11px] text-muted-foreground">{extraLine}</p> : null}

      {/* Timer + price */}
      <div className="mt-4 flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{timerLabel}</p>

          <div className="inline-block rounded-xl border border-border bg-background px-3 py-2">
            {isSold ? (
              <span className="text-xs font-semibold text-muted-foreground">Sold – bidding closed</span>
            ) : auctionEnded ? (
              <span className="text-xs font-semibold text-muted-foreground">Auction ended</span>
            ) : isLive ? (
              <AuctionTimer mode="live" endTime={rawEnd ?? undefined} />
            ) : (
              <AuctionTimer mode="coming" endTime={rawStart ?? undefined} />
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current bid</p>

            {isSold ? (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Sold</p>
            ) : (
              <>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  £{priceToShow.toLocaleString("en-GB")}
                </p>
                {priceSubLabel ? <p className="mt-1 text-[11px] text-muted-foreground">{priceSubLabel}</p> : null}
              </>
            )}

            {hasReserve && !isSold ? (
              reserveMet ? (
                <p className="mt-1 text-[11px] font-semibold text-emerald-600">Reserve met</p>
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Reserve not met</p>
              )
            ) : null}

            {hasBuyNow && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                Buy now: £{buyNow!.toLocaleString("en-GB")}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Bids</p>
            <p className="mt-1 text-sm font-semibold">{bids || 0}</p>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="mt-4 flex justify-between items-center">
        {canBid ? (
          <>
            <Link href={listingUrl} className="text-sm underline text-muted-foreground hover:text-foreground">
              View listing
            </Link>

            <Link
              href={`/place_bid?id=${$id}`}
              className="px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition bg-primary text-primary-foreground hover:opacity-90"
            >
              Bid
            </Link>
          </>
        ) : (
          <Link
            href={listingUrl}
            className="ml-auto px-4 py-2 rounded-xl font-bold text-sm border border-border bg-background hover:bg-accent transition"
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
  tone: "primary" | "muted" | "danger" | "success";
}) {
  const cls =
    tone === "primary"
      ? "border-primary/35 bg-primary/10 text-foreground"
      : tone === "danger"
      ? "border-destructive/35 bg-destructive/10 text-foreground"
      : tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/10 text-foreground"
      : "border-border bg-background text-muted-foreground";

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] border ${cls}`}>
      {text}
    </span>
  );
}