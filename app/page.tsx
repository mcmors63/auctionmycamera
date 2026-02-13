// app/page.tsx
import type React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import HomeBannerCarousel from "@/components/ui/HomeBannerCarousel";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
    /\/+$/,
    ""
  );

export const metadata: Metadata = {
  title: "AuctionMyPlate | UK Cherished Number Plate Auctions",
  description:
    "List your cherished number plate for free. Weekly DVLA-style auctions, secure Stripe payments, optional free auto-relist until sold, and transfer handled on your behalf after sale.",
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/`,
    title: "AuctionMyPlate | UK Cherished Number Plate Auctions",
    description:
      "List your cherished number plate for free. Weekly DVLA-style auctions, secure Stripe payments, optional free auto-relist until sold, and transfer handled on your behalf after sale.",
    siteName: "AuctionMyPlate",
  },
  twitter: {
    card: "summary_large_image",
    title: "AuctionMyPlate | UK Cherished Number Plate Auctions",
    description:
      "List your cherished number plate for free. Weekly DVLA-style auctions, secure Stripe payments, optional free auto-relist until sold, and transfer handled on your behalf after sale.",
  },
};

const ACCENT = "#d6b45f"; // warm gold
const BG = "#0b0c10"; // deep charcoal

export default function HomePage() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AuctionMyPlate",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/brand/logo.png`,
  };

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AuctionMyPlate",
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
    name: "AuctionMyPlate | UK Cherished Number Plate Auctions",
    url: `${SITE_URL}/`,
    description:
      "List your cherished number plate for free. Weekly auctions, secure payments, optional free auto-relist until sold, and transfer handled after sale.",
    isPartOf: {
      "@type": "WebSite",
      name: "AuctionMyPlate",
      url: `${SITE_URL}/`,
    },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is it free to list a number plate on AuctionMyPlate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Listing is free during our launch period. You only pay commission if your plate sells.",
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
        name: "Who pays the DVLA £80 fee?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "By default the seller covers the DVLA £80 assignment fee and it is deducted from the seller payout when a sale completes. A small number of older legacy listings charge this to the buyer and will be clearly labelled on the listing and at checkout.",
        },
      },
      {
        "@type": "Question",
        name: "Is AuctionMyPlate affiliated with the DVLA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. AuctionMyPlate is an independent marketplace and is not affiliated with, authorised by, endorsed by, or associated with the DVLA.",
        },
      },
    ],
  };

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: BG,
        color: "#e8e8e8",
      }}
    >
      {/* Structured data (SEO) */}
      <Script
        id="ld-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <Script
        id="ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <Script
        id="ld-webpage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <Script
        id="ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Premium background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 12% 20%, rgba(214,180,95,0.14), transparent 60%)," +
              "radial-gradient(800px 500px at 82% 10%, rgba(255,255,255,0.06), transparent 62%)," +
              "linear-gradient(180deg, rgba(0,0,0,0.82), rgba(0,0,0,0.96))",
          }}
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-18 sm:py-20 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* LEFT */}
            <div className="lg:col-span-7">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide border"
                style={{
                  borderColor: "rgba(214,180,95,0.32)",
                  backgroundColor: "rgba(0,0,0,0.45)",
                  color: "rgba(214,180,95,0.95)",
                }}
              >
                Weekly auctions • Secure payments • Transfer handled for you
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.02] tracking-tight text-white">
                Sell a cherished number plate
                <span className="block" style={{ color: ACCENT }}>
                  through a weekly auction
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
                List for free and reach serious UK buyers. Auctions run{" "}
                <span className="font-semibold text-white">Monday 01:00</span> to{" "}
                <span className="font-semibold text-white">Sunday 23:00</span>.
                When your plate sells,{" "}
                <span className="font-semibold text-white">
                  we handle the transfer on your behalf
                </span>
                .
              </p>

              <p className="mt-3 text-sm text-white/70 max-w-xl">
                New here? Start with{" "}
                <Link
                  href="/how-it-works"
                  className="text-amber-200 hover:text-amber-100 underline"
                >
                  how it works
                </Link>{" "}
                and{" "}
                <Link
                  href="/fees"
                  className="text-amber-200 hover:text-amber-100 underline"
                >
                  fees
                </Link>
                .
              </p>

              {/* Reduced “auto-relist” strip (kept at the top) */}
              <div
                className="mt-5 rounded-2xl border px-4 py-3 max-w-xl"
                style={{
                  borderColor: "rgba(214,180,95,0.18)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <p className="text-sm font-semibold text-white">
                  Free auto-relist until sold
                </p>
                <p className="mt-1 text-xs text-white/70 leading-relaxed">
                  If it doesn’t sell this week, you can have it automatically
                  re-entered into future weekly auctions — at no extra cost —
                  until it sells.
                </p>
              </div>

              {/* Premium benefit row */}
              <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
                <Benefit title="Free to list" body="No listing fee to get started." />
                <Benefit title="Stripe payments" body="Secure checkout and clear steps." />
                <Benefit title="Transfer handled" body="We run the DVLA-style process after sale." />
                <Benefit
                  title="Optional free auto-relist"
                  body="Unsold plates can re-enter future auctions until sold."
                />
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/current-listings"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base shadow-lg transition"
                  style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
                >
                  Browse current auctions
                </Link>

                <Link
                  href="/sell-my-plate"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
                  style={{
                    borderColor: "rgba(255,255,255,0.18)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                  }}
                >
                  Sell your plate
                </Link>

                <Link
                  href="/login-or-register"
                  className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    color: "#ffffff",
                  }}
                >
                  Login / Register
                </Link>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-white/60 max-w-xl">
                Listings are approved, then queued for the next weekly auction window.
              </p>

              <p className="mt-2 text-[11px] text-white/50 max-w-xl">
                AuctionMyPlate.co.uk is an independent marketplace and is not affiliated with the DVLA.
              </p>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5 space-y-4">
              {/* “Seller promise” card */}
              <div
                className="rounded-3xl p-6 sm:p-7 border shadow-2xl"
                style={{
                  borderColor: "rgba(214,180,95,0.22)",
                  backgroundColor: "rgba(214,180,95,0.06)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-[11px] font-semibold tracking-[0.22em] text-white/60 uppercase">
                  Seller promise
                </p>

                <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  List once.
                  <span className="block" style={{ color: ACCENT }}>
                    Keep it in the weekly auction until it sells.
                  </span>
                </h3>

                <p className="mt-3 text-sm text-white/75 leading-relaxed">
                  You can opt into free auto-relist — if it doesn’t sell, it rolls into the
                  next weekly auction automatically. No extra fees to keep it live.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniPoint>✓ Free to list</MiniPoint>
                  <MiniPoint>✓ Reserve supported</MiniPoint>
                  <MiniPoint>✓ Stripe checkout</MiniPoint>
                  <MiniPoint>✓ Transfer handled</MiniPoint>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href="/sell-my-plate"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center shadow-lg transition"
                    style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
                  >
                    Start selling
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center transition border"
                    style={{
                      borderColor: "rgba(255,255,255,0.18)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                    }}
                  >
                    How it works
                  </Link>
                </div>

                <p className="mt-3 text-[11px] text-white/55">
                  You’re always in control — auto-relist is optional.
                </p>
              </div>

              {/* Existing schedule card */}
              <div
                className="rounded-3xl p-6 sm:p-7 border shadow-2xl"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(20,20,20,0.72)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                  Auction schedule
                </p>

                <div className="mt-4 space-y-4">
                  <InfoRow
                    label="Opens"
                    value={
                      <>
                        <span className="font-semibold text-white">Monday</span>{" "}
                        <span className="text-white/70">01:00</span>
                      </>
                    }
                  />
                  <InfoRow
                    label="Closes"
                    value={
                      <>
                        <span className="font-semibold text-white">Sunday</span>{" "}
                        <span className="text-white/70">23:00</span>
                      </>
                    }
                  />
                  <InfoRow
                    label="If it doesn’t sell"
                    value={<span className="text-white/80">Optional free auto-relist.</span>}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    href="/current-listings"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center transition border"
                    style={{
                      borderColor: "rgba(255,255,255,0.18)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                    }}
                  >
                    View listings
                  </Link>
                  <Link
                    href="/sell-my-plate"
                    className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm text-center shadow-lg transition"
                    style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
                  >
                    Start selling
                  </Link>
                </div>
              </div>

              {/* NEW: quick internal links block (helps crawling + users) */}
              <div
                className="rounded-3xl p-6 sm:p-7 border"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                  Useful pages
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <QuickLink href="/sell-my-plate">Sell your plate</QuickLink>
                  <QuickLink href="/current-listings">Current auctions</QuickLink>
                  <QuickLink href="/how-it-works">How it works</QuickLink>
                  <QuickLink href="/fees">Fees</QuickLink>
                  <QuickLink href="/faq">FAQ</QuickLink>
                  <QuickLink href="/dvla">DVLA info</QuickLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rotating banner section */}
      <HomeBannerCarousel />

      {/* HOW IT WORKS */}
      <section
        className="border-t"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-white">
            How it works
          </h2>
          <p className="mt-3 text-center text-white/70 max-w-2xl mx-auto">
            A simple weekly auction with a proper post-sale transfer process.
          </p>

          <div className="mt-10 grid md:grid-cols-4 gap-7">
            <StepCard
              step={1}
              title="Submit your plate"
              body="Create an account, add your registration, and upload a photo."
            />
            <StepCard
              step={2}
              title="We approve & queue it"
              body="Approved listings are placed into the next weekly auction window."
            />
            <StepCard
              step={3}
              title="Auction runs"
              body="Bidders compete Monday 01:00 to Sunday 23:00."
            />
            <StepCard
              step={4}
              title="Sold → transfer → payout"
              body="Winner pays securely. We handle the transfer on your behalf and arrange payout."
            />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/how-it-works"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
              style={{
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "#ffffff",
              }}
            >
              Read the full “How it works”
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST / POSITIONING */}
      <section className="py-16 px-6">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-10 border shadow-2xl text-center"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          <h2 className="text-3xl font-bold text-white">
            A calmer, safer way to trade plates
          </h2>
          <p className="mt-4 text-lg text-white/75">
            Built for genuine buyers and sellers — with a clear weekly schedule,
            secure payments, optional free relist, and a transfer process handled properly after sale.
          </p>

          <div className="mt-7 grid sm:grid-cols-3 gap-3 text-left">
            <TrustItem
              title="Verified flow"
              body="Clear steps for buyers and sellers, with approval before listings go live."
            />
            <TrustItem
              title="Secure payments"
              body="Stripe-powered checkout with straightforward confirmation steps."
            />
            <TrustItem
              title="Practical selling options"
              body="Hidden reserves supported and optional free auto-relist until sold."
            />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/current-listings"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base shadow-lg transition"
              style={{ backgroundColor: ACCENT, color: "#0b0c10" }}
            >
              Browse current auctions
            </Link>
            <Link
              href="/sell-my-plate"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
              style={{
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "#ffffff",
              }}
            >
              Sell your plate
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ (on-page) */}
      <section
        className="border-t"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-white text-center">Quick answers</h2>
          <p className="mt-3 text-center text-white/70 max-w-2xl mx-auto">
            The common questions people ask before they bid or list.
          </p>

          <div className="mt-8 space-y-3">
            <FAQItem q="Is it free to list?">
              Yes — listing is free during our launch period. You only pay commission if your plate sells.
            </FAQItem>
            <FAQItem q="When do auctions run?">
              Weekly from Monday 01:00 to Sunday 23:00 (UK time). Approved listings are queued into the next weekly window.
            </FAQItem>
            <FAQItem q="Who pays the DVLA £80 fee?">
              By default the seller covers it (deducted from seller payout). A small number of older legacy listings charge it to the buyer and are clearly labelled.
            </FAQItem>
            <FAQItem q="Are you affiliated with the DVLA?">
              No — AuctionMyPlate is independent and not affiliated with, endorsed by, or associated with the DVLA.
            </FAQItem>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/fees"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
              style={{
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "#ffffff",
              }}
            >
              Read Fees
            </Link>
            <Link
              href="/faq"
              className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition border"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.02)",
                color: "#ffffff",
              }}
            >
              Full FAQ
            </Link>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/70 leading-relaxed">{body}</p>
    </div>
  );
}

function MiniPoint({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-3 py-2 border text-xs text-white/80"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
        {label}
      </p>
      <div className="text-sm text-right">{value}</div>
    </div>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/70 leading-relaxed">{body}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  body,
}: {
  step: number;
  title: string;
  body: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-7 border shadow-xl"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="absolute -top-5 left-6 h-10 w-10 rounded-full flex items-center justify-center font-extrabold text-lg shadow-lg"
        style={{ backgroundColor: "#d6b45f", color: "#0b0c10" }}
      >
        {step}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{body}</p>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 border text-sm text-center transition"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(0,0,0,0.20)",
        color: "#ffffff",
      }}
    >
      <span className="text-white/90 hover:text-white">{children}</span>
    </Link>
  );
}

function FAQItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details
      className="rounded-2xl border p-5"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <summary className="cursor-pointer text-white font-semibold">
        {q}
      </summary>
      <p className="mt-2 text-sm text-white/75 leading-relaxed">{children}</p>
    </details>
  );
}
