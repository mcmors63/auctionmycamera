// app/fees/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// ✅ Keep meta description in the safe 120–155 character range and reuse everywhere.
const FEES_DESCRIPTION =
  "Clear fees for buying and selling camera gear: any listing fee shown before you publish, tiered commission on sales, delivery terms and payout timing.";

export const metadata: Metadata = {
  title: "Fees | AuctionMyCamera",
  description: FEES_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/fees` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/fees`,
    title: "Fees | AuctionMyCamera",
    description: FEES_DESCRIPTION,
    siteName: "AuctionMyCamera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fees | AuctionMyCamera",
    description: FEES_DESCRIPTION,
  },
};

export default function FeesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card shadow-sm p-8 md:p-10">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold mb-4 text-center tracking-tight">
          Fees <span className="text-gold">&amp;</span> Costs
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-6">
          Simple, transparent, and shown clearly before you commit.
        </p>

        {/* QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/sell"
            className="inline-block bg-primary text-primary-foreground hover:opacity-90 font-semibold px-5 py-3 rounded-xl text-sm md:text-base text-center transition shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Sell your gear
          </Link>

          <Link
            href="/current-listings"
            className="inline-block border border-border bg-background hover:bg-accent text-foreground font-semibold px-5 py-3 rounded-xl text-sm md:text-base text-center transition focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Browse auctions
          </Link>

          <Link
            href="/how-it-works"
            className="inline-block border border-border bg-background hover:bg-accent text-foreground font-semibold px-5 py-3 rounded-xl text-sm md:text-base text-center transition focus:outline-none focus:ring-2 focus:ring-ring"
          >
            How it works
          </Link>
        </div>

        {/* KEY POINTS / SUMMARY */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">At a glance</h2>
          <div className="border border-border rounded-2xl bg-background p-5 text-sm md:text-base">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <span className="text-foreground font-semibold">Listing fees:</span> if a listing fee applies, it’s shown
                clearly before you publish.
              </li>
              <li>
                <span className="text-foreground font-semibold">Commission:</span> only charged on successful,
                completed sales and deducted from the seller payout.
              </li>
              <li>
                <span className="text-foreground font-semibold">Delivery costs:</span> shown on the listing
                (postage/collection terms are part of the deal).
              </li>
              <li>
                <span className="text-foreground font-semibold">Payout timing:</span> sellers aren’t paid instantly —
                funds are released after receipt confirmation (or the platform’s completion rules apply, as described in
                the Terms).
              </li>
              <li>
                Card payments are processed securely by a payment provider (e.g. Stripe). We don’t store full card
                details on our servers.
              </li>
            </ul>
          </div>
        </section>

        {/* LISTING FEES */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">Listing fees</h2>
          <div className="border border-border rounded-2xl bg-background p-5 text-sm md:text-base space-y-3 text-muted-foreground">
            <p>
              If a listing fee applies, you’ll see it <span className="text-foreground font-semibold">before</span> you
              publish — no surprises after the fact.
            </p>
            <p className="text-sm">
              Listing fees may be free during promotional periods. If/when that changes, the platform will show it
              clearly in the sell flow.
            </p>
          </div>
        </section>

        {/* COMMISSION */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">Commission</h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">
            Commission is only charged when a sale completes. There is{" "}
            <span className="text-foreground font-semibold">no commission</span> if an item doesn’t sell.
          </p>

          <div className="rounded-2xl overflow-hidden border border-border bg-background mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm md:text-base min-w-[520px]">
                <thead className="bg-accent text-foreground">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Final sale price (winning bid)</th>
                    <th className="py-3 px-4 font-semibold">Commission rate</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">Up to £4,999</td>
                    <td className="py-3 px-4">10%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">£5,000 – £9,999</td>
                    <td className="py-3 px-4">8%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 px-4">£10,000 – £24,999</td>
                    <td className="py-3 px-4">6%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">£25,000+</td>
                    <td className="py-3 px-4">5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground mb-4 text-center">
            Commission is calculated on the winning bid (hammer price) and deducted before payout.
          </p>
        </section>

        {/* DELIVERY COSTS */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">Delivery &amp; collection costs</h2>
          <div className="border border-border rounded-2xl bg-background p-5 text-sm md:text-base space-y-3 text-muted-foreground">
            <p>Delivery/postage costs (if any) are shown on the listing and form part of the deal terms.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Sellers should use an appropriate courier/service for the item’s value and package it properly.</li>
              <li>Where tracking is available, sellers should provide it in the platform.</li>
              <li>Where collection is offered, both parties should follow the agreed collection instructions.</li>
            </ul>
          </div>
        </section>

        {/* PAYOUT TIMING */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">When does the seller get paid?</h2>
          <div className="border border-border rounded-2xl bg-background p-5 text-sm md:text-base space-y-3 text-muted-foreground">
            <p>AuctionMyCamera isn’t a basic classifieds site. The flow is designed to protect both sides.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Funds are normally released after the buyer confirms receipt through the platform, or the platform
                completion rules apply (timeouts / evidence / dispute outcomes as set out in the Terms).
              </li>
              <li>
                If a dispute is raised (non-delivery, material misdescription, damage in transit), payout may be paused
                while it’s handled.
              </li>
            </ul>

            <p className="text-sm">
              Full details are explained in our{" "}
              <Link href="/terms" className="underline text-primary hover:opacity-80">
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </div>
        </section>

        {/* EXAMPLES */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Examples</h2>
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            These examples show how commission affects the seller payout. Delivery costs (if any) are separate and shown
            on the listing.
          </p>

          <div className="space-y-4 text-sm md:text-base">
            <ExampleCard title="Example 1 – £500 winning bid">
              <li>
                Winning bid: <span className="text-foreground font-semibold">£500</span>
              </li>
              <li>
                Commission band: Up to £4,999 → <span className="text-foreground font-semibold">10%</span>
              </li>
              <li>
                Commission: 10% of £500 = <span className="text-foreground font-semibold">£50</span>
              </li>
              <li>
                Seller payout (before any delivery adjustments): £500 − £50 ={" "}
                <span className="text-foreground font-semibold">£450</span>
              </li>
            </ExampleCard>

            <ExampleCard title="Example 2 – £2,000 winning bid">
              <li>
                Winning bid: <span className="text-foreground font-semibold">£2,000</span>
              </li>
              <li>
                Commission band: Up to £4,999 → <span className="text-foreground font-semibold">10%</span>
              </li>
              <li>
                Commission: 10% of £2,000 = <span className="text-foreground font-semibold">£200</span>
              </li>
              <li>
                Seller payout (before any delivery adjustments): £2,000 − £200 ={" "}
                <span className="text-foreground font-semibold">£1,800</span>
              </li>
            </ExampleCard>

            <ExampleCard title="Example 3 – £7,500 winning bid">
              <li>
                Winning bid: <span className="text-foreground font-semibold">£7,500</span>
              </li>
              <li>
                Commission band: £5,000 – £9,999 → <span className="text-foreground font-semibold">8%</span>
              </li>
              <li>
                Commission: 8% of £7,500 = <span className="text-foreground font-semibold">£600</span>
              </li>
              <li>
                Seller payout (before any delivery adjustments): £7,500 − £600 ={" "}
                <span className="text-foreground font-semibold">£6,900</span>
              </li>
            </ExampleCard>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">FAQs</h2>
          <div className="space-y-3">
            <details className="rounded-2xl border border-border bg-background p-5">
              <summary className="cursor-pointer font-semibold text-sm md:text-base">
                Do I pay anything if my item doesn&apos;t sell?
              </summary>
              <p className="text-muted-foreground mt-2 text-sm md:text-base leading-relaxed">
                No commission is charged if your item doesn&apos;t sell. If a listing fee applies in the future, it will
                be shown clearly before you publish.
              </p>
            </details>

            <details className="rounded-2xl border border-border bg-background p-5">
              <summary className="cursor-pointer font-semibold text-sm md:text-base">
                Is commission based on the reserve price or the final sale price?
              </summary>
              <p className="text-muted-foreground mt-2 text-sm md:text-base leading-relaxed">
                Commission is based on the final winning bid (the hammer price), not the reserve.
              </p>
            </details>

            <details className="rounded-2xl border border-border bg-background p-5">
              <summary className="cursor-pointer font-semibold text-sm md:text-base">
                When does the seller actually receive the money?
              </summary>
              <p className="text-muted-foreground mt-2 text-sm md:text-base leading-relaxed">
                Funds are normally released after receipt confirmation (or the platform completion rules apply), as
                described in the Terms &amp; Conditions.
              </p>
            </details>
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-muted-foreground text-sm md:text-base">Ready to sell your gear?</p>
          <Link
            href="/sell"
            className="inline-block bg-primary text-primary-foreground hover:opacity-90 font-semibold px-6 py-3 rounded-xl text-sm md:text-base transition shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Sell your gear
          </Link>
        </div>

        {/* FINAL NOTE */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Figures above are examples. Exact fees and payouts are calculated automatically and shown in the platform.
        </p>
      </div>
    </div>
  );
}

function ExampleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground">{children}</ul>
    </div>
  );
}