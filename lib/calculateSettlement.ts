// lib/calculateSettlement.ts

export type DvlaFeePayer = "seller" | "buyer";

export type Settlement = {
  commissionRate: number; // %
  commissionAmount: number; // integer fee you keep
  sellerPayout: number; // integer seller gets
  dvlaFee: number; // integer DVLA fee (e.g. 80 for £80)

  // Extra fields to make emails/UI consistent without guessing
  dvlaFeePayer: DvlaFeePayer;
  listingFeeApplied: number;
};

// ONLY these two legacy listings have the DVLA fee charged to the buyer.
export const LEGACY_BUYER_PAYS_DVLA_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

export function getDvlaFeePayerForListing(listingId?: string): DvlaFeePayer {
  if (!listingId) return "seller";
  return LEGACY_BUYER_PAYS_DVLA_IDS.has(listingId) ? "buyer" : "seller";
}

export function calculateSettlement(
  salePrice: number,
  opts?: {
    listingId?: string;
    dvlaFeePayer?: DvlaFeePayer;
    listingFee?: number; // optional listing fee charged to seller
    commissionRateOverride?: number; // optional fixed commission rate
    dvlaFeeOverride?: number; // if ever needed in future
  }
): Settlement {
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error("Invalid sale price for settlement.");
  }

  const dvlaFee = Number.isFinite(opts?.dvlaFeeOverride as number)
    ? Number(opts!.dvlaFeeOverride)
    : 80;

  const listingFee =
    typeof opts?.listingFee === "number" && opts.listingFee >= 0
      ? Math.round(opts.listingFee)
      : 0;

  const dvlaFeePayer: DvlaFeePayer =
    opts?.dvlaFeePayer || getDvlaFeePayerForListing(opts?.listingId);

  let commissionRate: number;

  if (
    typeof opts?.commissionRateOverride === "number" &&
    opts.commissionRateOverride >= 0
  ) {
    commissionRate = opts.commissionRateOverride;
  } else {
    if (salePrice <= 4999) {
      commissionRate = 10;
    } else if (salePrice <= 9999) {
      commissionRate = 8;
    } else if (salePrice <= 24999) {
      commissionRate = 7;
    } else if (salePrice <= 49999) {
      commissionRate = 6;
    } else {
      commissionRate = 5;
    }
  }

  const commissionAmount = Math.round(salePrice * (commissionRate / 100));

  // DVLA fee is deducted from seller payout by default.
  // Only the two legacy listing IDs charge DVLA fee to the buyer.
  const dvlaDeduction = dvlaFeePayer === "seller" ? dvlaFee : 0;

  const sellerPayout = salePrice - commissionAmount - listingFee - dvlaDeduction;

  return {
    commissionRate,
    commissionAmount,
    sellerPayout,
    dvlaFee,
    dvlaFeePayer,
    listingFeeApplied: listingFee,
  };
}
