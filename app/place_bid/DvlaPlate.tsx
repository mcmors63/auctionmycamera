// app/place_bid/DvlaPlate.tsx
"use client";

import React from "react";
import NumberPlate from "@/components/ui/NumberPlate";

type DvlaPlateProps = {
  // Accept either "registration" or "reg" so it's flexible
  registration?: string;
  reg?: string;

  // What callers can pass in:
  size?: "standard" | "card" | "large";
  variant?: "front" | "rear";
};

export default function DvlaPlate({
  registration,
  reg,
  size = "standard",
  variant = "rear",
}: DvlaPlateProps) {
  // Prefer registration, then reg, then empty string
  const actualReg = (registration ?? reg ?? "") || "";

  // Map anything that's not "large" to "card" so it matches NumberPlate's type
  const normalisedSize: "card" | "large" =
    size === "large" ? "large" : "card";

  return (
    <NumberPlate
      reg={actualReg}
      size={normalisedSize}
      variant={variant}
      showBlueBand={true}
    />
  );
}
