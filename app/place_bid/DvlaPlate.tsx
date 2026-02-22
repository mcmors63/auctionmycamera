// app/place_bid/DvlaPlate.tsx
"use client";

import React from "react";
import PlatePreviewStatic from "../components/ui/PlatePreviewStatic";

type DvlaPlateProps = {
  // Accept either "registration" or "reg" so it's flexible
  registration?: string;
  reg?: string;

  // What callers can pass in:
  size?: "standard" | "card" | "large";
};

function normalizeReg(input: string) {
  return (input || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
}

export default function DvlaPlate({
  registration,
  reg,
  size = "standard",
}: DvlaPlateProps) {
  const actualReg = normalizeReg((registration ?? reg ?? "") || "");

  // Map sizes to sensible pixel dimensions for your static preview
  const dims =
    size === "large"
      ? { width: 420, height: 95 }
      : size === "card"
      ? { width: 300, height: 70 }
      : { width: 360, height: 80 }; // standard

  return (
    <PlatePreviewStatic
      registration={actualReg}
      width={dims.width}
      height={dims.height}
    />
  );
}