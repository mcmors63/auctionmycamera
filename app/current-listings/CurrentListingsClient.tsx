// app/current-listings/CurrentListingsClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ListingCard from "./ListingCard";

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
  if (gearType) return `${niceEnum(gearType)} listing`;

  return "Camera gear listing";
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

export default function CurrentListingsClient({ initialLive, initialSoon }: Props) {
  const [tab, setTab] = useState<Tab>("live");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("ending");

  const source = tab === "live" ? initialLive : initialSoon;

  const baseCount = useMemo(
    () => (source || []).filter((l) => l && typeof l === "object" && l.$id).length,
    [source]
  );

  const filtered = useMemo(() => {
    let results = [...(source || [])].filter((l) => l && typeof l === "object" && l.$id);

    const q = normalizeText(search);
    if (q) results = results.filter((l) => getSearchHaystack(l).includes(q));

    if (sort === "ending") {
      results.sort((a, b) => timeForEndingSort(a, tab) - timeForEndingSort(b, tab));
    }

    if (sort === "newest") {
      results.sort((a, b) => safeTime(b.$createdAt) - safeTime(a.$createdAt));
    }

    if (sort === "az") {
      results.sort((a, b) => getListingTitle(a).localeCompare(getListingTitle(b)));
    }

    if (sort === "priceLow") results.sort((a, b) => priceForSort(a) - priceForSort(b));
    if (sort === "priceHigh") results.sort((a, b) => priceForSort(b) - priceForSort(a));

    return results;
  }, [source, search, sort, tab]);

  const counts = {
    live: (initialLive || []).filter((l) => l && l.$id).length,
    soon: (initialSoon || []).filter((l) => l && l.$id).length,
  };

  const hasActiveFilters = search.trim().length > 0 || sort !== "ending";

  const emptyTitle =
    baseCount === 0
      ? tab === "live"
        ? "No live camera gear auctions right now."
        : "No camera gear queued for the next auction yet."
      : "No listings match your filters.";

  const emptyBody =
    baseCount === 0
      ? tab === "live"
        ? "Check back soon — new cameras, lenses and accessories are added regularly. You can also browse what’s coming next."
        : "Try the Live tab, or come back later once new listings are approved and queued."
      : "Try a different search, clear filters, or switch tabs.";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Current auctions</h1>

          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            Browse live camera, lens and photography gear auctions — plus what’s coming next.
          </p>

          {/* Helpful internal links */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">New here?</span>
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

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-3">
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

          {/* Filters */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                  Search by title / brand / model
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Canon 5D", "Leica M6", "EF 24-70", "tripod"'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                  Sort
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ending">{tab === "live" ? "Ending soon" : "Starting soon"}</option>
                  <option value="newest">Newest</option>
                  <option value="az">Title A → Z</option>
                  <option value="priceLow">Price (Low → High)</option>
                  <option value="priceHigh">Price (High → Low)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-muted-foreground">
                Showing <span className="text-foreground font-semibold">{filtered.length}</span> of{" "}
                <span className="text-foreground font-semibold">{baseCount}</span> in this tab.
              </p>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSort("ending");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition w-full sm:w-auto"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {/* Notice */}
            <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Condition matters: sellers should describe cosmetic wear, faults, fungus/haze, shutter count (if known), and
                what’s included. Buyers should review the description carefully before bidding.{" "}
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
            <p className="font-semibold">{emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{emptyBody}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/current-listings"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition"
              >
                Refresh listings
              </Link>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing) => (
              <ListingCard key={listing.$id} listing={listing as any} />
            ))}
          </div>
        )}
      </section>
    </main>
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
        active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}