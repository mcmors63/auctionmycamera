// app/how-it-works/page.tsx

import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "How It Works | AuctionMyCamera",
  description:
    "Learn how AuctionMyCamera.co.uk works for buyers and sellers of cameras, lenses and photography gear. Auction rules, fees, delivery windows, and what happens after you win.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/how-it-works`,
    title: "How It Works | AuctionMyCamera",
    description:
      "How our weekly camera gear auctions work for buyers and sellers — bidding, fees, delivery windows, and what happens after an item is sold.",
    siteName: "AuctionMyCamera",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | AuctionMyCamera",
    description:
      "How our weekly camera gear auctions work for buyers and sellers — bidding, fees, delivery windows, and what happens after an item is sold.",
  },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-gold/40 p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gold mb-4">
          How AuctionMyCamera Works
        </h1>

        <p className="text-sm md:text-base text-gray-300 mb-6">
          AuctionMyCamera.co.uk is a premium UK marketplace for cameras, lenses and photography gear.
          This page explains, in plain English, how auctions work for both buyers and sellers, what
          fees apply, and what happens after an item is sold — including payment collection, dispatch
          expectations, and buyer receipt confirmation.
        </p>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <a
            href="/sell"
            className="inline-block bg-gold hover:opacity-90 text-black font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Sell your gear
          </a>
          <a
            href="/current-listings"
            className="inline-block border border-gold/40 hover:border-gold text-gold hover:text-yellow-200 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Browse auctions
          </a>
          <a
            href="/dashboard"
            className="inline-block border border-gray-700 hover:border-gray-500 text-gray-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Go to dashboard
          </a>
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
              Delivery &amp; receipt confirmation
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
              Items are listed into weekly online auctions. You can <strong>bid</strong> and compete
              with other verified buyers for cameras, lenses and accessories.
            </li>
            <li>
              Listings must be accurate and honest — including condition, faults, included accessories,
              and clear photos of the actual item.
            </li>
            <li>
              Bids are <strong>binding</strong>. Don’t bid unless you’re ready to complete the purchase
              if you win.
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              We don’t allow counterfeit, replica, or stolen goods. We may remove listings or restrict
              accounts where we suspect prohibited items or misrepresentation.
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
              <strong>Browse listings.</strong> You can see live items and upcoming auctions.
            </li>
            <li>
              <strong>Place a bid.</strong> When you bid, you’re making a <strong>binding offer</strong> to buy if you win.
            </li>
            <li>
              <strong>Watch for outbids.</strong> If someone outbids you, you can bid again until the auction closes.
            </li>
            <li>
              <strong>Pay securely.</strong> Winning bidders pay online via our payment provider. Card details are handled
              securely by the provider and are not stored on our servers.
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              You&apos;ll see any buyer-facing fees clearly at checkout. Delivery/collection terms are shown on the listing.
            </p>
          </div>
        </section>

        <section id="selling" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">3. Selling – Step by Step</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Register and complete your profile.</strong> We need contact details to verify the seller and complete payouts.
            </li>
            <li>
              <strong>List your gear from your dashboard.</strong> Enter the item details, condition, what’s included, and upload clear photos.
            </li>
            <li>
              <strong>Admin approval.</strong> Our team may review listings to keep the marketplace clean and trusted.
              We may request clarification where something looks off.
            </li>
            <li>
              <strong>Your item goes into the next auction.</strong> Once approved, it’s scheduled into an auction window.
            </li>
            <li>
              <strong>When it sells, you dispatch.</strong> You’re expected to ship within the delivery window and provide tracking where available.
            </li>
            <li>
              <strong>Payout after receipt confirmation.</strong> Funds are released once the buyer confirms receipt (or the platform flow completes).
            </li>
          </ol>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            Ready to sell?{" "}
            <a href="/sell" className="text-gold underline hover:text-yellow-200">
              List your gear
            </a>
            .
          </p>
        </section>

        <section id="timing" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">4. Auction Timing &amp; Soft Close</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed mb-2">
            Auctions normally run within a weekly window. Some key rules:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Soft close:</strong> if a bid is placed in the final minutes, the end time may be extended
              to reduce last-second “sniping”.
            </li>
            <li>
              <strong>Binding bids:</strong> when you bid, you are committing to complete the purchase if you win.
            </li>
            <li>
              <strong>Fair play:</strong> we do not allow shill bidding or collusion. Suspected manipulation may lead to account restrictions.
            </li>
          </ul>
        </section>

        <section id="fees" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">5. Fees &amp; Charges</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Commission:</strong> a commission fee may be deducted from the seller’s proceeds on successful sales.
              The rate is shown during listing or in your seller dashboard.
            </li>
            <li>
              <strong>Listing fees:</strong> during promotional periods, listing may be free. Any future listing fees will be clearly displayed
              before you submit an item.
            </li>
            <li>
              <strong>Delivery costs:</strong> delivery/collection terms are shown on the listing. Sellers must still meet dispatch expectations
              regardless of delivery pricing.
            </li>
          </ul>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            For the full detail, see our{" "}
            <a href="/terms" className="text-gold underline hover:text-yellow-200">
              Terms &amp; Conditions
            </a>
            .
          </p>
        </section>

        <section id="after" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">6. What Happens After You Win?</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              You receive confirmation in your dashboard (and usually by email) that you are the winning bidder.
            </li>
            <li>
              Payment is completed online via our payment provider. In some flows, payment may be taken automatically if you have authorised a saved method.
            </li>
            <li>
              A deal record is created and the seller is instructed to dispatch within the delivery window.
            </li>
            <li>
              The buyer confirms receipt through the platform. Funds are then released to the seller (minus any applicable fees).
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              Important: bids are binding. Don&apos;t bid unless you&apos;re ready to complete the purchase if you win.
            </p>
          </div>
        </section>

        <section id="delivery" className="mb-8">
          <h2 className="text-xl font-semibold text-gold mb-3">7. Delivery &amp; Receipt Confirmation</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed mb-2">
            AuctionMyCamera is designed to keep deals moving and reduce the usual marketplace headaches.
            That means clear dispatch expectations and a simple receipt-confirmation step.
          </p>

          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Dispatch window:</strong> sellers are expected to dispatch promptly after the sale (see Terms for the exact window).
            </li>
            <li>
              <strong>Tracking / proof:</strong> sellers should provide tracking where available and keep proof of dispatch.
            </li>
            <li>
              <strong>Receipt confirmation:</strong> buyers confirm receipt in the dashboard once the item arrives.
            </li>
            <li>
              <strong>Disputes:</strong> if something is materially wrong (non-delivery, major misdescription), buyers must raise it promptly through the platform flow.
            </li>
          </ul>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            The exact time limits and rules are set out in{" "}
            <a href="/terms" className="text-gold underline hover:text-yellow-200">
              Terms &amp; Conditions
            </a>
            .
          </p>
        </section>

        <section id="help">
          <h2 className="text-xl font-semibold text-gold mb-3">8. Need Help or Have Questions?</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed">
            If you’re unsure about any part of the process, contact us at{" "}
            <a
              href="mailto:support@auctionmycamera.co.uk"
              className="text-gold underline hover:text-yellow-200"
            >
              support@auctionmycamera.co.uk
            </a>
            . We’re happy to help before you bid or list.
          </p>

          <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-200 text-sm md:text-base">Ready to list your gear?</p>
            <a
              href="/sell"
              className="inline-block bg-gold hover:opacity-90 text-black font-semibold px-6 py-3 rounded-md text-sm md:text-base"
            >
              Sell your gear
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
