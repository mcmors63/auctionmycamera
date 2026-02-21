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
    "Read the full Terms and Conditions for using AuctionMyCamera.co.uk, including auctions, bidding rules, held payments, delivery windows, buyer confirmation, fees, Stripe payments, cancellations and disputes.",
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: "Terms & Conditions | AuctionMyCamera",
    description:
      "Auctions, bidding rules, held payments until receipt, delivery windows, fees, Stripe processing, cancellations and disputes.",
    url: `${SITE_URL}/terms`,
    type: "website",
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
            Please read these Terms carefully before using AuctionMyCamera.co.uk. By registering, listing, bidding,
            buying or selling, you agree to be bound by them.
          </p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            These Terms and Conditions govern your use of{" "}
            <span className="text-foreground font-semibold">AuctionMyCamera.co.uk</span> (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;, &quot;Platform&quot;). By accessing or using the Platform, you agree to these Terms. If you
            do not agree, you must not use the Platform.
          </p>

          <p>
            AuctionMyCamera.co.uk is an independent online marketplace that connects buyers and sellers of cameras,
            lenses, photography equipment and related accessories. We are not affiliated with, authorised by, endorsed
            by, or associated with any camera manufacturer or brand.
          </p>

          <div className="rounded-2xl border border-border bg-background p-5">
            <p className="font-semibold text-foreground mb-1">Important summary (plain English)</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <span className="text-foreground font-semibold">Bids are binding.</span> If you win, you’re committing
                to buy.
              </li>
              <li>
                <span className="text-foreground font-semibold">Payment is collected</span> when you win (or immediately
                afterwards), and is <span className="text-foreground font-semibold">held</span> while the deal completes.
              </li>
              <li>
                Sellers must <span className="text-foreground font-semibold">dispatch within the delivery window</span>{" "}
                (default 3 working days unless stated).
              </li>
              <li>
                Sellers are <span className="text-foreground font-semibold">not paid</span> until the buyer confirms
                receipt (or auto-release applies).
              </li>
              <li>Counterfeit / stolen / prohibited items are not allowed. Misdescription is treated seriously.</li>
            </ul>
          </div>

          {/* 1. Definitions */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">1. Definitions</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <span className="text-foreground font-semibold">Listing</span>: an item advertised for auction on the
                Platform.
              </li>
              <li>
                <span className="text-foreground font-semibold">Buyer</span>: the user who places bids and/or wins a
                Listing.
              </li>
              <li>
                <span className="text-foreground font-semibold">Seller</span>: the user who lists an item for sale.
              </li>
              <li>
                <span className="text-foreground font-semibold">Winning Bid</span>: the highest valid bid when an auction
                ends (or other winning mechanism we provide).
              </li>
              <li>
                <span className="text-foreground font-semibold">Deal</span>: the transaction record created on the
                Platform after a Winning Bid and successful payment.
              </li>
              <li>
                <span className="text-foreground font-semibold">Delivery Window</span>: the required dispatch/collection
                timeframe described in these Terms and/or shown on the Listing/deal flow.
              </li>
              <li>
                <span className="text-foreground font-semibold">Business Days / Working Days</span>: Monday to Friday
                excluding UK bank holidays.
              </li>
            </ul>
          </section>

          {/* 2. Eligibility */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">2. Eligibility</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You must be at least 18 years old.</li>
              <li>You must provide accurate and truthful information.</li>
              <li>You must be legally capable of entering into binding agreements.</li>
              <li>
                Fraud, identity misuse, stolen-goods activity, chargeback abuse, or providing false information may
                result in immediate suspension or closure of your account.
              </li>
            </ul>
          </section>

          {/* 3. Accounts */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for keeping your login details secure and for all activity carried out using your
              account. You must notify us immediately if you suspect unauthorised access.
            </p>
            <p className="mt-2 text-muted-foreground">We may suspend, restrict or terminate accounts that:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Provide false or misleading information.</li>
              <li>Engage in abusive, fraudulent, suspicious, or illegal activity.</li>
              <li>Breach these Terms or any applicable law.</li>
              <li>Repeatedly fail to complete purchases or fulfil sales.</li>
            </ul>
          </section>

          {/* 4. Our role */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">4. Our Role &amp; Contracts Between Users</h2>
            <p>
              We provide the Platform and tools for buyers and sellers to transact. Except where we expressly state
              otherwise, we are not the seller of items and we do not take ownership of items listed. The contract of
              sale is generally between the Buyer and the Seller.
            </p>
            <p className="mt-2">
              The Platform may collect and hold payments connected with a Deal (for example, holding funds until receipt
              confirmation) to operate the marketplace flow. This does not make us the seller of the goods.
            </p>
          </section>

          {/* 5. Listings */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              5. Listings, Item Condition &amp; Authenticity
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>By listing an item, the Seller confirms they are the legal owner or have the legal right to sell it.</li>
              <li>
                Sellers must describe items accurately, including condition, faults, missing parts, included accessories,
                compatibility and any modifications.
              </li>
              <li>
                Photos must represent the <span className="text-foreground font-semibold">actual item</span> being sold
                (not stock photos).
              </li>
              <li>
                Where relevant, Sellers should include shutter count, serial number information, and must not unlawfully
                remove or alter serial numbers.
              </li>
              <li>Counterfeit, replica, stolen, recalled/unsafe, or illegal goods are prohibited.</li>
              <li>
                We may edit, suspend, refuse, or remove any listing at our discretion, including where we suspect
                misrepresentation, fraud, prohibited items, or policy breaches.
              </li>
              <li>We do not guarantee any listing will sell or achieve a particular price.</li>
            </ul>
          </section>

          {/* 6. Auctions */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">6. Auctions &amp; Bidding Rules</h2>
            <p>
              Auctions run on scheduled windows. Listing start/end times may be shown on the Listing page. We may adjust
              scheduling, duration, increments, and mechanics from time to time.
            </p>
            <p className="mt-2">Key rules include:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <span className="text-foreground font-semibold">Bids are legally binding</span> offers to purchase if you
                win, subject to these Terms and successful payment.
              </li>
              <li>You must ensure you have sufficient funds available, including any buyer-facing fees shown at checkout.</li>
              <li>
                We may use a soft-close system: bids close to the end may extend the end time to reduce &quot;sniping&quot;.
              </li>
              <li>
                We may cancel or void an auction where we reasonably suspect fraud, error, technical issues, or other
                exceptional circumstances.
              </li>
            </ul>
          </section>

          {/* 7. Winning bid and payment */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              7. Winning Bids, Payment Collection &amp; Deal Creation
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                If you win, you enter a binding commitment to purchase at the Winning Bid price plus any fees shown at
                checkout.
              </li>
              <li>
                We may collect payment automatically using a saved payment method (where you have authorised this) and/or
                require immediate checkout.
              </li>
              <li>When payment succeeds, a Deal record is created and the post-sale steps begin.</li>
              <li>
                Payment may be held pending completion steps (dispatch, delivery, receipt confirmation and/or dispute
                handling).
              </li>
            </ul>
          </section>

          {/* 8. Delivery/dispatch */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">8. Delivery Window, Dispatch &amp; Collection</h2>
            <p>
              The Platform is designed to protect both parties by enforcing a delivery window and holding Seller payout
              until the Buyer confirms receipt (or auto-release applies).
            </p>

            <h3 className="font-semibold mt-3 text-foreground">8.1 Dispatch deadline</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Unless the Listing states otherwise, the Seller must dispatch the item within{" "}
                <span className="text-foreground font-semibold">3 working days</span> of Deal creation (successful
                payment).
              </li>
              <li>Sellers must package items appropriately and choose a delivery method suitable for the item’s value.</li>
              <li>Sellers must provide dispatch proof and, where available, tracking details through the Platform.</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">8.2 Collection</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                If collection is offered, both parties must follow agreed instructions, act safely and respectfully, and
                complete collection within the required window shown in the Deal flow.
              </li>
              <li>Sellers may be asked to confirm handover (for example, by marking collected).</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">8.3 Failure to dispatch</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                If the Seller fails to dispatch or make available for collection within the Delivery Window, we may
                cancel the Deal and refund the Buyer (subject to checks and evidence).
              </li>
              <li>Repeated failure to dispatch may result in account restrictions or suspension.</li>
            </ul>
          </section>

          {/* 9. Receipt confirmation and payout */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              9. Buyer Receipt Confirmation &amp; Release of Seller Funds
            </h2>
            <p>
              <span className="text-foreground font-semibold">Important:</span> the Seller does not receive funds
              immediately upon a win. Funds are normally held until the Buyer confirms receipt (or auto-release applies).
            </p>

            <h3 className="font-semibold mt-3 text-foreground">9.1 Buyer confirmation window</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>The Buyer must confirm receipt promptly after delivery/collection.</li>
              <li>
                Where tracking shows a delivered status, the Buyer must either confirm receipt or raise a dispute within{" "}
                <span className="text-foreground font-semibold">48 hours</span> of delivery status.
              </li>
              <li>
                If no tracking is provided, the Buyer must confirm receipt or raise a dispute within{" "}
                <span className="text-foreground font-semibold">14 days</span> of the Seller marking the item as
                dispatched.
              </li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">9.2 Auto-release</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                If the Buyer does not confirm receipt or raise a dispute within the time limits above, we may treat the
                item as accepted and release Seller funds automatically.
              </li>
              <li>Auto-release exists to prevent Deals being stalled indefinitely.</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">9.3 What the Seller receives</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Seller payout is typically the sale price minus any commission/fees and any adjustments clearly shown for
                that Deal.
              </li>
              <li>Payout timing can vary based on the payment provider, verification checks, disputes, or risk controls.</li>
            </ul>
          </section>

          {/* 10. Fees */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">10. Fees</h2>

            <h3 className="font-semibold mt-2 text-foreground">10.1 Listing fees</h3>
            <p>
              Listing may be free during introductory/promotional periods. We reserve the right to introduce or amend
              listing fees in the future, and will make any such fees clear before you list.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">10.2 Commission</h3>
            <p>
              A commission fee may be charged on successful sales. Commission is normally calculated as a percentage of
              the final sale price and is deducted from the Seller’s proceeds. No commission is usually charged if the
              item does not sell or the Deal is cancelled/refunded before completion.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">10.3 Delivery costs</h3>
            <p>
              Delivery/postage costs (if any) are shown on the Listing and/or during the Deal flow. Sellers must still
              meet dispatch obligations regardless of delivery cost arrangements.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">10.4 Taxes</h3>
            <p>
              Users are responsible for any tax obligations arising from purchases or sales. If VAT or other taxes apply
              to Platform fees, we will present them where required.
            </p>

            <h3 className="font-semibold mt-3 text-foreground">10.5 Refunds of fees</h3>
            <p>
              Fees and commissions are generally non-refundable unless required by law or we expressly agree in writing.
              Where a refund is issued, it may be limited to the amounts paid through the Platform for the specific Deal.
            </p>
          </section>

          {/* 11. Payments & Stripe */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">11. Payment Processing &amp; Stripe</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                Card payments are processed securely by <span className="text-foreground font-semibold">Stripe</span> or
                another reputable payment provider.
              </li>
              <li>
                Your card details are handled by the payment provider and are{" "}
                <span className="text-foreground font-semibold">not stored on our servers</span>.
              </li>
              <li>
                By adding a payment method, you authorise us and/or the payment provider to charge that method for:
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Winning bids and purchases.</li>
                  <li>Any buyer-facing fees shown at checkout for that transaction.</li>
                  <li>Any permitted transaction adjustments with your consent.</li>
                </ul>
              </li>
              <li>
                If a payment is declined, reversed, or charged back, we may cancel the Deal, restrict your account, and
                take reasonable steps to protect affected users.
              </li>
              <li>
                You must not raise unjustified chargebacks or disputes. Chargeback abuse may result in suspension or
                closure of your account.
              </li>
            </ul>
          </section>

          {/* 12. Cancellations and non-completion */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">
              12. Cancellations, Non-Completion &amp; Failed Deals
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>If a Buyer fails to pay or complete required steps promptly, we may cancel the Deal and take action on the account.</li>
              <li>
                If a Seller fails to dispatch/complete handover within the Delivery Window, we may cancel the Deal and refund
                the Buyer (subject to checks/evidence).
              </li>
              <li>
                We may cancel or reverse a Deal where we reasonably suspect fraud, error, prohibited items, or serious policy
                breach.
              </li>
            </ul>
          </section>

          {/* 13. Disputes */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">13. Non-Delivery, Misdescription &amp; Disputes</h2>

            <h3 className="font-semibold mt-2 text-foreground">13.1 Non-delivery</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>If an item is not delivered/collected within a reasonable time, the Buyer must raise a dispute promptly through the Platform.</li>
              <li>We may request evidence from both parties (tracking, dispatch proof, messages, photos, serial numbers).</li>
              <li>Where appropriate, we may cancel the Deal and refund the Buyer.</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">13.2 Misdescription / condition disputes</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Sellers must describe condition accurately. Buyers should review photos and the description carefully before bidding.</li>
              <li>
                If an item materially differs from the Listing (e.g. wrong model, major undisclosed faults, missing key components),
                the Buyer must raise a dispute within the confirmation window.
              </li>
              <li>We may require the Buyer to provide photo/video evidence and require the Seller to respond within a set timeframe.</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">13.3 Counterfeit / stolen goods</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Listings suspected to involve counterfeit or stolen goods may be removed and Deals may be frozen/cancelled.</li>
              <li>We may request proof of purchase/ownership and serial number details.</li>
              <li>We may restrict accounts and, where required by law, cooperate with lawful requests from authorities.</li>
            </ul>

            <h3 className="font-semibold mt-3 text-foreground">13.4 How disputes may be handled</h3>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>We may hold funds while a dispute is reviewed.</li>
              <li>We may issue a refund, partial refund, or release funds to the Seller depending on evidence and circumstances.</li>
              <li>We are not obliged to resolve every dispute and may require parties to pursue resolution outside the Platform where appropriate.</li>
              <li>
                <span className="text-foreground font-semibold">Statutory rights:</span> nothing in these Terms affects your statutory consumer rights where they apply.
                Seller obligations may differ depending on whether the Seller is acting as a trader/business or a private individual.
              </li>
            </ul>
          </section>

          {/* 14. Prohibited items */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">14. Prohibited Use &amp; Prohibited Items</h2>
            <p>You must not use AuctionMyCamera.co.uk to:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>List items you do not own or have no right to sell.</li>
              <li>List stolen, counterfeit, illegal, or prohibited goods.</li>
              <li>Engage in fraud, money laundering, or other illegal activity.</li>
              <li>Manipulate auctions (including shill bidding or collusion).</li>
              <li>Harass, abuse, threaten, or dox other users or staff.</li>
              <li>Upload malicious code, attempt to hack, scrape, or disrupt the Platform.</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              We may maintain additional prohibited/restricted item rules for safety and compliance (for example, items that are unlawful, unsafe,
              or require special handling). If in doubt, contact support before listing.
            </p>
          </section>

          {/* 15. Suspension */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">15. Suspension, Restriction &amp; Removal</h2>
            <p>We may suspend, restrict, or remove any account or listing at our discretion where we suspect:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Fraud or attempted fraud.</li>
              <li>Breaches of these Terms or applicable law.</li>
              <li>Activity that could harm other users or our reputation as a marketplace.</li>
              <li>Repeated non-completion of purchases or repeated failure to dispatch.</li>
              <li>Chargeback abuse or repeated payment disputes.</li>
            </ul>
          </section>

          {/* 16. Liability */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">16. Liability</h2>
            <p>
              While we aim to provide a smooth and secure Platform, we do not guarantee uninterrupted or error-free operation,
              or that every listing, bid, or Deal will complete successfully.
            </p>
            <p className="mt-2">To the fullest extent permitted by law, we are not liable for:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Losses arising from disputes between Buyers and Sellers.</li>
              <li>Courier delays, loss, or damage in transit (subject to applicable law and dispute handling above).</li>
              <li>Loss of profit, loss of opportunity, or business interruption.</li>
              <li>Actions or omissions of third parties (including payment providers and couriers).</li>
              <li>Any indirect or consequential losses (except where we cannot exclude them by law).</li>
            </ul>
            <p className="mt-2">
              Nothing in these Terms excludes or limits liability for death or personal injury caused by our negligence, fraud,
              or any other liability that cannot be excluded under applicable law.
            </p>
          </section>

          {/* 17. Changes */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">17. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Changes will normally apply from the date posted on this page.
              Your continued use of AuctionMyCamera.co.uk after changes are published constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 18. Governing Law */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">18. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms, and any dispute or claim arising out of or in connection with them (including non-contractual disputes),
              are governed by the laws of England and Wales.
            </p>
            <p className="mt-2">
              The courts of England and Wales will have non-exclusive jurisdiction. If you are a consumer, you may also have the
              right to bring proceedings in your local courts.
            </p>
          </section>

          {/* 19. Contact */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-foreground">19. Contact</h2>
            <p>If you have any questions about these Terms or a transaction, please contact:</p>
            <p className="mt-2">
              <span className="text-foreground font-semibold">Email:</span>{" "}
              <a href="mailto:support@auctionmycamera.co.uk" className="underline text-primary hover:opacity-80">
                support@auctionmycamera.co.uk
              </a>
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-2">
            These Terms are provided for general information about how the Platform operates. If you need legal advice,
            you should consult a qualified legal professional.
          </p>

          {/* helpful footer links (optional but consistent) */}
          <div className="border-t border-border pt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/faq" className="underline text-primary hover:opacity-80">
              FAQ
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/how-it-works" className="underline text-primary hover:opacity-80">
              How it works
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/fees" className="underline text-primary hover:opacity-80">
              Fees
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link href="/contact" className="underline text-primary hover:opacity-80">
              Contact
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}