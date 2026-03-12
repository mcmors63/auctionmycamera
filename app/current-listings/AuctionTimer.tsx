// app/current-listings/AuctionTimer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

type Props = {
  mode: "coming" | "live";
  /** Optional per-listing end time (ISO string). Used on place_bid page. */
  endTime?: string | null;
};

export default function AuctionTimer({ mode, endTime }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  const isComing = mode === "coming";

  // ✅ Hook must always run on every render
  const { target, label } = useMemo(() => {
    const { currentStart, currentEnd, nextStart } = getAuctionWindow();
    const compareNow = now ?? 0;

    if (mode === "coming") {
      if (compareNow < currentStart.getTime()) {
        return { target: currentStart, label: "Auction starts in" };
      }

      return { target: nextStart, label: "Auction starts in" };
    }

    if (endTime) {
      const parsed = new Date(endTime);
      if (!Number.isNaN(parsed.getTime())) {
        return { target: parsed, label: "Auction ends in" };
      }
    }

    return { target: currentEnd, label: "Auction ends in" };
  }, [mode, endTime, now]);

  // ✅ Safe to return after hooks have been called
  if (now === null) {
    return (
      <div
        className={`inline-flex flex-col rounded-md px-3 py-2 text-xs font-semibold shadow ring-1 ${
          isComing
            ? "bg-green-600 text-white ring-green-700/40"
            : "bg-black/85 text-white ring-black/20 backdrop-blur-sm"
        }`}
      >
        <span className="text-[10px] uppercase tracking-wide text-white/70">
          {isComing ? "Auction starts in" : "Auction ends in"}
        </span>
        <span className="mt-0.5 inline-flex items-center gap-1">
          <span aria-hidden="true">⏱</span>
          <span>Loading…</span>
        </span>
      </div>
    );
  }

  const diff = target.getTime() - now;

  if (diff <= 0) {
    return (
      <span
        className={`inline-flex items-center rounded-md px-3 py-2 text-xs font-semibold shadow ring-1 ${
          isComing
            ? "bg-green-600 text-white ring-green-700/40"
            : "bg-neutral-900 text-white ring-black/30"
        }`}
      >
        {isComing ? "Auction now live" : "Auction ended"}
      </span>
    );
  }

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return (
    <div className="inline-flex flex-col rounded-md bg-black/85 px-3 py-2 text-xs font-semibold text-white shadow ring-1 ring-black/20 backdrop-blur-sm">
      <span className="text-[10px] uppercase tracking-wide text-white/70">
        {label}
      </span>

      <span className="mt-0.5 inline-flex items-center gap-1">
        <span aria-hidden="true">⏱</span>
        <span>
          {days}d {hours.toString().padStart(2, "0")}h:
          {minutes.toString().padStart(2, "0")}m:
          {seconds.toString().padStart(2, "0")}s
        </span>
      </span>
    </div>
  );
}