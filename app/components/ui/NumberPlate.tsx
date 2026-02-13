// components/ui/NumberPlate.tsx
"use client";

import React from "react";
import { formatUkRegistration } from "@/lib/formatUkRegistration";

type NumberPlateProps = {
  reg: string;
  size?: "large" | "card";
  variant?: "front" | "rear";
  showBlueBand?: boolean;
};

export default function NumberPlate({
  reg,
  size = "card",
  variant = "rear",
  showBlueBand = false,
}: NumberPlateProps) {
  // Normalise input and apply DVLA-style formatting
  const cleaned = (reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const formatted = cleaned ? formatUkRegistration(cleaned) : "";
  const display = formatted || "YOUR REG"; // placeholder like live site

  // Try to keep correct group spacing: split at the single space if present
  let leftGroup = display;
  let rightGroup: string | null = null;

  const parts = display.split(" ");
  if (parts.length === 2) {
    leftGroup = parts[0];
    rightGroup = parts[1];
  }

  // Sizes
  const plateHeight = size === "large" ? "h-24 md:h-28" : "h-16 md:h-20";
  const textSize =
    size === "large" ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl";
  const contentPadding =
    size === "large" ? "px-6 md:px-8" : "px-4 md:px-6";

  const bgColour = variant === "front" ? "bg-[#FDFDF5]" : "bg-[#F4D23C]";
  const textColour = "text-black";

  return (
    <div
      className={[
        "inline-flex items-center rounded-md md:rounded-lg border-[3px] md:border-4 border-black shadow-md overflow-hidden",
        bgColour,
        plateHeight,
      ].join(" ")}
    >
      {showBlueBand && (
        <div className="h-full w-8 md:w-10 bg-[#003399] flex flex-col items-center justify-center text-[9px] md:text-[10px] text-white font-semibold leading-tight">
          <span className="text-[8px] md:text-[9px]">UK</span>
        </div>
      )}

      <div
        className={[
          "flex-1 flex items-center justify-center",
          contentPadding,
        ].join(" ")}
      >
        {rightGroup ? (
          <div className="flex items-baseline justify-center gap-[0.45em] md:gap-[0.5em]">
            <span
              className={[
                "number-plate-text",
                textSize,
                textColour,
                "font-bold tracking-[0.04em] leading-none",
              ].join(" ")}
            >
              {leftGroup}
            </span>
            <span
              className={[
                "number-plate-text",
                textSize,
                textColour,
                "font-bold tracking-[0.04em] leading-none",
              ].join(" ")}
            >
              {rightGroup}
            </span>
          </div>
        ) : (
          <span
            className={[
              "number-plate-text",
              textSize,
              textColour,
              "font-bold tracking-[0.04em] leading-none",
            ].join(" ")}
          >
            {leftGroup}
          </span>
        )}
      </div>
    </div>
  );
}
