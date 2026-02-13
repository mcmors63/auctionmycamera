"use client";
import { useEffect } from "react";

export default function AuctionRepairWorker() {
  useEffect(() => {
    const run = () => {
      fetch("/api/repair-auctions").catch(() => {});
    };

    // Run immediately on page load
    run();

    // Run every 20 minutes
    const id = setInterval(run, 20 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

  return null;
}
