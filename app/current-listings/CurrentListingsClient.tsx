"use client";

// app/current-listings/CurrentListingsClient.tsx
import Link from "next/link";
import { useMemo, useState } from "react";
import ListingCard from "./ListingCard";

type Props = {
  initialLive: any[];
  initialSoon: any[];
};

type Tab = "live" | "soon";

const ACCENT = "#d6b45f";
const BG = "#0b0c10";

function normalizeReg(input: string) {
  return (input || "").toLowerCase().replace(/\s+/g, "");
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

    const q = normalizeReg(search.trim());
    if (q) {
      results = results.filter((l) => normalizeReg(l.registration || "").includes(q));
    }

    if (sort === "ending") {
      results.sort((a, b) => {
        const aTime = Date.parse(
          a.auction_end ?? a.end_time ?? a.auction_start ?? a.start_time ?? a.$createdAt
        );
        const bTime = Date.parse(
          b.auction_end ?? b.end_time ?? b.auction_start ?? b.start_time ?? b.$createdAt
        );
        return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      });
    }

    if (sort === "newest") {
      results.sort((a, b) => Date.parse(b.$createdAt || "") - Date.parse(a.$createdAt || ""));
    }

    if (sort === "az") {
      results.sort((a, b) => (a.registration || "").localeCompare(b.registration || ""));
    }

    if (sort === "priceLow") {
      results.sort((a, b) => (a.current_bid || 0) - (b.current_bid || 0));
    }

    if (sort === "priceHigh") {
      results.sort((a, b) => (b.current_bid || 0) - (a.current_bid || 0));
    }

    return results;
  }, [source, search, sort]);

  const counts = {
    live: (initialLive || []).filter((l) => l && l.$id).length,
    soon: (initialSoon || []).filter((l) => l && l.$id).length,
  };

  const hasActiveFilters = search.trim().length > 0 || sort !== "ending";

  const emptyTitle =
    baseCount === 0
      ? tab === "live"
        ? "No live auctions right now."
        : "No plates queued for the next auction yet."
      : "No listings match your filters.";

  const emptyBody =
    baseCount === 0
      ? tab === "live"
        ? "Check back soon — new plates are added regularly. You can also browse what’s coming next."
        : "Try the Live tab, or come back later once new listings are approved and queued."
      : "Try a different registration search, reset filters, or switch tabs.";

  return (
    <main className="min-h-screen" style={{ backgroundColor: BG, color: "#e8e8e8" }}>
      {/* Header */}
      <section className="border-b" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Current auctions
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/70 max-w-2xl">
            Browse live auctions and upcoming queued plates. Unsold plates can optionally be auto-relisted
            for free until sold.
          </p>

          {/* Helpful internal links (good for users + crawl paths) */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/70">
            <span className="text-white/50">New here?</span>
            <Link href="/how-it-works" className="text-amber-200 hover:text-amber-100 underline">
              How it works
            </Link>
            <Link href="/fees" className="text-amber-200 hover:text-amber-100 underline">
              Fees
            </Link>
            <Link href="/sell-my-plate" className="text-amber-200 hover:text-amber-100 underline">
              Sell your plate
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
                  Search by registration
                </label>
                <input
                  type="text"
                  placeholder="e.g. AB12 CDE"
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
                  <option value="ending">Ending soon</option>
                  <option value="newest">Newest</option>
                  <option value="az">Registration A → Z</option>
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

            {/* Policy notice */}
            <div
              className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-[12px] text-white/70 leading-relaxed">
                DVLA transfer handling:{" "}
                <span style={{ color: ACCENT, fontWeight: 700 }}>most listings have no extra buyer DVLA fee</span>{" "}
                — the £80 paperwork cost is covered seller-side.{" "}
                <span style={{ color: ACCENT, fontWeight: 700 }}>Only two legacy listings</span> still add an extra £80
                to the winning bid at checkout (these are clearly labelled).{" "}
                <Link href="/fees" className="text-amber-200 hover:text-amber-100 underline">
                  See fees
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
                href="/sell-my-plate"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
              >
                Sell a plate
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
              <ListingCard key={listing.$id} listing={listing} />
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
