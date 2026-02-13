"use client";

import { useAuctionTimer } from "../../../lib/useAuctionTimer";

interface Props {
  auctionEnd: string;
}

export default function AuctionCountdown({ auctionEnd }: Props) {
  const timeLeft = useAuctionTimer(auctionEnd);

  if (!auctionEnd) return null;

  const remainingMs = new Date(auctionEnd).getTime() - Date.now();
  const lessThanFiveMinutes = remainingMs <= 5 * 60 * 1000 && remainingMs > 0;

  return (
    <div
      className={`text-lg font-bold ${
        lessThanFiveMinutes ? "text-red-600 animate-pulse" : "text-yellow-700"
      }`}
    >
      {timeLeft === "Auction Ended" ? (
        <span className="text-gray-500 font-semibold">Auction Ended</span>
      ) : (
        <span>
          🕒 Ends in: <span className="font-mono">{timeLeft}</span>
        </span>
      )}
    </div>
  );
}
