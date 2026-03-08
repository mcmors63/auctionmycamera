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

  // Legacy
  image_url?: string | null;

  // New storage-based images
  image_id?: string | null;
  image_ids?: string[] | null;

  // Tolerate older/camel variants if any docs still have them
  imageId?: string | null;
  imageIds?: string[] | null;

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

  [key: string]: any;
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

function buildLocalImageProxyUrl(fileId: string) {
  const id = String(fileId || "").trim();
  if (!id) return null;
  return `/api/camera-image/${encodeURIComponent(id)}`;
}

function firstImageId(l: Listing): string | null {
  const anyL = l as any;

  const ids = anyL.image_ids ?? anyL.imageIds;
  if (Array.isArray(ids) && ids.length) {
    const first = String(ids[0] || "").trim();
    if (first) return first;
  }

  const single = String(anyL.image_id || anyL.imageId || "").trim();
  if (single) return single;

  return null;
}

function pickCardImageSrc(l: Listing) {
  const id = firstImageId(l);
  if (id) {
    const url = buildLocalImageProxyUrl(id);
    if (url) return url;
  }

  const explicit = String(l.image_url || "").trim();
  if (explicit) return explicit;

  return pickFallbackImage(l);
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `£${value.toLocaleString("en-GB")}`;
}

function formatUkDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
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

export default function ListingCard({ listing }: Props) {
  const {
    $id,
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

  const LIVE_STATUSES = new Set(["live", "active"]);
  const QUEUED_STATUSES = new Set(["queued", "upcoming", "pending"]);

  const isLiveStatus = LIVE_STATUSES.has(lowerStatus);
  const isQueuedStatus = QUEUED_STATUSES.has(lowerStatus);

  const isSold =
    lowerStatus === "sold" ||
    saleStatusLower === "sold" ||
    (typeof sold_price === "number" && sold_price > 0);

  // Rely mainly on status here; timer handles countdown display
  const isLive = isLiveStatus && !isSold;
  const isQueued = isQueuedStatus && !isSold;
  const isEnded = !isSold && !isLive && !isQueued;

  const rawEnd = auction_end ?? end_time ?? null;
  const rawStart = auction_start ?? start_time ?? null;

  const timerLabel = isSold
    ? "Sold"
    : isEnded
    ? "Auction ended"
    : isLive
    ? "Auction ends in"
    : "Auction starts in";

  const numericCurrentBid = typeof current_bid === "number" ? current_bid : 0;
  const hasBid = typeof current_bid === "number";

  const startPrice =
    typeof starting_price === "number" && starting_price > 0 ? starting_price : null;

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
    isLive &&
    typeof buyNow === "number" &&
    buyNow > 0 &&
    numericCurrentBid < buyNow;

  const canBid = isLive && !isSold;

  const title = getTitle(listing);
  const metaLine = getMetaLine(listing);

  const displayId = listing_id || `AMC-${$id.slice(-6).toUpperCase()}`;

  const imageSrc = pickCardImageSrc(listing);
  const fallbackSrc = pickFallbackImage(listing);

  const gear = String(listing.gear_type || "").toLowerCase();
  const extraLine =
    gear === "camera" && typeof shutter_count === "number" && shutter_count >= 0
      ? `Shutter count: ${shutter_count.toLocaleString("en-GB")}`
      : gear === "lens"
      ? [
          lens_mount ? `Mount: ${lens_mount}` : "",
          focal_length || "",
          max_aperture || "",
        ]
          .filter(Boolean)
          .join(" • ")
      : "";

  const absoluteTimeLabel = isLive ? formatUkDate(rawEnd) : isQueued ? formatUkDate(rawStart) : null;

  return (
    <article className="rounded-3xl border border-border bg-card text-card-foreground p-4 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Listing
          </p>
          <p className="mt-1 font-semibold text-sm truncate">{displayId}</p>
        </div>

        <div className="text-right min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Item
          </p>
          <Link
            href={listingUrl}
            className="mt-1 inline-block font-extrabold text-sm sm:text-base underline hover:opacity-80 truncate max-w-[220px]"
            title={title}
          >
            {title}
          </Link>
          {metaLine ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{metaLine}</p>
          ) : null}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isSold && <Badge text="SOLD" tone="danger" />}
        {!isSold && isLive && <Badge text="LIVE" tone="primary" />}
        {!isSold && isQueued && <Badge text="COMING NEXT" tone="muted" />}
        {!isSold && isEnded && <Badge text="ENDED" tone="muted" />}
        {hasBuyNow && <Badge text="BUY NOW" tone="success" />}
      </div>

      {/* Image */}
      <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-background">
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-[190px] object-cover block"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src !== fallbackSrc) el.src = fallbackSrc;
          }}
        />
      </div>

      {extraLine ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{extraLine}</p>
      ) : null}

      {/* Timer */}
      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {timerLabel}
        </p>

        <div className="mt-2">
          {isSold ? (
            <span className="text-sm font-semibold text-muted-foreground">
              Sold — bidding closed
            </span>
          ) : isEnded ? (
            <span className="text-sm font-semibold text-muted-foreground">
              Auction ended
            </span>
          ) : isLive ? (
            <AuctionTimer mode="live" endTime={rawEnd ?? undefined} />
          ) : (
            <AuctionTimer mode="coming" />
          )}
        </div>

        {absoluteTimeLabel ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {isLive ? "Ends" : "Starts"} {absoluteTimeLabel} UK time
          </p>
        ) : null}
      </div>

      {/* Price / bids */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoBox
          label={isSold ? "Sold price" : "Current bid"}
          value={isSold ? formatMoney(sold_price) || "Sold" : formatMoney(priceToShow) || "£0"}
          accent={!isSold}
          helper={priceSubLabel}
        />
        <InfoBox
          label="Bids"
          value={String(bids || 0)}
        />
      </div>

      {/* Reserve / buy now */}
      <div className="mt-4 space-y-3">
        {hasReserve && !isSold ? (
          <InfoLine
            label="Reserve"
            value={reserveMet ? "Reserve met" : "Reserve not met"}
            highlight={reserveMet}
          />
        ) : null}

        {hasBuyNow ? (
          <InfoLine
            label="Buy now"
            value={formatMoney(buyNow) || "Available"}
            highlight
          />
        ) : null}
      </div>

      {/* Footer actions */}
      <div className="mt-5 flex justify-between items-center gap-3">
        <Link
          href={listingUrl}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          View listing
        </Link>

        {canBid ? (
          <Link
            href={`/place_bid?id=${$id}`}
            className="px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition bg-primary text-primary-foreground hover:opacity-90"
          >
            Bid now
          </Link>
        ) : (
          <Link
            href={listingUrl}
            className="px-4 py-2 rounded-xl font-bold text-sm border border-border bg-background hover:bg-accent transition"
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}

function InfoBox({
  label,
  value,
  helper,
  accent = false,
}: {
  label: string;
  value: string;
  helper?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-lg font-extrabold ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 flex items-center justify-between gap-3",
        highlight
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-border bg-background",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "text-sm font-semibold text-right",
          highlight ? "text-foreground" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
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