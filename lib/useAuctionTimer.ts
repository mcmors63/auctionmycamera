"use client";

import { useEffect, useMemo, useState } from "react";

export function useAuctionTimer(auctionEnd: string | Date) {
  const [timeLeft, setTimeLeft] = useState("—");

  // Parse once per input change (not every second)
  const targetMs = useMemo(() => {
    if (!auctionEnd) return NaN;
    const ms = new Date(auctionEnd).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }, [auctionEnd]);

  useEffect(() => {
    if (!Number.isFinite(targetMs)) {
      setTimeLeft("—");
      return;
    }

    const update = () => {
      const now = Date.now();
      const diff = targetMs - now;

      if (diff <= 0) {
        setTimeLeft("Auction Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      let formatted = "";
      if (days > 0) formatted += `${days}d `;
      formatted += `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      setTimeLeft(formatted);
    };

    update();
    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, [targetMs]);

  return timeLeft;
}