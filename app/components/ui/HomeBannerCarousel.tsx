// app/components/ui/HomeBannerCarousel.tsx
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
    title: "Free to list. Pay only when your item sells.",
    subtitle: "No subscriptions — just a success fee when the auction completes.",
    tag: "SELL WITH CLARITY",
  },
  {
    title: "Secure payments via Stripe.",
    subtitle:
      "We never store card details. Payments are encrypted and processed by Stripe.",
    tag: "SECURE PAYMENTS",
  },
  {
    title: "Weekly auctions, run on a fixed schedule.",
    subtitle:
      "Auctions run Monday 01:00 to Sunday 23:00 (UK time) — buyers know when to bid and sellers know when it ends.",
    tag: "WEEKLY AUCTIONS",
  },
  {
    title: "Straightforward selling process.",
    subtitle:
      "List your camera gear, get approved, then it’s queued into the next weekly auction window.",
    tag: "HOW IT WORKS",
  },
];

export default function HomeBannerCarousel() {
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = BANNERS.length;
  const current = BANNERS[index];

  const intervalRef = useRef<number | null>(null);

  const canAutoPlay = useMemo(
    () => count > 1 && !paused && !reduceMotion,
    [count, paused, reduceMotion]
  );

  const goTo = (i: number) => {
    if (count <= 0) return;
    const nextIdx = ((i % count) + count) % count;
    setIndex(nextIdx);
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Auto-rotate
  useEffect(() => {
    // Always clear any existing interval first (cheap safety)
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!canAutoPlay) return;

    intervalRef.current = window.setInterval(() => {
      setIndex((prevIdx) => (prevIdx + 1) % count);
    }, 6500);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [canAutoPlay, count]);

  // Pause when tab is hidden; resume when visible again
  useEffect(() => {
    const onVis = () => {
      setPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <section className="bg-background border-t border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Left label / badge */}
        <div className="w-full md:w-1/3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            <span className="text-primary" aria-hidden="true">
              ●
            </span>{" "}
            Key details
          </span>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
            The essentials — clear, factual, and consistent with how the platform works.
          </p>
        </div>

        {/* Right rotating content */}
        <div className="w-full md:w-2/3">
          <div
            className="relative overflow-hidden rounded-2xl bg-card border border-border px-4 sm:px-6 py-4 sm:py-5 shadow-sm"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label="Key details carousel"
          >
            {/* subtle top glow */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

            {/* Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous message"
                className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-foreground/80 hover:text-foreground hover:bg-accent transition"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next message"
                className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-foreground/80 hover:text-foreground hover:bg-accent transition"
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
                  <p className="text-[11px] sm:text-xs font-semibold text-primary tracking-[0.25em] uppercase mb-2">
                    {current.tag}
                  </p>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1">
                    {current.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
                      aria-label={`Show message ${i + 1} of ${count}`}
                      {...(active ? { "aria-current": "true" } : {})}
                      className={[
                        "h-2 rounded-full transition-all",
                        active ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40",
                      ].join(" ")}
                    />
                  );
                })}
              </div>

              {/* tiny status */}
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {index + 1}/{count}
                {paused ? " • paused" : ""}
              </p>
            </div>

            {/* Progress bar (resets each slide) */}
            {!reduceMotion && count > 1 && !paused && (
              <motion.div
                key={`bar-${index}`}
                className="mt-3 h-1 w-full rounded-full bg-border/60 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary"
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