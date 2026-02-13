// lib/useAuctionTimer.ts
"use client";

import { useEffect, useMemo, useState } from "react";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  // If you want it shorter, remove days formatting — but this is clear.
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
    : `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * useAuctionTimer
 * - Pass an ISO-ish date string (e.g. "2025-12-28T23:00:00.000Z")
 * - Returns either a countdown string like "01:23:45" / "2d 03:04:05"
 *   or "Auction Ended".
 *
 * IMPORTANT: This hook *re-initialises* properly when auctionEnd changes.
 */
export function useAuctionTimer(auctionEnd?: string | null) {
  const [timeLeft, setTimeLeft] = useState<string>("—");

  const endMs = useMemo(() => {
    if (!auctionEnd) return NaN;
    const parsed = Date.parse(auctionEnd);
    return Number.isNaN(parsed) ? NaN : parsed;
  }, [auctionEnd]);

  useEffect(() => {
    // Missing/invalid date = treat as ended (prevents "Invalid Date" issues)
    if (!auctionEnd || Number.isNaN(endMs)) {
      setTimeLeft("Auction Ended");
      return;
    }

    const tick = () => {
      const diff = endMs - Date.now();
      if (diff <= 0) setTimeLeft("Auction Ended");
      else setTimeLeft(formatRemaining(diff));
    };

    tick(); // immediate update (critical when the end time is updated/relisted)
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [auctionEnd, endMs]);

  return timeLeft;
}
