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
  const [now, setNow] = useState(() => Date.now());

  // Tick every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { target, label } = useMemo(() => {
    const { currentStart, currentEnd, nextStart } = getAuctionWindow();

    // -------------------------
    // COMING MODE
    // -------------------------
    if (mode === "coming") {
      // If we haven't reached currentStart yet → count to currentStart
      if (now < currentStart.getTime()) {
        return { target: currentStart, label: "Auction starts in" };
      }

      // Otherwise → count to nextStart
      return { target: nextStart, label: "Auction starts in" };
    }

    // -------------------------
    // LIVE MODE
    // -------------------------
    // If a per-listing endTime is supplied (place_bid page), use that
    if (endTime) {
      const parsed = new Date(endTime);
      if (!isNaN(parsed.getTime())) {
        return { target: parsed, label: "Auction ends in" };
      }
    }

    // Fallback: use weekly auction window end
    return { target: currentEnd, label: "Auction ends in" };
  }, [mode, endTime, now]);

  const diff = target.getTime() - now;

  if (diff <= 0) {
    return (
      <p className="text-xs font-semibold text-green-700">
        {mode === "coming" ? "Auction now live" : "Auction ended"}
      </p>
    );
  }

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col text-xs font-semibold text-white">
      <span className="text-[10px] uppercase tracking-wide text-white/60">
        {label}
      </span>
      <span className="mt-0.5 inline-flex items-center gap-1">
        <span aria-hidden="true">⏱</span>
        <span className="text-white">
          {days}d {hours.toString().padStart(2, "0")}h:
          {minutes.toString().padStart(2, "0")}m:
          {seconds.toString().padStart(2, "0")}s
        </span>
      </span>
    </div>
  );
}