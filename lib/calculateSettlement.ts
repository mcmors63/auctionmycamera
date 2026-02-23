// lib/calculateSettlement.ts
// AuctionMyCamera settlement logic (NO DVLA)
//
// Purpose:
// - Provide a single place to calculate commission tiers + seller payout.
// - Keep existing imports working: import { calculateSettlement } from "@/lib/calculateSettlement"

export type Settlement = {
  commissionRate: number;      // %
  commissionAmount: number;    // £ integer
  sellerPayout: number;        // £ integer

  // For consistent UI/email reporting
  listingFeeApplied: number;   // £ integer
};

export function calculateSettlement(
  salePrice: number,
  opts?: {
    listingFee?: number;              // optional listing fee charged to seller (£)
    commissionRateOverride?: number;  // optional fixed commission rate (%)
  }
): Settlement {
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error("Invalid sale price for settlement.");
  }

  const listingFee =
    typeof opts?.listingFee === "number" && opts.listingFee >= 0
      ? Math.round(opts.listingFee)
      : 0;

  let commissionRate: number;

  // If listing carries a specific commission rate, use it.
  if (
    typeof opts?.commissionRateOverride === "number" &&
    Number.isFinite(opts.commissionRateOverride) &&
    opts.commissionRateOverride >= 0
  ) {
    commissionRate = opts.commissionRateOverride;
  } else {
    // Default tiering (you can tweak these later)
    // Keep it simple + predictable.
    if (salePrice <= 499) {
      commissionRate = 12;
    } else if (salePrice <= 999) {
      commissionRate = 10;
    } else if (salePrice <= 2499) {
      commissionRate = 8;
    } else if (salePrice <= 4999) {
      commissionRate = 7;
    } else {
      commissionRate = 6;
    }
  }

  const commissionAmount = Math.round(salePrice * (commissionRate / 100));
  const sellerPayout = Math.max(0, salePrice - commissionAmount - listingFee);

  return {
    commissionRate,
    commissionAmount,
    sellerPayout,
    listingFeeApplied: listingFee,
  };
}