// app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Terms & Conditions | AuctionMyCamera",
  description:
    "Terms and Conditions for AuctionMyCamera.co.uk covering auctions, bidding rules, held payments, tracked delivery requirements, buyer confirmation periods, fees, Stripe payments, disputes and chargebacks.",
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: "Terms & Conditions | AuctionMyCamera",
    description:
      "Auctions, bidding rules, held funds, tracked delivery, buyer confirmation, disputes and Stripe payments.",
    url: `${SITE_URL}/terms`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | AuctionMyCamera",
    description:
      "Marketplace terms covering auctions, held funds, tracked delivery, buyer confirmation and disputes.",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card shadow-sm p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            Terms <span className="text-gold">&amp;</span> Conditions
          </h1>

          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="text-foreground font-semibold">February 2026</span>
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            By registering, listing, bidding, buying or selling on AuctionMyCamera.co.uk, you agree to be bound by these Terms.
          </p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">

          <p>
            AuctionMyCamera.co.uk ("Platform") is an online marketplace connecting buyers and sellers of
            cameras, lenses and photography equipment. We are not affiliated with any camera manufacturer or brand.
          </p>

          {/* 1. Eligibility */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">1. Eligibility</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You must be at least 18 years old.</li>
              <li>You must provide accurate information.</li>
              <li>You must be legally capable of entering binding agreements.</li>
            </ul>
          </section>

          {/* 2. Listings */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              2. Listings, Condition &amp; Authenticity
            </h2>

            <ul className="list-disc ml-5 space-y-1">
              <li>Sellers must be the legal owner or authorised to sell the item.</li>
              <li>Items must be described accurately, including faults and included accessories.</li>
              <li>Photos must show the actual item (no stock images).</li>
              <li>Where applicable, Sellers must provide accurate serial numbers and must not remove or alter them.</li>
              <li>Counterfeit, stolen or prohibited items are strictly forbidden.</li>
            </ul>
          </section>

          {/* 3. Auctions */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              3. Auctions &amp; Binding Bids
            </h2>

            <ul className="list-disc ml-5 space-y-1">
              <li>Bids are legally binding offers.</li>
              <li>If you win, you commit to complete the purchase.</li>
              <li>We may void auctions where fraud or technical error is suspected.</li>
            </ul>
          </section>

          {/* 4. Payment Collection */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              4. Payment Collection &amp; Holding of Funds
            </h2>

            <p>
              Upon a winning bid, the Buyer’s payment method is charged. Funds are received into the Platform’s
              Stripe merchant account and are held pending completion of the post-sale process.
            </p>

            <p className="mt-2">
              Seller funds are not released immediately upon payment.
            </p>
          </section>

          {/* 5. Dispatch & Delivery */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              5. Dispatch, Delivery &amp; Risk
            </h2>

            <h3 className="font-semibold mt-2 text-foreground">5.1 Dispatch Deadline</h3>
            <p>
              The Seller must dispatch the item within <strong>2 working days</strong> of successful payment.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">5.2 Mandatory Tracked Delivery</h3>
            <p>
              The Seller must use a delivery service providing:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>End-to-end tracking; and</li>
              <li>Verifiable proof of delivery (POD).</li>
            </ul>

            <p className="mt-2">
              For higher-value items, the Seller must select an appropriate insured delivery service.
            </p>

            <p className="mt-2">
              Failure to use tracked delivery with POD may result in withholding of payout or refund to the Buyer.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">5.3 Risk in Transit</h3>
            <p>
              The Seller remains responsible for the item until delivery is verified by:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Confirmed tracking showing delivered status; or</li>
              <li>Buyer confirmation of receipt.</li>
            </ul>
          </section>

          {/* 6. Buyer Confirmation */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              6. Buyer Confirmation &amp; Release of Funds
            </h2>

            <h3 className="font-semibold mt-2 text-foreground">6.1 Confirmation Window</h3>
            <p>
              Where verified tracking confirms delivery, the Buyer has <strong>7 calendar days</strong>
              from the delivery date to confirm receipt or raise a dispute.
            </p>

            <p className="mt-2">
              If no dispute is raised within this 7-day period, the Platform may release Seller funds automatically.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">6.2 Disputes</h3>
            <p>
              If a dispute is raised, funds remain on hold while evidence is reviewed.
              The Platform reserves sole discretion in determining outcomes.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">6.3 Release Conditions</h3>
            <p>
              Seller funds are released when:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>The Buyer confirms receipt; or</li>
              <li>The 7-day confirmation window expires without dispute; or</li>
              <li>The Platform determines release is appropriate based on evidence.</li>
            </ul>
          </section>

          {/* 7. Chargebacks */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              7. Chargebacks &amp; Payment Reversals
            </h2>

            <p>
              If a payment is reversed, disputed, or subject to chargeback after funds have been released,
              the Platform reserves the right to:
            </p>

            <ul className="list-disc ml-5 space-y-1">
              <li>Recover the disputed amount from the Seller;</li>
              <li>Offset the amount against future payouts;</li>
              <li>Suspend or restrict accounts.</li>
            </ul>
          </section>

          {/* 8. Platform Role */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              8. Platform Role &amp; Liability
            </h2>

            <p>
              The Platform provides tools for buyers and sellers to transact. Except where required by law,
              we are not the seller of listed goods.
            </p>

            <p className="mt-2">
              To the fullest extent permitted by law, we are not liable for indirect losses,
              courier delays, or user misconduct.
            </p>
          </section>

          {/* 9. Governing Law */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              9. Governing Law
            </h2>

            <p>
              These Terms are governed by the laws of England and Wales.
            </p>
          </section>

          <div className="border-t border-border pt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/faq" className="underline text-primary">
              FAQ
            </Link>
            <Link href="/fees" className="underline text-primary">
              Fees
            </Link>
            <Link href="/contact" className="underline text-primary">
              Contact
            </Link>
          </div>

        </section>
      </div>
    </div>
  );
}