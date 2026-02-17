"use client";

// app/current-listings/CurrentListingsClient.tsx
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

const ACCENT = "#d6b45f";
const BG = "#0b0c10";

function normalizeText(input: string) {
  return (input || "").toLowerCase().replace(/\s+/g, " ").trim();
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
  if (gearType) return gearType;

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

function timeForEndingSort(l: ListingLike, tab: Tab) {
  // Live: sort by auction end
  if (tab === "live") {
    return Date.parse(
      l.auction_end ?? l.end_time ?? l.auction_start ?? l.start_time ?? l.$createdAt ?? ""
    );
  }

  // Coming next: sort by auction start (more sensible)
  return Date.parse(l.auction_start ?? l.start_time ?? l.auction_end ?? l.end_time ?? l.$createdAt ?? "");
}

export default function CurrentListingsClient({ initialLive, initialSoon }: Props) {
  const [tab, setTab] = useState<Tab>("live");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("ending");

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
      results.sort((a, b) => {
        const aTime = timeForEndingSort(a, tab);
        const bTime = timeForEndingSort(b, tab);
        return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      });
    }

    if (sort === "newest") {
      results.sort((a, b) => Date.parse(b.$createdAt || "") - Date.parse(a.$createdAt || ""));
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
    <main className="min-h-screen" style={{ backgroundColor: BG, color: "#e8e8e8" }}>
      {/* Header */}
      <section className="border-b" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Current auctions
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/70 max-w-2xl">
            Browse live camera, lens and photography gear auctions — plus what’s coming next.
          </p>

          {/* Helpful internal links */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/70">
            <span className="text-white/50">New here?</span>
            <Link href="/how-it-works" className="text-amber-200 hover:text-amber-100 underline">
              How it works
            </Link>
            <Link href="/fees" className="text-amber-200 hover:text-amber-100 underline">
              Fees
            </Link>
            <Link href="/sell" className="text-amber-200 hover:text-amber-100 underline">
              Sell your gear
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-3">
            <TabButton active={tab === "live"} onClick={() => setTab("live")} label={`Live (${counts.live})`} />
            <TabButton
              active={tab === "soon"}
              onClick={() => setTab("soon")}
              label={`Coming next (${counts.soon})`}
            />
          </div>

          {/* Filters */}
          <div
            className="mt-6 rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold tracking-wide text-white/60 uppercase mb-2">
                  Search by title / brand / model
                </label>
                <input
                  type="text"
                  placeholder='e.g. "Canon 5D", "Leica M6", "EF 24-70", "tripod"'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border text-sm text-white placeholder-white/40 focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.14)" }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-white/60 uppercase mb-2">
                  Sort
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border text-sm text-white focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.14)" }}
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
              <p className="text-[12px] text-white/60 explain">
                Showing <span className="text-white/80 font-semibold">{filtered.length}</span> of{" "}
                <span className="text-white/80 font-semibold">{baseCount}</span> in this tab.
              </p>

              {hasActiveFilters ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setSort("ending");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition w-full sm:w-auto"
                  style={{
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {/* Notice */}
            <div
              className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-[12px] text-white/70 leading-relaxed">
                Condition matters: sellers should describe cosmetic wear, faults, fungus/haze, shutter count (if known), and
                what’s included. Buyers should review the description carefully before bidding.{" "}
                <Link href="/faq" className="text-amber-200 hover:text-amber-100 underline">
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
          <div
            className="rounded-3xl border p-10 text-center"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <p className="text-white font-semibold">{emptyTitle}</p>
            <p className="mt-2 text-sm text-white/65">{emptyBody}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/current-listings"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition"
                style={{
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "#ffffff",
                }}
              >
                Refresh listings
              </Link>
              <Link
                href="/sell"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
              >
                Sell camera gear
              </Link>
              <Link
                href="/how-it-works"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition"
                style={{
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "#ffffff",
                }}
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
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-semibold border transition"
      style={{
        borderColor: active ? "rgba(214,180,95,0.55)" : "rgba(255,255,255,0.14)",
        backgroundColor: active ? "rgba(214,180,95,0.12)" : "rgba(255,255,255,0.03)",
        color: active ? "#ffffff" : "rgba(255,255,255,0.75)",
      }}
    >
      {label}
    </button>
  );
}
