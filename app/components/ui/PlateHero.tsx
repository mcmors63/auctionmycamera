"use client";

import Image from "next/image";

type PlateHeroProps = {
  registration?: string | null;
};

export default function PlateHero({ registration }: PlateHeroProps) {
  return (
    <div className="px-6 pb-6">
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black">
        {/* Fix the aspect ratio so the image + plate scale nicely on any window size */}
        <div className="relative w-full aspect-[16/9]">
          <Image
            src="/car-rear.jpg"
            alt={`Rear of car with registration ${registration || ""}`}
            fill
            className="object-contain"
            priority
          />

          {/* Plate overlay, locked to a percentage position on the image */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: "50%",
              top: "72%", // tweak this if you want it higher/lower
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="flex items-center justify-center text-black font-bold"
              style={{
                backgroundColor: "#FFD500",
                fontFamily: "'Charles Wright','Arial Black',sans-serif",
                letterSpacing: "0.17em",
                fontSize: "1.45rem",
                width: "140px",
                height: "40px",
                border: "4px solid black",
              }}
            >
              {registration}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
