"use client";

import Image from "next/image";

type PlateHeroProps = {
  // Keep prop name so existing callers don't break.
  // In AuctionMyCamera this can be a listing title, lot ref, or short headline.
  registration?: string | null;
};

export default function PlateHero({ registration }: PlateHeroProps) {
  const label = (registration || "").trim();

  return (
    <div className="px-6 pb-6">
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black">
        {/* Fixed aspect ratio so the hero scales nicely */}
        <div className="relative w-full aspect-[16/9]">
          <Image
            src="/camera-hero.jpg"
            alt="Camera gear on a studio background"
            fill
            className="object-cover"
            priority
          />

          {/* Subtle overlay badge (replaces number plate) */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: "50%",
              top: "72%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="rounded-full border border-white/20 bg-black/55 px-4 py-2 text-white backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/75">
                Listing
              </p>
              <p className="text-sm md:text-base font-semibold leading-tight max-w-[260px] truncate text-center">
                {label ? label : "Browse cameras & gear"}
              </p>
            </div>
          </div>

          {/* Gentle gradient for readability */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        </div>
      </div>
    </div>
  );
}