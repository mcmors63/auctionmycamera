// app/seo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/$/,
  ""
);

export const metadata: Metadata = {
  title: "UK Camera Gear Auctions | AuctionMyCamera",
  description:
    "Buy and sell camera gear through weekly UK auctions. Simple listings, verified accounts, and clear fees for cameras, lenses, and accessories.",
  alternates: { canonical: `${SITE_URL}/seo` },

  // ✅ Strongly recommended: don’t index a page called /seo
  robots: { index: false, follow: false },

  openGraph: {
    type: "website",
    url: `${SITE_URL}/seo`,
    title: "UK Camera Gear Auctions | AuctionMyCamera",
    description:
      "Weekly UK camera gear auctions. List your gear, bid securely, and complete the sale after the auction ends.",
  },
  twitter: {
    card: "summary_large_image",
    title: "UK Camera Gear Auctions | AuctionMyCamera",
    description:
      "Weekly UK camera gear auctions. List your gear, bid securely, and complete the sale after the auction ends.",
  },
};

export default function SeoPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "AuctionMyCamera",
        url: SITE_URL,
      },
      {
        "@type": "WebSite",
        name: "AuctionMyCamera",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "When do weekly auctions run?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Auctions run weekly (London time) from Monday 01:00 to Sunday 23:00.",
            },
          },
          {
            "@type": "Question",
            name: "What can I list on AuctionMyCamera?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can list cameras, lenses, film, lighting, tripods, bags, and accessories. Listings are reviewed before going live in the next weekly auction window.",
            },
          },
          {
            "@type": "Question",
            name: "How does selling work after the auction ends?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "After the auction ends, we confirm the outcome and guide the next steps between buyer and seller to complete the sale. Keep your listing accurate and include what’s in the box to avoid disputes.",
            },
          },
        ],
      },
    ],
  };

  return (
    <main className="bg-[#FFFFEA] text-black">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-5 py-10 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-gray-700">
            AuctionMyCamera
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            UK Camera Gear Auctions
          </h1>
          <p className="text-base sm:text-lg text-gray-800">
            Buy and sell cameras, lenses, and accessories through a simple weekly
            auction schedule, with clear fees and verified accounts.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-black text-white px-5 py-3 text-sm font-semibold"
            >
              Browse auctions
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-lg border border-black px-5 py-3 text-sm font-semibold"
            >
              Sell camera gear
            </Link>
          </div>

          <p className="text-xs text-gray-600 pt-1">
            This page is intentionally not indexed. It exists to keep structured data tidy and consistent.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Weekly auction window</h2>
            <p className="text-sm text-gray-800 mt-2">London time:</p>
            <ul className="text-sm text-gray-800 mt-2 list-disc pl-5 space-y-1">
              <li>
                <b>Starts:</b> Monday 01:00
              </li>
              <li>
                <b>Ends:</b> Sunday 23:00
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Sell with clarity</h2>
            <p className="text-sm text-gray-800 mt-2">
              Create a listing with accurate condition and what’s included. Listings are reviewed and then queued for the next week’s auction window.
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Buy with confidence</h2>
            <p className="text-sm text-gray-800 mt-2">
              Bid during the auction window. After the auction ends, we confirm the outcome and guide the next steps to complete the sale.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">How it works</h2>

          <div className="rounded-xl border border-black/10 bg-white p-5 space-y-2">
            <h3 className="font-bold">Buying camera gear</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>Browse listings and place bids during the weekly auction window.</li>
              <li>If you win, complete payment and proceed to the completion stage.</li>
              <li>Confirm the details (what’s included / condition) and complete the sale.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 space-y-2">
            <h3 className="font-bold">Selling camera gear</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>Create your listing: type, era, brand/model, condition, and a clear description.</li>
              <li>Your listing is reviewed, then queued for the next weekly auction window.</li>
              <li>After a successful auction, complete the sale steps with the buyer.</li>
            </ol>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">FAQs</h2>

          <div className="rounded-xl border border-black/10 bg-white p-5 space-y-3">
            <details className="group">
              <summary className="cursor-pointer font-semibold">
                When do auctions run?
              </summary>
              <p className="text-sm text-gray-800 mt-2">
                Weekly (London time) from <b>Monday 01:00</b> to <b>Sunday 23:00</b>.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold">
                What items can I list?
              </summary>
              <p className="text-sm text-gray-800 mt-2">
                Cameras, lenses, accessories, film, lighting, tripods/support gear, and bags/cases.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold">
                Is this page meant to rank on Google?
              </summary>
              <p className="text-sm text-gray-800 mt-2">
                No — it’s set to <b>noindex</b>. Your real SEO pages should be your homepage, category pages, and listing pages.
              </p>
            </details>
          </div>
        </section>

        <section className="text-sm text-gray-800">
          <p>
            Back to{" "}
            <Link href="/" className="underline font-semibold">
              current listings
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}