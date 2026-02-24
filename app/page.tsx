// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import HomeBannerCarousel from "@/components/ui/HomeBannerCarousel";
import type { ReactNode } from "react";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// ✅ Sister sites (keep as constants to avoid typos)
const PLATE_URL = "https://auctionmyplate.co.uk";
const SEALABID_URL = "https://sealabid.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AuctionMyCamera | UK Camera & Photography Gear Auctions",
  description:
    "List your camera, lens, or photography gear for free. Weekly auctions, secure Stripe payments, optional free auto-relist until sold, and a clear step-by-step selling process.",
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    title: "AuctionMyCamera | UK Camera & Photography Gear Auctions",
    description:
      "List your camera, lens, or photography gear for free. Weekly auctions, secure Stripe payments, optional free auto-relist until sold, and a clear step-by-step selling process.",
    siteName: "AuctionMyCamera",
  },
  twitter: {
    card: "summary_large_image",
    title: "AuctionMyCamera | UK Camera & Photography Gear Auctions",
    description:
      "List your camera, lens, or photography gear for free. Weekly auctions, secure Stripe payments, optional free auto-relist until sold, and a clear step-by-step selling process.",
  },
};

const HERO_BG_SRC = "/hero/modern-lens.jpg";
const ANTIQUE_BG_SRC = "/hero/antique-cameras.jpg";

