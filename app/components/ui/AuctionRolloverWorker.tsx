"use client";

import { useEffect } from "react";

export default function AuctionRolloverWorker() {
  useEffect(() => {
    const tick = () => {
      fetch("/api/auction-rollover")
        .then((r) => r.json())
        .then((data) =>
          console.log("🔄 Rollover check:", data.timestamp, data.changes)
        )
        .catch((err) => console.error("Rollover failed:", err));
    };

    tick(); // run immediately on page load

    const id = setInterval(tick, 60_000); // run every 60s

    return () => clearInterval(id);
  }, []);

  return null;
}
