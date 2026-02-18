"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = BANNERS.length;
  const current = BANNERS[index];

  const intervalRef = useRef<number | null>(null);

  const canAutoPlay = useMemo(() => count > 1 && !paused && !reduceMotion, [count, paused, reduceMotion]);

  const goTo = (i: number) => {
    if (count <= 0) return;
    const next = ((i % count) + count) % count;
    setIndex(next);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Auto-rotate
  useEffect(() => {
    if (!canAutoPlay) return;

    intervalRef.current = window.setInterval(() => {
      setIndex((prevIdx) => (prevIdx + 1) % count);
    }, 6500);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [canAutoPlay, count]);

  // Pause when tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
          <div
            className="relative overflow-hidden rounded-2xl bg-black/80 border border-gold/35 px-4 sm:px-6 py-4 sm:py-5 shadow-2xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            {/* subtle top glow */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />

            {/* Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous banner"
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next banner"
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                ›
              </button>
            </div>

            {/* Animated content */}
            <div className="relative" aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <p className="text-[11px] sm:text-xs font-semibold text-gold tracking-[0.25em] uppercase mb-2">
                    {current.tag}
                  </p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1">
                    {current.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                    {current.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots (clickable) */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-label="Carousel progress">
                {BANNERS.map((_, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Show banner ${i + 1} of ${count}`}
                      aria-current={active ? "true" : "false"}
                      className={[
                        "h-2 rounded-full transition-all",
                        active ? "w-6 bg-gold" : "w-2 bg-gray-600 hover:bg-gray-500",
                      ].join(" ")}
                    />
                  );
                })}
              </div>

              {/* tiny status */}
              <p className="text-[10px] sm:text-xs text-gray-400">
                {index + 1}/{count}
                {paused ? " • paused" : ""}
              </p>
            </div>

            {/* Progress bar (resets each slide) */}
            {!reduceMotion && count > 1 && !paused && (
              <motion.div
                key={`bar-${index}`}
                className="mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-gold"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 6.5, ease: "linear" }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
