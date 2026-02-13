"use client";

import { useEffect, useState } from "react";

export function useAuctionTimer(auctionEnd: string | Date) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!auctionEnd) return;

    const target = new Date(auctionEnd).getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;

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

    update(); // Run immediately
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [auctionEnd]);

  return timeLeft;
}
