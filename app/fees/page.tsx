// app/fees/page.tsx
import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Fees | AuctionMyCamera",
  description:
    "Clear, transparent information on listing fees (if any), commission, delivery costs, and payout timing at AuctionMyCamera.",
  alternates: { canonical: `${SITE_URL}/fees` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/fees`,
    title: "Fees | AuctionMyCamera",
    description:
      "Simple, transparent fees for buying and selling cameras, lenses and photography gear — listing, commission, delivery, and payout timing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fees | AuctionMyCamera",
    description:
      "Simple, transparent fees for buying and selling cameras, lenses and photography gear — listing, commission, delivery, and payout timing.",
  },
};

export default function FeesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto bg-slate-900/40 rounded-2xl shadow-lg border border-white/10 p-8 md:p-10">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-sky-300 mb-4 text-center tracking-tight">
          Fees &amp; Costs
        </h1>
        <p className="text-lg text-slate-300 text-center mb-6">
          Simple, transparent, and shown clearly before you commit.
        </p>

        {/* QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <a
            href="/sell"
            className="inline-block bg-sky-300 hover:bg-sky-200 text-slate-900 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Sell your gear
          </a>
          <a
            href="/current-listings"
            className="inline-block border border-white/15 hover:border-white/25 text-slate-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Browse auctions
          </a>
          <a
            href="/how-it-works"
            className="inline-block border border-white/15 hover:border-white/25 text-slate-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            How it works
          </a>
        </div>

        {/* KEY POINTS / SUMMARY */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-sky-300">At a glance</h2>
          <div className="bg-black/25 border border-white/10 rounded-xl p-5 text-sm md:text-base text-slate-100">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Listing fees:</strong> if a listing fee applies, it’s shown clearly before you publish.
              </li>
              <li>
                <strong>Commission:</strong> only charged on successful, completed sales and deducted from the seller payout.
              </li>
              <li>
                <strong>Delivery costs:</strong> shown on the listing (postage/collection terms are part of the deal).
              </li>
              <li>
                <strong>Payout timing:</strong> sellers aren’t paid instantly — funds are released after receipt confirmation
                (or the platform’s completion rules apply, as described in the Terms).
              </li>
              <li className="text-slate-300">
                Card payments are processed securely by a payment provider (e.g. Stripe). We don’t store full card details on our servers.
              </li>
            </ul>
          </div>
        </section>

        {/* LISTING FEES */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-sky-300">Listing fees</h2>
          <div className="bg-black/25 border border-white/10 rounded-xl p-5 text-sm md:text-base text-slate-100 space-y-3">
            <p>
              If a listing fee applies, you’ll see it <strong>before</strong> you publish — no surprises after the fact.
            </p>
            <p className="text-slate-300 text-sm">
              Listing fees may be free during promotional periods. If/when that changes, the platform will show it clearly in the sell flow.
            </p>
          </div>
        </section>

        {/* COMMISSION */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-sky-300">Commission</h2>
          <p className="text-slate-300 mb-6 text-sm md:text-base">
            Commission is only charged when a sale completes. There is <strong>no commission</strong> if an item doesn’t sell.
          </p>

          <div className="bg-black/25 border border-white/10 rounded-xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm md:text-base min-w-[520px]">
                <thead className="bg-sky-300 text-slate-900">
                  <tr>
                    <th className="py-3 px-4">Final sale price (winning bid)</th>
                    <th className="py-3 px-4">Commission rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">Up to £4,999</td>
                    <td className="py-3 px-4">10%</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">£5,000 – £9,999</td>
                    <td className="py-3 px-4">8%</td>
                  </tr>
                  <tr className="border-b border-white/10">
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

          <p className="text-xs md:text-sm text-slate-400 mb-4 text-center">
            Commission is calculated on the winning bid (hammer price) and deducted before payout.
          </p>
        </section>

        {/* DELIVERY COSTS */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-sky-300">Delivery &amp; collection costs</h2>
          <div className="bg-black/25 border border-white/10 rounded-xl p-5 text-sm md:text-base text-slate-100 space-y-3">
            <p>
              Delivery/postage costs (if any) are shown on the listing and form part of the deal terms.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Sellers should use an appropriate courier/service for the item’s value and package it properly.
              </li>
              <li>
                Where tracking is available, sellers should provide it in the platform.
              </li>
              <li>
                Where collection is offered, both parties should follow the agreed collection instructions.
              </li>
            </ul>
          </div>
        </section>

        {/* PAYOUT TIMING */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-sky-300">When does the seller get paid?</h2>
          <div className="bg-black/25 border border-white/10 rounded-xl p-5 text-sm md:text-base text-slate-100 space-y-3">
            <p>
              AuctionMyCamera isn’t a basic classifieds site. The flow is designed to protect both sides.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Funds are normally released after the buyer confirms receipt through the platform,
                or the platform completion rules apply (timeouts / evidence / dispute outcomes as set out in the Terms).
              </li>
              <li>
                If a dispute is raised (non-delivery, material misdescription, damage in transit), payout may be paused while it’s handled.
              </li>
            </ul>

            <p className="text-slate-300 text-sm">
              Full details are explained in our{" "}
              <a href="/terms" className="underline text-sky-300 hover:text-sky-200">
                Terms &amp; Conditions
              </a>
              .
            </p>
          </div>
        </section>

        {/* EXAMPLES */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-sky-300">Examples</h2>
          <p className="text-slate-300 mb-4 text-sm md:text-base">
            These examples show how commission affects the seller payout. Delivery costs (if any) are separate and shown on the listing.
          </p>

          <div className="space-y-4 text-sm md:text-base text-slate-100">
            <div className="bg-black/25 border border-white/10 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 1 – £500 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Winning bid: <strong>£500</strong></li>
                <li>Commission band: Up to £4,999 → <strong>10%</strong></li>
                <li>Commission: 10% of £500 = <strong>£50</strong></li>
                <li>Seller payout (before any delivery adjustments): £500 − £50 = <strong>£450</strong></li>
              </ul>
            </div>

            <div className="bg-black/25 border border-white/10 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 2 – £2,000 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Winning bid: <strong>£2,000</strong></li>
                <li>Commission band: Up to £4,999 → <strong>10%</strong></li>
                <li>Commission: 10% of £2,000 = <strong>£200</strong></li>
                <li>Seller payout (before any delivery adjustments): £2,000 − £200 = <strong>£1,800</strong></li>
              </ul>
            </div>

            <div className="bg-black/25 border border-white/10 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 3 – £7,500 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Winning bid: <strong>£7,500</strong></li>
                <li>Commission band: £5,000 – £9,999 → <strong>8%</strong></li>
                <li>Commission: 8% of £7,500 = <strong>£600</strong></li>
                <li>Seller payout (before any delivery adjustments): £7,500 − £600 = <strong>£6,900</strong></li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-sky-300">FAQs</h2>
          <div className="space-y-3">
            <details className="rounded-xl border border-white/10 bg-black/25 p-4">
              <summary className="cursor-pointer text-slate-100 font-semibold text-sm md:text-base">
                Do I pay anything if my item doesn&apos;t sell?
              </summary>
              <p className="text-slate-200 mt-2 text-sm md:text-base">
                No commission is charged if your item doesn&apos;t sell.
                If a listing fee applies in the future, it will be shown clearly before you publish.
              </p>
            </details>

            <details className="rounded-xl border border-white/10 bg-black/25 p-4">
              <summary className="cursor-pointer text-slate-100 font-semibold text-sm md:text-base">
                Is commission based on the reserve price or the final sale price?
              </summary>
              <p className="text-slate-200 mt-2 text-sm md:text-base">
                Commission is based on the final winning bid (the hammer price), not the reserve.
              </p>
            </details>

            <details className="rounded-xl border border-white/10 bg-black/25 p-4">
              <summary className="cursor-pointer text-slate-100 font-semibold text-sm md:text-base">
                When does the seller actually receive the money?
              </summary>
              <p className="text-slate-200 mt-2 text-sm md:text-base">
                Funds are normally released after receipt confirmation (or the platform completion rules apply),
                as described in the Terms &amp; Conditions.
              </p>
            </details>
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-slate-200 text-sm md:text-base">
            Ready to sell your gear?
          </p>
          <a
            href="/sell"
            className="inline-block bg-sky-300 hover:bg-sky-200 text-slate-900 font-semibold px-6 py-3 rounded-md text-sm md:text-base"
          >
            Sell your gear
          </a>
        </div>

        {/* FINAL NOTE */}
        <p className="text-xs text-slate-400 mt-6 text-center">
          Figures above are examples. Exact fees and payouts are calculated automatically and shown in the platform.
        </p>
      </div>
    </main>
  );
}
