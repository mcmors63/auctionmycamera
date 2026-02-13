"use client";

import { formatUkRegistration } from "@/lib/formatUkRegistration";

type DvlaPlateProps = {
  registration: string;
  size?: "large" | "medium" | "small";
  variant?: "front" | "rear"; // front = white, rear = yellow
  showBlueBand?: boolean;
};

const SIZE_CLASSES: Record<NonNullable<DvlaPlateProps["size"]>, string> = {
  large: "h-24 text-5xl px-6",
  medium: "h-20 text-4xl px-5",
  small: "h-12 text-2xl px-4",
};

export default function DvlaPlate({
  registration,
  size = "medium",
  variant = "rear",
  showBlueBand = true,
}: DvlaPlateProps) {
  const text = formatUkRegistration(registration);

  const bgColour =
    variant === "front" ? "bg-[#FDFDF5]" : "bg-[#F8E55A]"; // off-white / yellow

  return (
    <div
      className={`inline-flex items-center rounded-md border-[6px] border-black overflow-hidden ${bgColour} ${SIZE_CLASSES[size]}`}
    >
      {showBlueBand && (
        <div className="h-full w-8 bg-[#003399] flex items-center justify-center mr-3">
          <span className="text-[9px] font-semibold text-white tracking-[0.08em] leading-none">
            UK
          </span>
        </div>
      )}

      <span
        className={`flex-1 text-center font-bold text-black tracking-[0.03em]`}
      >
        {text}
      </span>
    </div>
  );
}
