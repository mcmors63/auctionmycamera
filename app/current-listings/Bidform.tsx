"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";

interface BidFormProps {
  listingId: string;
  currentHighestBid: number;
}

export default function BidForm({ listingId, currentHighestBid }: BidFormProps) {
  const supabase = createClientComponentClient();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("⚠️ Please sign in to place a bid.");
      setSubmitting(false);
      return;
    }

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= currentHighestBid) {
      setMessage(`⚠️ Bid must be higher than £${currentHighestBid}.`);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("bids").insert([
      {
        listing_id: listingId,
        user_id: user.id,
        amount: bidAmount,
      },
    ]);

    if (error) {
      console.error("Bid submission error:", error);
      setMessage("❌ Failed to submit bid. Try again.");
    } else {
      setMessage("✅ Bid placed successfully!");
      setAmount("");
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleBid} className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter bid (£)"
          className="flex-1 border border-gray-300 rounded-lg p-2"
        />
        <Button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
        >
          {submitting ? "Placing..." : "Place Bid"}
        </Button>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  );
}
