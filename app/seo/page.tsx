// app/seo/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
  /\/$/,
  ""
);

export const metadata: Metadata = {
  title: "UK Private Number Plate Auctions | Auction My Plate",
  description:
    "Buy and sell private number plates through weekly UK auctions. Simple listing, transparent fees, and a clear DVLA transfer process.",
  alternates: { canonical: `${SITE_URL}/seo` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/seo`,
    title: "UK Private Number Plate Auctions | Auction My Plate",
    description:
      "Weekly UK number plate auctions. List your plate, bid securely, and complete DVLA transfer after the sale.",
  },
  twitter: {
    card: "summary_large_image",
    title: "UK Private Number Plate Auctions | Auction My Plate",
    description:
      "Weekly UK number plate auctions. List your plate, bid securely, and complete DVLA transfer after the sale.",
  },
};

export default function SeoPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Auction My Plate",
        url: SITE_URL,
      },
      {
        "@type": "WebSite",
        name: "Auction My Plate",
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
            name: "Can my plate relist automatically if it doesn’t sell?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes — if the seller selects relist until sold, the listing can roll into the next weekly auction window automatically.",
            },
          },
          {
            "@type": "Question",
            name: "How does DVLA transfer work after a sale?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "After the sale completes, the seller and buyer follow the DVLA transfer process. The platform provides guidance and the paperwork step is handled after the auction outcome.",
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
            Auction My Plate
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            UK Private Number Plate Auctions
          </h1>
          <p className="text-base sm:text-lg text-gray-800">
            Buy and sell cherished registrations through a simple weekly auction
            schedule, with a clear process and straightforward fees.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-black text-white px-5 py-3 text-sm font-semibold"
            >
              Browse auctions
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-black px-5 py-3 text-sm font-semibold"
            >
              Sell a plate
            </Link>
          </div>

          <p className="text-xs text-gray-600 pt-1">
            If your routes differ (e.g. selling page isn’t /dashboard), update the buttons above.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Weekly auction window</h2>
            <p className="text-sm text-gray-800 mt-2">
              London time:
            </p>
            <ul className="text-sm text-gray-800 mt-2 list-disc pl-5 space-y-1">
              <li><b>Starts:</b> Monday 01:00</li>
              <li><b>Ends:</b> Sunday 23:00</li>
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Sell with control</h2>
            <p className="text-sm text-gray-800 mt-2">
              Set your reserve, manage your listing, and (optionally) enable{" "}
              <b>relist until sold</b> so unsold plates can roll into the next week.
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-bold text-lg">Buy with confidence</h2>
            <p className="text-sm text-gray-800 mt-2">
              Bid during the auction window and follow the DVLA transfer steps after a successful sale.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold">How it works</h2>

          <div className="rounded-xl border border-black/10 bg-white p-5 space-y-2">
            <h3 className="font-bold">Buying a private plate</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>Browse listings and place bids during the weekly auction.</li>
              <li>If you win, complete payment and proceed to the transfer stage.</li>
              <li>Follow the DVLA transfer process with the seller (guidance provided).</li>
            </ol>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-5 space-y-2">
            <h3 className="font-bold">Selling a private plate</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>Create your listing and set your reserve/price rules.</li>
              <li>Optional: enable <b>relist until sold</b> for automatic weekly rollover if unsold.</li>
              <li>After a successful auction, complete the DVLA transfer steps with the buyer.</li>
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
                What does “relist until sold” mean?
              </summary>
              <p className="text-sm text-gray-800 mt-2">
                If enabled by the seller, an unsold plate can automatically roll into the next weekly auction window.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold">
                Is DVLA transfer handled during the auction?
              </summary>
              <p className="text-sm text-gray-800 mt-2">
                No — transfer happens <b>after</b> the sale completes. The auction is for price discovery; the transfer step follows.
              </p>
            </details>
          </div>
        </section>

        <section className="text-sm text-gray-800">
          <p>
            Want the essentials? Head back to{" "}
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
