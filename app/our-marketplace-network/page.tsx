import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Marketplace Network",
  description:
    "AuctionMyCamera is part of a growing UK specialist marketplace network. Explore our focused platforms for camera gear, number plates, and premium sealed-bid sales.",
  alternates: {
    canonical: "/our-marketplace-network",
  },
};

export default function OurMarketplaceNetworkPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-8 shadow-sm sm:p-10">
          <p className="mb-3 inline-flex items-center rounded-full border border-border/60 bg-background/50 px-4 py-2 text-sm font-medium">
            Part of a specialist UK marketplace network
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Our Marketplace Network
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-foreground/80">
            AuctionMyCamera is part of a growing UK-based network of specialist marketplaces.
            We don’t try to sell everything. We build focused platforms for specific communities —
            with structured auctions, secure payments, and professional standards throughout.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#marketplaces"
              className="inline-flex items-center justify-center rounded-2xl bg-foreground px-6 py-3 text-base font-semibold text-background shadow-sm transition hover:opacity-90"
            >
              Explore our marketplaces
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card px-6 py-3 text-base font-semibold text-foreground shadow-sm transition hover:bg-card/70"
            >
              Back to AuctionMyCamera
            </Link>
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-6 rounded-3xl border border-border/60 bg-card/70 p-8 shadow-sm sm:grid-cols-2 sm:p-10">
          <div>
            <h2 className="text-2xl font-bold">Why we build specialist platforms</h2>
            <p className="mt-3 leading-relaxed text-foreground/80">
              Specialist marketplaces outperform general ones because the audience is targeted,
              the format is predictable, and trust builds faster. Buyers know exactly what they’ll
              find, and sellers reach people who actually care about the category.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Dedicated audience per category",
              "Structured weekly auction cycles",
              "Clear fee transparency",
              "Secure Stripe payments",
              "UK-based operation",
              "Professional presentation standards",
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm font-medium"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Marketplace cards */}
      <section id="marketplaces" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Our marketplaces</h2>
          <p className="mt-2 text-foreground/80">
            Same core standards. Different category focus. Built for the people who actually care.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* AuctionMyCamera */}
          <div className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
              Specialist marketplace
            </div>
            <h3 className="text-xl font-extrabold">AuctionMyCamera</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              A focused marketplace for camera bodies, lenses, and specialist gear — built for
              photographers, enthusiasts, and serious buyers.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              <li>• Bodies, lenses, and kit</li>
              <li>• Weekly auction cycles</li>
              <li>• Secure payments</li>
              <li>• Clean, category-first browsing</li>
            </ul>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
              >
                Explore AuctionMyCamera
              </Link>
            </div>
          </div>

          {/* AuctionMyPlate */}
          <div className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-sm">
            <div className="mb-4 inline-flex rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold">
              Flagship marketplace
            </div>
            <h3 className="text-xl font-extrabold">AuctionMyPlate</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              UK private number plate auctions — structured weekly auctions, hidden reserves, and
              clear transfer guidance.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              <li>• Weekly Monday–Sunday auctions</li>
              <li>• Hidden reserve pricing</li>
              <li>• Secure card payments</li>
              <li>• DVLA transfer guidance</li>
            </ul>

            <div className="mt-6">
              <a
                href="https://auctionmyplate.co.uk"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-5 py-3 font-semibold text-foreground transition hover:bg-card/70"
                rel="noopener noreferrer"
                target="_blank"
              >
                Visit AuctionMyPlate
              </a>
            </div>
          </div>

          {/* Sealabid */}
          <div className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-sm">
            <div className="mb-4 inline-flex rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold">
              Premium & discreet
            </div>
            <h3 className="text-xl font-extrabold">Sealabid</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              A sealed-bid marketplace designed for discretion — private offers, seller control,
              and outcomes that don’t need to be public to be real.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              <li>• Private offers (sealed bids)</li>
              <li>• Sellers choose the buyer</li>
              <li>• No public sold prices</li>
              <li>• Premium positioning</li>
            </ul>

            <div className="mt-6">
              <a
                href="https://sealabid.com"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-5 py-3 font-semibold text-foreground transition hover:bg-card/70"
                rel="noopener noreferrer"
                target="_blank"
              >
                Discover Sealabid
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-8 shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold">Built for trust, built for specialists</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-foreground/80">
            Our vision is simple: instead of one generic marketplace, we build multiple focused platforms —
            each tailored to its category, community, and expectations. Every marketplace in our network follows
            the same core principles: secure payments, transparent fees, structured auction logic, and professional presentation.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-2xl bg-foreground px-6 py-3 font-semibold text-background transition hover:opacity-90"
            >
              See how auctions work
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card px-6 py-3 font-semibold text-foreground transition hover:bg-card/70"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}