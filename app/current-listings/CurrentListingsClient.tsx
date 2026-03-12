"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ListingCard from "./ListingCard";
import {
  getCameraCategorySectionByKey,
  getGearTypeLabel,
} from "@/lib/camera-categories";

type ListingLike = {
  $id: string;
  $createdAt?: string;

  // camera fields
  item_title?: string | null;
  brand?: string | null;
  model?: string | null;
  gear_type?: string | null;
  era?: string | null;
  condition?: string | null;
  lens_mount?: string | null;
  focal_length?: string | null;
  max_aperture?: string | null;
  description?: string | null;

  // legacy fallback
  registration?: string | null;
  reg_number?: string | null;

  // auction/pricing
  auction_start?: string | null;
  auction_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  current_bid?: number | null;
  starting_price?: number | null;
};

type Props = {
  initialLive: ListingLike[];
  initialSoon: ListingLike[];
};

type Tab = "live" | "soon";
type SortKey = "ending" | "newest" | "az" | "priceLow" | "priceHigh";

function normalizeText(input: string) {
  return (input || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function niceEnum(s?: string | null) {
  const v = String(s || "").trim();
  if (!v) return "";
  return cap(v.replace(/_/g, " "));
}

function pickQueryParam(sp: ReturnType<typeof useSearchParams>) {
  return (
    sp.get("query") ||
    sp.get("q") ||
    sp.get("search") ||
    sp.get("search_term_string") ||
    ""
  );
}

function getListingTitle(l: ListingLike) {
  const itemTitle = String(l?.item_title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(l?.brand || "").trim();
  const model = String(l?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const legacy = String(l?.registration || l?.reg_number || "").trim();
  if (legacy) return legacy;

  const gearType = String(l?.gear_type || "").trim();
  if (gearType) return `${getGearTypeLabel(gearType) || niceEnum(gearType)} listing`;

  return "Camera gear listing";
}

function getListingLabel(l: ListingLike) {
  const brand = String(l?.brand || "").trim();
  const gearType = getGearTypeLabel(l?.gear_type);
  const era = niceEnum(l?.era);
  const parts = [brand, gearType, era].filter(Boolean);
  return parts.join(" • ");
}

function getSearchHaystack(l: ListingLike) {
  const parts = [
    getListingTitle(l),
    String(l?.brand || ""),
    String(l?.model || ""),
    String(l?.gear_type || ""),
    String(l?.era || ""),
    String(l?.condition || ""),
    String(l?.lens_mount || ""),
    String(l?.focal_length || ""),
    String(l?.max_aperture || ""),
    String(l?.description || ""),
    String(l?.registration || l?.reg_number || ""),
  ];
  return normalizeText(parts.filter(Boolean).join(" "));
}

function priceForSort(l: ListingLike) {
  const bid = typeof l.current_bid === "number" ? l.current_bid : null;
  const start = typeof l.starting_price === "number" ? l.starting_price : null;

  if (bid != null && Number.isFinite(bid) && bid > 0) return bid;
  if (start != null && Number.isFinite(start) && start > 0) return start;
  return 0;
}

function safeTime(value?: string | null) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function timeForEndingSort(l: ListingLike, tab: Tab) {
  if (tab === "live") {
    return (
      safeTime(l.auction_end) ||
      safeTime(l.end_time) ||
      safeTime(l.auction_start) ||
      safeTime(l.start_time) ||
      safeTime(l.$createdAt)
    );
  }

  return (
    safeTime(l.auction_start) ||
    safeTime(l.start_time) ||
    safeTime(l.auction_end) ||
    safeTime(l.end_time) ||
    safeTime(l.$createdAt)
  );
}

function formatDateLabel(value?: string | null) {
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

function firstTimeLabel(listings: ListingLike[], tab: Tab) {
  if (!listings.length) return null;
  const first = listings[0];
  return tab === "live"
    ? formatDateLabel(first.auction_end || first.end_time || null)
    : formatDateLabel(first.auction_start || first.start_time || null);
}

function sortLabel(sort: SortKey, tab: Tab) {
  if (sort === "ending") return tab === "live" ? "Ending soon" : "Starting soon";
  if (sort === "newest") return "Newest";
  if (sort === "az") return "Title A → Z";
  if (sort === "priceLow") return "Price low → high";
  return "Price high → low";
}

export default function CurrentListingsClient({ initialLive, initialSoon }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>("live");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("ending");

  const sectionFilter = (searchParams.get("section") || "").trim();
  const gearTypeFilter = (searchParams.get("gear_type") || "").trim();
  const brandFilter = (searchParams.get("brand") || "").trim();

  const sectionLabel = useMemo(() => {
    return getCameraCategorySectionByKey(sectionFilter)?.label || "";
  }, [sectionFilter]);

  const gearTypeLabel = useMemo(() => {
    return getGearTypeLabel(gearTypeFilter);
  }, [gearTypeFilter]);

  const activeUrlFilters = useMemo(() => {
    const pills: string[] = [];

    if (sectionLabel) pills.push(`Category: ${sectionLabel}`);
    if (gearTypeLabel) pills.push(`Type: ${gearTypeLabel}`);
    if (brandFilter) pills.push(`Brand: ${brandFilter}`);

    return pills;
  }, [sectionLabel, gearTypeLabel, brandFilter]);

  const hasUrlFilters = activeUrlFilters.length > 0;

  useEffect(() => {
    const qFromUrl = pickQueryParam(searchParams).trim();
    if (!qFromUrl) return;
    setSearch((prev) => (prev.trim().length ? prev : qFromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (initialLive.length === 0 && initialSoon.length > 0) {
      setTab("soon");
    }
  }, [initialLive.length, initialSoon.length]);

  const source = tab === "live" ? initialLive : initialSoon;

  const baseCount = useMemo(
    () => (source || []).filter((l) => l && typeof l === "object" && l.$id).length,
    [source]
  );

  const filtered = useMemo(() => {
    let results = [...(source || [])].filter((l) => l && typeof l === "object" && l.$id);

    const q = normalizeText(search);
    if (q) {
      results = results.filter((l) => getSearchHaystack(l).includes(q));
    }

    if (sort === "ending") {
      results.sort((a, b) => timeForEndingSort(a, tab) - timeForEndingSort(b, tab));
    }

    if (sort === "newest") {
      results.sort((a, b) => safeTime(b.$createdAt) - safeTime(a.$createdAt));
    }

    if (sort === "az") {
      results.sort((a, b) => getListingTitle(a).localeCompare(getListingTitle(b)));
    }

    if (sort === "priceLow") {
      results.sort((a, b) => priceForSort(a) - priceForSort(b));
    }

    if (sort === "priceHigh") {
      results.sort((a, b) => priceForSort(b) - priceForSort(a));
    }

    return results;
  }, [source, search, sort, tab]);

  const counts = {
    live: (initialLive || []).filter((l) => l && l.$id).length,
    soon: (initialSoon || []).filter((l) => l && l.$id).length,
  };

  const hasLocalFilters = search.trim().length > 0 || sort !== "ending";
  const hasAnyFilters = hasLocalFilters || hasUrlFilters;

  const tabHeading = tab === "live" ? "Live auctions" : "Coming next";
  const tabBody =
    tab === "live"
      ? "These listings are currently live for bidding in this week’s auction window."
      : "These approved listings are queued for the next weekly auction window.";

  const scheduleNote =
    tab === "live"
      ? "Live auctions run Monday 01:00 to Sunday 23:00, UK time."
      : "Queued listings move into the next weekly auction once their slot opens.";

  const firstLabel = useMemo(() => firstTimeLabel(filtered, tab), [filtered, tab]);

  const firstTitle = useMemo(() => {
    if (!filtered.length) return null;
    return getListingTitle(filtered[0]);
  }, [filtered]);

  const emptyTitle =
    baseCount === 0
      ? tab === "live"
        ? "No live camera gear auctions right now."
        : "No camera gear queued for the next auction yet."
      : "No listings match your filters.";

  const emptyBody =
    baseCount === 0
      ? tab === "live"
        ? "Check back soon. New cameras, lenses and accessories are added regularly, and you can also browse what is coming next."
        : "Try the Live tab, or come back later once new listings are approved and queued."
      : "Try a different search, clear filters, or switch tabs.";

  const showingText =
    search.trim().length > 0
      ? `Showing ${filtered.length} result${filtered.length === 1 ? "" : "s"} for “${search.trim()}”.`
      : `Showing ${filtered.length} of ${baseCount} in this tab.`;

  const clearAllFilters = () => {
    setSearch("");
    setSort("ending");

    if (hasUrlFilters) {
      router.push("/current-listings");
    }
  };

  return (
    <section className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Browse the auction board
            </h2>

            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Search cameras, lenses and photography gear, switch between live and queued
              listings, and sort the board the way you want.
            </p>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Useful:</span>
              <Link href="/how-it-works" className="text-primary underline hover:opacity-80">
                How it works
              </Link>
              <Link href="/fees" className="text-primary underline hover:opacity-80">
                Fees
              </Link>
              <Link href="/sell" className="text-primary underline hover:opacity-80">
                Sell your gear
              </Link>
            </div>

            {hasUrlFilters && (
              <div className="mt-5">
                <div className="flex flex-wrap gap-2">
                  {activeUrlFilters.map((pill) => (
                    <span
                      key={pill}
                      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  You’re viewing a filtered browse page from the header dropdown.
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <TabButton
              active={tab === "live"}
              onClick={() => setTab("live")}
              label={`Live (${counts.live})`}
            />
            <TabButton
              active={tab === "soon"}
              onClick={() => setTab("soon")}
              label={`Coming next (${counts.soon})`}
            />
          </div>

          {/* Summary cards */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <InfoCard title={tabHeading} body={tabBody} />
            <InfoCard title="Schedule" body={scheduleNote} />
            <InfoCard
              title="At a glance"
              body={
                filtered.length > 0
                  ? firstLabel
                    ? tab === "live"
                      ? `First result to review ends ${firstLabel} UK time.`
                      : `First result in this view starts ${firstLabel} UK time.`
                    : `Top result in this view: ${firstTitle || "Listing available"}.`
                  : "Use the search and sort controls below to narrow the board."
              }
            />
          </div>

          {/* Filters */}
          <div className="mt-6 rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                  Search by title / brand / model
                </label>
                <input
                  type="text"
                  placeholder='Try "Canon 5D", "Leica M6", "EF 24-70", "tripod"'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                  Sort
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ending">{tab === "live" ? "Ending soon" : "Starting soon"}</option>
                  <option value="newest">Newest</option>
                  <option value="az">Title A → Z</option>
                  <option value="priceLow">Price (Low → High)</option>
                  <option value="priceHigh">Price (High → Low)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="text-muted-foreground">{showingText}</span>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border border-primary/20 bg-primary/10 text-foreground">
                  {sortLabel(sort, tab)}
                </span>
              </div>

              {hasAnyFilters ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition w-full lg:w-auto"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Condition matters: sellers should describe cosmetic wear, faults, fungus or haze,
                shutter count if known, and what is included. Buyers should review the
                description carefully before bidding.{" "}
                <Link href="/faq" className="text-primary underline hover:opacity-80">
                  Read FAQ
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-semibold">{emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">{emptyBody}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition"
              >
                {hasAnyFilters ? "Clear filters" : "Refresh listings"}
              </button>
              <Link
                href="/sell"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                Sell camera gear
              </Link>
              <Link
                href="/how-it-works"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition"
              >
                How it works
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{tabHeading}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search.trim().length > 0
                    ? `Filtered by search match: ${search.trim()}`
                    : hasUrlFilters
                    ? "Filtered by the browse menu selection in the header."
                    : tab === "live"
                    ? "Items currently open for bidding."
                    : "Approved items lined up for the next auction window."}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((listing) => (
                <ListingCard key={listing.$id} listing={listing as any} />
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "px-4 py-2 rounded-full text-sm font-semibold border transition",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}