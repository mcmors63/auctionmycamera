"use client";

import { useEffect, useState } from "react";

type BannerItem = {
  title: string;
  subtitle: string;
  tag: string;
};

const BANNERS: BannerItem[] = [
  {
    title: "Free to list. Pay only when your plate sells.",
    subtitle:
      "No listing fees, no subscriptions — just a success fee when the auction completes.",
    tag: "SELL WITH CLARITY",
  },
  {
    title: "Secure card payments via Stripe.",
    subtitle:
      "We never store card details. Payments are encrypted and processed by Stripe.",
    tag: "SECURE PAYMENTS",
  },
  {
    title: "Weekly auctions, run on a fixed schedule.",
    subtitle:
      "Auctions run Monday 01:00 to Sunday 23:00 — so buyers know when to bid and sellers know when it ends.",
    tag: "WEEKLY AUCTIONS",
  },
  {
    title: "Transfer handled on your behalf after sale.",
    subtitle:
      "Once a plate sells, we manage the DVLA-style transfer process and keep both sides updated.",
    tag: "TRANSFER HANDLED",
  },
];

export default function HomeBannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (BANNERS.length <= 1) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 6500);

    return () => clearInterval(id);
  }, []);

  const current = BANNERS[index];

  return (
    <section className="bg-black border-t border-b border-gold/25">
      <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Left label / badge */}
        <div className="w-full md:w-1/3">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/70 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-gold uppercase">
            <span className="text-gold">●</span> Key details
          </span>
          <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-xs leading-relaxed">
            The essentials — clear, factual, and consistent with how the platform works.
          </p>
        </div>

        {/* Right rotating content */}
        <div className="w-full md:w-2/3">
          <div className="relative overflow-hidden rounded-2xl bg-black/80 border border-gold/35 px-4 sm:px-6 py-4 sm:py-5 shadow-2xl">
            <p className="text-[11px] sm:text-xs font-semibold text-gold tracking-[0.25em] uppercase mb-2">
              {current.tag}
            </p>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
              {current.subtitle}
            </p>

            {/* Dots */}
            <div className="mt-4 flex gap-1.5" aria-label="Carousel progress">
              {BANNERS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-gold" : "w-2 bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
