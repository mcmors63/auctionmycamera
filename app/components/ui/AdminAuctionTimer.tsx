// app/components/ui/AdminAuctionTimer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuctionWindow } from "@/lib/getAuctionWindow";

type AdminAuctionTimerProps = {
  /** Auction start time from Appwrite, ISO string or null/undefined */
  start?: string | null;
  /** Auction end time from Appwrite, ISO string or null/undefined */
  end?: string | null;
  /** How to interpret the timer */
  status?: "queued" | "live" | "ended";
};

export default function AdminAuctionTimer({
  start,
  end,
  status = "queued",
}: AdminAuctionTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const info = useMemo(() => {
    const nowDate = new Date(now);
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    // QUEUED → show countdown to auction start
    // 1) If we have explicit auction_start -> use that
    // 2) Otherwise fall back to the next weekly auction window
    if (status === "queued") {
      if (startDate && !isNaN(startDate.getTime())) {
        return { label: "Auction starts in", target: startDate };
      }
      const { nextStart } = getAuctionWindow(nowDate);
      return { label: "Auction starts in", target: nextStart };
    }

    // LIVE → show countdown to end
    // 1) If we have explicit auction_end -> use that
    // 2) Otherwise fall back to current weekly window end
    if (status === "live") {
      if (endDate && !isNaN(endDate.getTime())) {
        return { label: "Auction ends in", target: endDate };
      }
      const { currentEnd } = getAuctionWindow(nowDate);
      return { label: "Auction ends in", target: currentEnd };
    }

    // ENDED → nothing to count down
    if (status === "ended") {
      return null;
    }

    return null;
  }, [start, end, status, now]);

  if (!info) return null;

  const { label, target } = info;
  const diff = target.getTime() - now;

  // Target passed
  if (diff <= 0) {
    return (
      <p className="text-xs font-semibold text-gray-600">
        {status === "queued"
          ? "Auction now live"
          : status === "live"
          ? "Auction ended"
          : "Auction ended"}
      </p>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex flex-col text-xs font-semibold text-gray-800">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="mt-0.5 inline-flex items-center gap-1">
        <span>⏱</span>
        <span>
          {days}d {hours.toString().padStart(2, "0")}h:
          {minutes.toString().padStart(2, "0")}m:
          {seconds.toString().padStart(2, "0")}s
        </span>
      </span>
    </div>
  );
}