export default function HomePage() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AuctionMyCamera",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/logo.png`,
  };

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AuctionMyCamera",
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/current-listings?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AuctionMyCamera | UK Camera & Photography Gear Auctions",
    url: `${SITE_URL}/`,
    description:
      "List your camera, lens, or photography gear for free. Weekly auctions, secure payments, optional free auto-relist until sold, and a clear selling process.",
    isPartOf: {
      "@type": "WebSite",
      name: "AuctionMyCamera",
      url: `${SITE_URL}/`,
    },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is it free to list on AuctionMyCamera?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Listing is free during our launch period. You only pay commission if your item sells.",
        },
      },
      {
        "@type": "Question",
        name: "When do auctions run?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Auctions run weekly from Monday 01:00 to Sunday 23:00 (UK time). Approved listings are queued into the next weekly auction window.",
        },
      },
      {
        "@type": "Question",
        name: "What can I sell?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cameras, lenses, and photography gear. Create a listing with photos and details, then we’ll review and approve it for the next auction window.",
        },
      },
      {
        "@type": "Question",
        name: "How do payments work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Payments are handled securely through Stripe. Buyers and sellers follow clear steps during and after the sale.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Structured data (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background photo (modern lens) */}
        <div className="absolute inset-0">
          <Image
            src={HERO_BG_SRC}
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ opacity: 0.42 }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/30 to-background/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" />

          <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -top-36 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-18 lg:py-22">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide border border-border bg-card">
                <span className="text-primary">Weekly auctions</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Secure payments</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Modern + antique gear</span>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.02] tracking-tight">
                Sell camera gear
                <span className="block text-primary">through a weekly auction</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                List for free and reach serious UK buyers. Auctions run{" "}
                <span className="font-semibold text-foreground">Monday 01:00</span>{" "}
                to <span className="font-semibold text-foreground">Sunday 23:00</span>{" "}
                (UK time). Clear steps for sellers and secure Stripe checkout for buyers.
              </p>

              <p className="mt-3 text-sm text-muted-foreground max-w-xl">
                New here? Start with{" "}
                <Link href="/how-it-works" className="text-foreground underline hover:opacity-80">
                  how it works
                </Link>{" "}
                and{" "}
                <Link href="/fees" className="text-foreground underline hover:opacity-80">
                  fees
                </Link>
                .
              </p>

              <div className="mt-5 rounded-2xl border border-border bg-card px-4 py-3 max-w-xl">
                <p className="text-sm font-semibold">Free auto-relist until sold</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  If it doesn’t sell this week, you can have it automatically re-entered
                  into future weekly auctions — at no extra cost — until it sells.
                </p>
              </div>

              <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
                <Benefit title="Free to list" body="No listing fee to get started." />
                <Benefit title="Stripe payments" body="Secure checkout and clear steps." />
                <Benefit title="Reserves supported" body="Set a minimum you’re happy with." />
                <Benefit
                  title="Optional free auto-relist"
                  body="Unsold items can re-enter future auctions until sold."
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/current-listings"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Browse current auctions
                </Link>

                <Link
                  href="/sell"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Sell your gear
                </Link>

                <Link
                  href="/login-or-register"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Login / Register
                </Link>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-muted-foreground max-w-xl">
                Listings are approved, then queued for the next weekly auction window.
              </p>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-sm">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  Seller promise
                </p>

                <h3 className="mt-3 text-xl sm:text-2xl font-extrabold leading-tight">
                  List once.
                  <span className="block text-primary">
                    Keep it in the weekly auction until it sells.
                  </span>
                </h3>

                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  You can opt into free auto-relist — if it doesn’t sell, it rolls into the
                  next weekly auction automatically. No extra fees to keep it live.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniPoint>✓ Free to list</MiniPoint>
                  <MiniPoint>✓ Reserve supported</MiniPoint>
                  <MiniPoint>✓ Stripe checkout</MiniPoint>
                  <MiniPoint>✓ Auto-relist option</MiniPoint>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href="/sell"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Start selling
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    How it works
                  </Link>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  You’re always in control — auto-relist is optional.
                </p>
              </div>

              <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-sm">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  Auction schedule
                </p>

                <div className="mt-4 space-y-4">
                  <InfoRow
                    label="Opens"
                    value={
                      <>
                        <span className="font-semibold text-foreground">Monday</span>{" "}
                        <span className="text-muted-foreground">01:00</span>
                      </>
                    }
                  />
                  <InfoRow
                    label="Closes"
                    value={
                      <>
                        <span className="font-semibold text-foreground">Sunday</span>{" "}
                        <span className="text-muted-foreground">23:00</span>
                      </>
                    }
                  />
                  <InfoRow
                    label="If it doesn’t sell"
                    value={<span className="text-muted-foreground">Optional free auto-relist.</span>}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    href="/current-listings"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    View auctions
                  </Link>
                  <Link
                    href="/sell"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Start selling
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  Useful pages
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <QuickLink href="/sell">Sell your gear</QuickLink>
                  <QuickLink href="/current-listings">Current auctions</QuickLink>
                  <QuickLink href="/how-it-works">How it works</QuickLink>
                  <QuickLink href="/fees">Fees</QuickLink>
                  <QuickLink href="/faq">FAQ</QuickLink>
                  <QuickLink href="/about">About</QuickLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <HomeBannerCarousel />
      </section>

      {/* ✅ NEW: Sister marketplaces (subtle, premium, non-spammy) */}
      <section className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Also by the same team
            </p>

            <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                  Selling something else?
                  <span className="block text-primary">
                    Number Plates on AuctionMyPlate · Premium goods on Sealabid
                  </span>
                </h2>

                <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  We run specialist marketplaces with clear rules, secure payments, and a weekly rhythm
                  where it makes sense.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={PLATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl font-semibold text-sm text-center transition border border-border bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Visit AuctionMyPlate
                </a>

                <a
                  href={SEALABID_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl font-semibold text-sm text-center shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Visit Sealabid
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-border bg-background overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={ANTIQUE_BG_SRC}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="object-cover"
            style={{ opacity: 0.30 }}
          />

          <div className="absolute inset-0 bg-background/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/40 to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center">How it works</h2>
          <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">
            A simple weekly auction for cameras, lenses, and photography gear — modern and antique.
          </p>

          <div className="mt-10 grid md:grid-cols-4 gap-7">
            <StepCard step={1} title="Create your listing" body="Add details and upload clear photos of your item." />
            <StepCard
              step={2}
              title="We approve & queue it"
              body="Approved listings are placed into the next weekly auction window."
            />
            <StepCard step={3} title="Auction runs" body="Bidders compete Monday 01:00 to Sunday 23:00." />
            <StepCard step={4} title="Sold → confirm → payout" body="Buyer pays securely. You follow the next steps and payout is arranged." />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/how-it-works"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Read the full “How it works”
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-10 border border-border bg-card shadow-sm text-center">
          <h2 className="text-3xl font-bold">A calmer, safer way to trade camera gear</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for genuine buyers and sellers — with a clear weekly schedule, secure payments,
            optional free relist, and straightforward post-sale steps.
          </p>

          <div className="mt-7 grid sm:grid-cols-3 gap-3 text-left">
            <TrustItem title="Clear steps" body="Simple seller flow with approval before listings go live." />
            <TrustItem title="Secure payments" body="Stripe-powered checkout with straightforward confirmation steps." />
            <TrustItem title="Practical selling options" body="Hidden reserves supported and optional free auto-relist until sold." />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/current-listings"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Browse current auctions
            </Link>
            <Link
              href="/sell"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Sell your gear
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center">Quick answers</h2>
          <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">
            The common questions people ask before they bid or list.
          </p>

          <div className="mt-8 space-y-3">
            <FAQItem q="Is it free to list?">
              Yes — listing is free during our launch period. You only pay commission if your item sells.
            </FAQItem>
            <FAQItem q="When do auctions run?">
              Weekly from Monday 01:00 to Sunday 23:00 (UK time). Approved listings are queued into the next weekly window.
            </FAQItem>
            <FAQItem q="What can I sell?">
              Cameras, lenses, and photography gear. Create a listing with photos and details, then it’s reviewed before it goes live.
            </FAQItem>
            <FAQItem q="How do payments work?">
              Payments are handled securely through Stripe. Buyers and sellers follow clear steps during and after the sale.
            </FAQItem>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/fees"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Read Fees
            </Link>
            <Link
              href="/faq"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border border-border bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Full FAQ
            </Link>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl p-4 border border-border bg-card">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function MiniPoint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2 border border-border text-xs text-muted-foreground bg-background">
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-right">{value}</div>
    </div>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl p-5 border border-border bg-background">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function StepCard({ step, title, body }: { step: number; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl p-7 border border-border bg-card shadow-sm">
      <div className="absolute -top-5 left-6 h-10 w-10 rounded-full flex items-center justify-center font-extrabold text-lg shadow-sm bg-primary text-primary-foreground">
        {step}
      </div>

      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 border border-border text-sm text-center transition bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </Link>
  );
}

function FAQItem({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="rounded-2xl border border-border p-5 bg-card">
      <summary className="cursor-pointer font-semibold">{q}</summary>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</p>
    </details>
  );
}