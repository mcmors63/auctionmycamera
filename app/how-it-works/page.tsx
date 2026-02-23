// app/how-it-works/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "How It Works | AuctionMyCamera",
  description:
    "Learn how AuctionMyCamera.co.uk works for buyers and sellers of cameras, lenses and photography gear. Auctions, bidding rules, fees, dispatch, buyer confirmation and what happens after you win.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/how-it-works`,
    title: "How It Works | AuctionMyCamera",
    description:
      "How our weekly camera gear auctions work — bids, fees, dispatch, buyer confirmation and what happens after a sale completes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | AuctionMyCamera",
    description:
      "How our weekly camera gear auctions work — bids, fees, dispatch, buyer confirmation and what happens after a sale completes.",
  },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-white/10 p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gold mb-4">
          How AuctionMyCamera Works
        </h1>

        <p className="text-sm md:text-base text-gray-300 mb-6">
          AuctionMyCamera.co.uk is a dedicated UK marketplace for cameras, lenses and photography gear.
          This page explains, in plain English, how auctions work for both buyers and sellers, what fees apply,
          and what happens after an item sells.
        </p>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/sell"
            className="inline-block bg-gold hover:opacity-90 text-black font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Sell your gear
          </Link>
          <Link
            href="/dashboard"
            className="inline-block border border-gold/60 hover:border-gold text-gold hover:text-yellow-200 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Go to dashboard
          </Link>
          <Link
            href="/fees"
            className="inline-block border border-gray-700 hover:border-gray-500 text-gray-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            View fees
          </Link>
        </div>

        {/* On-page navigation */}
        <nav className="mb-10 rounded-xl border border-gray-800 bg-black/30 p-4">
          <p className="text-xs md:text-sm text-gray-300 mb-2 font-semibold">Jump to:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm md:text-base">
            <a href="#basics" className="text-gold hover:text-yellow-200 underline">
              The basics
            </a>
            <a href="#buying" className="text-gold hover:text-yellow-200 underline">
              Buying
            </a>
            <a href="#selling" className="text-gold hover:text-yellow-200 underline">
              Selling
            </a>
            <a href="#timing" className="text-gold hover:text-yellow-200 underline">
              Timing &amp; soft close
            </a>
            <a href="#fees" className="text-gold hover:text-yellow-200 underline">
              Fees
            </a>
            <a href="#after" className="text-gold hover:text-yellow-200 underline">
              After you win
            </a>
            <a href="#delivery" className="text-gold hover:text-yellow-200 underline">
              Dispatch, receipt &amp; disputes
            </a>
            <a href="#help" className="text-gold hover:text-yellow-200 underline">
              Help
            </a>
          </div>
        </nav>

        <section id="basics" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">1. The Basics</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              Items are listed into timed auctions. You can place <strong>bids</strong> while the auction is live.
            </li>
            <li>
              Sellers list the <strong>actual item</strong> (no stock photos) and must describe condition honestly.
            </li>
            <li>
              Auctions may use a <strong>soft close</strong> to reduce last-second sniping (details below).
            </li>
            <li>
              Payments are processed securely via our payment provider (e.g. <strong>Stripe</strong>). We do not store
              full card details on our servers.
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              This marketplace is designed to reduce time-wasting and protect both parties: dispatch steps, tracking
              where available, and buyer receipt confirmation are part of the flow.
            </p>
          </div>
        </section>

        <section id="buying" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">2. Buying – Step by Step</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Create an account</strong> and verify your email. You can then browse and bid on live auctions.
            </li>
            <li>
              <strong>Browse listings</strong> and read the condition notes carefully. Check photos, included
              accessories and any faults.
            </li>
            <li>
              <strong>Place a bid.</strong> When you bid, you’re making a <strong>binding offer</strong> to buy if you
              win.
            </li>
            <li>
              <strong>Watch for outbids</strong> and bid again if you want to stay in.
            </li>
            <li>
              <strong>Pay securely</strong> when required by the flow (and/or via an authorised saved payment method
              where enabled).
            </li>
            <li>
              After dispatch, you <strong>confirm receipt</strong> in your dashboard so the seller can be paid.
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              You’ll see any buyer-facing charges clearly (for example delivery cost where the listing includes
              shipping).
            </p>
          </div>
        </section>

        <section id="selling" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">3. Selling – Step by Step</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Register and complete your profile.</strong> We need contact details for marketplace operations
              and support.
            </li>
            <li>
              <strong>List your gear from your dashboard.</strong> Add accurate condition notes, clear photos, and what’s
              included.
            </li>
            <li>
              <strong>Approval where required.</strong> Some listings may be reviewed before going live.
            </li>
            <li>
              <strong>Auction goes live.</strong> Your listing runs for its scheduled window.
            </li>
            <li>
              <strong>Sale completes.</strong> If you have a winning bid, the buyer completes payment and a deal is
              created.
            </li>
            <li>
              <strong>Dispatch &amp; tracking.</strong> You dispatch within the stated window and add tracking/proof
              where available.
            </li>
            <li>
              <strong>Payout.</strong> Once the buyer confirms receipt (or the platform flow completes per the Terms),
              payout is released minus any applicable fees.
            </li>
          </ol>
        </section>

        <section id="timing" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">4. Auction Timing &amp; Soft Close</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed mb-2">
            Auctions run on timed windows. Some key rules:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Soft close:</strong> bids placed near the end may extend the end time to reduce last-second
              sniping.
            </li>
            <li>
              <strong>Binding bids:</strong> when you bid, you’re committing to complete the purchase if you win.
            </li>
            <li>
              <strong>Anti-abuse:</strong> suspected shill bidding, collusion or manipulation may lead to voided sales
              and account restrictions.
            </li>
          </ul>
        </section>

        <section id="fees" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">5. Fees &amp; Charges</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Listing fees:</strong> may be free during promotional periods. Any listing fee is shown clearly
              before you publish.
            </li>
            <li>
              <strong>Commission:</strong> may be deducted from the seller’s proceeds on successful sales. The rate is
              shown in the seller flow/dashboard.
            </li>
            <li>
              <strong>Delivery costs:</strong> if shipping is offered, the delivery cost (if any) is shown on the
              listing and forms part of the deal terms.
            </li>
          </ul>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            For full details (and examples), see{" "}
            <Link href="/fees" className="text-gold underline hover:text-yellow-200">
              Fees
            </Link>{" "}
            and our{" "}
            <Link href="/terms" className="text-gold underline hover:text-yellow-200">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </section>

        <section id="after" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">6. What Happens After You Win?</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>You receive confirmation in your dashboard (and usually by email) that you won.</li>
            <li>Payment is completed/collected via the marketplace flow.</li>
            <li>
              The seller dispatches (or arranges collection) within the stated window and provides tracking/proof
              where available.
            </li>
            <li>You confirm receipt through your dashboard so the deal can complete.</li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              Important: bids are binding. Don’t bid unless you’re ready to complete the purchase if you win.
            </p>
          </div>
        </section>

        <section id="delivery" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">7. Dispatch, Receipt &amp; Disputes</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>Sellers must dispatch within the platform’s dispatch window (or the listing’s stated terms).</li>
            <li>Buyers should confirm receipt promptly after delivery.</li>
            <li>
              If there’s a genuine issue (non-delivery, damage in transit, or material misdescription), raise it
              promptly via the platform flow.
            </li>
          </ul>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            Full rules and time windows are defined in the{" "}
            <Link href="/terms" className="text-gold underline hover:text-yellow-200">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </section>

        <section id="help">
          <h2 className="text-xl font-semibold text-gold mb-3">8. Need Help?</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed">
            If you’re unsure about any part of the process, contact us at{" "}
            <a
              href="mailto:support@auctionmycamera.co.uk"
              className="text-gold underline hover:text-yellow-200"
            >
              support@auctionmycamera.co.uk
            </a>
            .
          </p>

          <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-200 text-sm md:text-base">Ready to list your gear?</p>
            <Link
              href="/sell"
              className="inline-block bg-gold hover:opacity-90 text-black font-semibold px-6 py-3 rounded-md text-sm md:text-base"
            >
              Sell your gear
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}