// lib/calculateSettlement.ts
// AuctionMyCamera settlement logic (NO DVLA)
//
// Purpose:
// - Provide a single place to calculate commission tiers + seller payout.
// - Keep existing imports working: import { calculateSettlement } from "@/lib/calculateSettlement"
//
// IMPORTANT (units):
// - This function expects salePrice in whole pounds (e.g. 250 not 25000).
// - It returns whole pounds (integers).
// - If you want pence-based settlement, create a separate calculateSettlementPence()
//   so we don't silently break existing behaviour.

export type Settlement = {
  commissionRate: number; // %
  commissionAmount: number; // £ integer
  sellerPayout: number; // £ integer

  // For consistent UI/email reporting
  listingFeeApplied: number; // £ integer
};

function assertWholePounds(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name} for settlement.`);
  }
  if (!Number.isInteger(value)) {
    throw new Error(
      `Invalid ${name}: expected whole pounds integer (e.g. 250), got ${value}.`
    );
  }

  // Heuristic guard: if someone accidentally passes pence (e.g. 25000),
  // this will at least shout when the number looks suspiciously large.
  if (value >= 100000) {
    throw new Error(
      `Invalid ${name}: value looks like pence (${value}). Pass whole pounds (e.g. 250) instead.`
    );
  }
}

export function calculateSettlement(
  salePrice: number,
  opts?: {
    listingFee?: number; // optional listing fee charged to seller (£, whole pounds)
    commissionRateOverride?: number; // optional fixed commission rate (%)
  }
): Settlement {
  assertWholePounds("salePrice", salePrice);

  const listingFeeRaw = opts?.listingFee;

  const listingFee =
    typeof listingFeeRaw === "number" && Number.isFinite(listingFeeRaw)
      ? listingFeeRaw
      : 0;

  if (listingFee < 0) {
    throw new Error("Invalid listingFee: must be >= 0.");
  }
  if (!Number.isInteger(listingFee)) {
    throw new Error(
      `Invalid listingFee: expected whole pounds integer (e.g. 10), got ${listingFee}.`
    );
  }

  let commissionRate: number;

  // If listing carries a specific commission rate, use it.
  if (
    typeof opts?.commissionRateOverride === "number" &&
    Number.isFinite(opts.commissionRateOverride) &&
    opts.commissionRateOverride >= 0
  ) {
    commissionRate = opts.commissionRateOverride;
  } else {
    // Default tiering (tweak later if needed)
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

  // In whole pounds; rounding is OK because salePrice is integer pounds.
  const commissionAmount = Math.round(salePrice * (commissionRate / 100));
  const sellerPayout = Math.max(0, salePrice - commissionAmount - listingFee);

  return {
    commissionRate,
    commissionAmount,
    sellerPayout,
    listingFeeApplied: listingFee,
  };
}