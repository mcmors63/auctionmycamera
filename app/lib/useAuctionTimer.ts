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

  return days > 0
    ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
    : `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

type UseAuctionTimerOptions = {
  endedLabel?: string;
  /**
   * Optional override for "now" (ms) - mainly for testing.
   * If not provided, uses Date.now().
   */
  nowMs?: () => number;
};

/**
 * useAuctionTimer
 * - Pass an ISO-ish date string (e.g. "2025-12-28T23:00:00.000Z")
 * - Returns either a countdown string like "01:23:45" / "2d 03:04:05"
 *   or "Auction Ended" (configurable).
 *
 * IMPORTANT: This hook re-initialises properly when auctionEnd changes.
 */
export function useAuctionTimer(
  auctionEnd?: string | null,
  options?: UseAuctionTimerOptions
) {
  const endedLabel = options?.endedLabel ?? "Auction Ended";
  const now = options?.nowMs ?? Date.now;

  const [timeLeft, setTimeLeft] = useState<string>("—");

  const endMs = useMemo(() => {
    if (!auctionEnd) return NaN;
    const parsed = Date.parse(auctionEnd);
    return Number.isNaN(parsed) ? NaN : parsed;
  }, [auctionEnd]);

  useEffect(() => {
    if (!auctionEnd || Number.isNaN(endMs)) {
      setTimeLeft(endedLabel);
      return;
    }

    const tick = () => {
      const diff = endMs - now();
      if (diff <= 0) setTimeLeft(endedLabel);
      else setTimeLeft(formatRemaining(diff));
    };

    tick();
    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, [auctionEnd, endMs, endedLabel, now]);

  return timeLeft;
}