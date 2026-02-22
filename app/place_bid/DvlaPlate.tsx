"use client";

import React from "react";
import PlatePreviewStatic from "@/components/ui/PlatePreviewStatic";

type DvlaPlateProps = {
  registration?: string;
  reg?: string;
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

  const dims =
    size === "large"
      ? { width: 420, height: 95 }
      : size === "card"
      ? { width: 300, height: 70 }
      : { width: 360, height: 80 };

  return (
    <PlatePreviewStatic
      registration={actualReg}
      width={dims.width}
      height={dims.height}
    />
  );
}