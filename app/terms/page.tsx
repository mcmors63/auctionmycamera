// app/terms/page.tsx

export const metadata = {
  title: "Terms & Conditions | AuctionMyPlate",
  description:
    "Read the full Terms and Conditions for using AuctionMyPlate.co.uk, including auctions, fees, reserve prices, Stripe payments and DVLA responsibilities.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-700 p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD500] mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-gray-300">
            Effective Date: <strong>February 2025</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Please read these Terms carefully before using AuctionMyPlate.co.uk.
            By registering, listing or bidding, you agree to be bound by them.
          </p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-200">
          <p>
            These Terms and Conditions govern your use of{" "}
            <strong>AuctionMyPlate.co.uk</strong> (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;). By accessing or using the platform, you agree to
            these Terms. If you do not agree, you must not use the website.
          </p>

          <p>
            AuctionMyPlate.co.uk is{" "}
            <strong>not affiliated, authorised, endorsed or associated</strong>{" "}
            with the Driver and Vehicle Licensing Agency (DVLA) or any UK
            government organisation. We operate as an online marketplace that
            connects buyers and sellers of cherished registration numbers.
          </p>

          {/* 1. Eligibility */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              1. Eligibility
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>You must be at least 18 years old.</li>
              <li>You must provide accurate and truthful information.</li>
              <li>You must be legally capable of entering into binding agreements.</li>
              <li>
                Fraud, identity misuse, or providing false information may
                result in immediate suspension or closure of your account.
              </li>
            </ul>
          </section>

          {/* 2. User Accounts */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              2. User Accounts
            </h2>
            <p>
              You are responsible for keeping your login details secure and for
              all activity carried out using your account. You must notify us
              immediately if you suspect unauthorised access to your account.
            </p>
            <p className="mt-2">We reserve the right to suspend or terminate accounts that:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Provide false or misleading information.</li>
              <li>Engage in abusive, fraudulent or suspicious activity.</li>
              <li>Breach these Terms or any applicable law.</li>
            </ul>
          </section>

          {/* 3. Listings & Plate Ownership */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              3. Listings &amp; Plate Ownership
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                By listing a registration, you confirm you are the legal owner
                or have written permission to sell it.
              </li>
              <li>
                You must hold the correct documentation (e.g. V5C, V750, V778,
                retention certificate) and provide it when requested.
              </li>
              <li>
                You must not misrepresent the registration, its eligibility for
                a vehicle, or its legal status.
              </li>
              <li>
                We may edit, suspend or remove any listing at our discretion,
                including where we suspect fraud, misrepresentation, or breach
                of DVLA guidance.
              </li>
              <li>
                You acknowledge that we do not guarantee that any listing will
                sell, or that it will achieve a particular price.
              </li>
            </ul>
          </section>

          {/* 4. Auction Format */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              4. Auction Format
            </h2>
            <p>
              Auctions typically run on a weekly cycle, with plates added into
              a live auction window. Exact timings and scheduling may be
              adjusted by us from time to time.
            </p>
            <p className="mt-2">Key auction rules include (but are not limited to):</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                All bids placed are legally binding offers to purchase if you
                win, subject to these Terms and successful payment and transfer.
              </li>
              <li>
                You must ensure you have the funds available to complete the
                purchase, including any fees clearly shown at checkout.
              </li>
              <li>
                Reserve prices are hidden from bidders. If the reserve is not
                met, the plate does not have to be sold.
              </li>
              <li>
                We may operate a soft-close system. Bids placed close to the
                end of the auction may extend the auction end time to reduce
                &quot;sniping&quot;.
              </li>
              <li>
                We may cancel or void an auction where we reasonably suspect
                error, fraud, technical issues or other exceptional
                circumstances.
              </li>
            </ul>
          </section>

          {/* 5. Buy Now */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              5. Buy Now
            </h2>
            <p>
              Some plates may offer a <strong>Buy Now</strong> option. Where
              available:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Using Buy Now places an immediate and binding commitment to
                purchase at the displayed price (plus any applicable fees shown
                at checkout).
              </li>
              <li>
                The auction will end once Buy Now is used, and the listing will
                be treated as sold (subject to successful payment and transfer).
              </li>
              <li>
                You must complete payment and any required documentation
                promptly. We may use saved payment methods to complete the
                transaction where you have authorised this.
              </li>
            </ul>
          </section>

          {/* 6. Reserve Prices */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              6. Reserve Prices
            </h2>
            <p>
              The seller may set a reserve price (minimum acceptable sale
              price). This value is not shown publicly.
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                If the final bid is <strong>below</strong> the reserve price, the
                seller is not obliged to complete the sale.
              </li>
              <li>
                If the final bid is <strong>at or above</strong> the reserve
                price, the plate should be treated as sold and both parties are
                expected to complete the transaction.
              </li>
            </ul>
          </section>

          {/* 7. Fees */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">7. Fees</h2>

            <h3 className="font-semibold mt-2 text-gray-100">7.1 Listing Fees</h3>
            <p>
              Listing may be free during introductory or promotional periods.
              We reserve the right to introduce or amend listing fees in the
              future, and will make such fees clear before you list.
            </p>

            <h3 className="font-semibold mt-3 text-gray-100">7.2 Commission</h3>
            <p>
              A commission fee may be charged on successful sales. Commission is
              normally calculated as a percentage of the final sale price and
              is deducted from the seller&apos;s proceeds. No commission is
              usually charged if the plate does not sell.
            </p>

            <h3 className="font-semibold mt-3 text-gray-100">
              7.3 DVLA Assignment Fee (£80.00)
            </h3>
            <p>
              The DVLA assignment/transfer process has a fixed <strong>£80.00</strong>{" "}
              fee.
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-2">
              <li>
                <strong>Default:</strong> the <strong>seller</strong> covers the DVLA fee and
                it is deducted from the seller&apos;s proceeds when a sale completes.
              </li>
              <li>
                <strong>Legacy exception:</strong> a small number of older listings may
                charge the DVLA fee to the <strong>buyer</strong>. If applicable, this will be
                clearly shown on the listing and at checkout.
              </li>
              <li>
                AuctionMyPlate.co.uk has no affiliation with the DVLA; this fee relates to the DVLA
                assignment/transfer process and the associated handling of required steps.
              </li>
            </ul>

            <h3 className="font-semibold mt-3 text-gray-100">7.4 Taxes &amp; Other Costs</h3>
            <p>
              Buyers are responsible for any additional costs, such as number
              plate manufacture, fitting, and any taxes or charges levied by
              third parties. Sellers are responsible for any tax that may arise
              on their sale proceeds.
            </p>

            <h3 className="font-semibold mt-3 text-gray-100">7.5 Refunds</h3>
            <p>
              Fees and commissions are generally non-refundable unless we are
              required by law to issue a refund, or we expressly agree to one
              in writing. Where a refund is issued, it may be limited to the
              amounts paid through the platform for the specific transaction.
            </p>
          </section>

          {/* 8. Payment Processing & Stripe */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              8. Payment Processing &amp; Stripe
            </h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                Card payments on AuctionMyPlate are processed securely by{" "}
                <strong>Stripe</strong> or another reputable payment provider.
              </li>
              <li>
                Your card details are handled by the payment provider and are{" "}
                <strong>not stored on our servers</strong>. For more detail on
                how your data is handled, please see our Privacy Policy and
                Stripe&apos;s own terms and privacy policy.
              </li>
              <li>
                By adding a card or payment method, you authorise us and/or
                Stripe to charge that method for:
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Winning bids and Buy Now purchases.</li>
                  <li>
                    Any applicable buyer-facing fees shown at checkout (for example, fees that apply to a specific listing).
                  </li>
                  <li>
                    Any agreed adjustments or charges directly related to the
                    transaction (for example, where a bid is corrected or
                    reprocessed with your consent).
                  </li>
                </ul>
              </li>
              <li>
                In some cases we may charge your saved payment method
                automatically (for example, after you win an auction or use Buy
                Now) in line with how the platform is designed to operate.
              </li>
              <li>
                Where a payment is declined, reversed or charged back, we may:
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Cancel or void the transaction.</li>
                  <li>Restrict or suspend your account.</li>
                  <li>
                    Pass reasonable information to the seller so they can
                    understand why a sale has failed.
                  </li>
                </ul>
              </li>
              <li>
                You must not raise unjustified chargebacks or disputes. Doing so
                may result in suspension or closure of your account.
              </li>
            </ul>
          </section>

          {/* 9. Transfer of Registration */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              9. Transfer of Registration
            </h2>

            <p className="font-semibold mt-1 text-gray-100">
              Seller responsibilities:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Provide accurate details and valid DVLA documentation.</li>
              <li>
                Co-operate promptly with us and/or the buyer to complete the
                transfer.
              </li>
              <li>
                Not to withhold documents or deliberately delay the transfer
                without valid reason.
              </li>
            </ul>

            <p className="font-semibold mt-3 text-gray-100">
              Buyer responsibilities:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>
                Ensure the intended vehicle is eligible for the registration
                under DVLA rules (including age-related and format rules).
              </li>
              <li>
                Provide accurate details required for the DVLA transfer and pay
                any buyer-facing fees clearly shown at checkout.
              </li>
              <li>Submit and sign documentation promptly when requested.</li>
            </ul>

            <p className="mt-3">
              We are not responsible for delays, rejections or issues caused by
              DVLA, postal services, errors in information supplied by users, or
              failure by either party to co-operate.
            </p>
          </section>

          {/* 10. Legal Display of Plates */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              10. Legal Display of Plates
            </h2>
            <p>
              All number plates must be displayed in accordance with DVLA and UK
              law (including font, spacing, colouring, and placement).
            </p>
            <p className="mt-2">
              It is the driver&apos;s responsibility to ensure the plate is
              displayed legally. We are not responsible for fines, penalties,
              MOT failures or enforcement action arising from illegal spacing,
              misrepresentation, or non-compliant plates.
            </p>
          </section>

          {/* 11. Prohibited Use */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              11. Prohibited Use
            </h2>
            <p>You must not use AuctionMyPlate.co.uk to:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>List plates you do not own or have no right to sell.</li>
              <li>Engage in fraud, money laundering or other illegal activity.</li>
              <li>
                Manipulate auctions (including shill bidding or colluding to
                distort prices).
              </li>
              <li>Harass, abuse or threaten other users or staff.</li>
              <li>Upload malicious code, attempt to hack, or disrupt the platform.</li>
            </ul>
          </section>

          {/* 12. Platform Role & Disputes */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              12. Platform Role &amp; Disputes Between Users
            </h2>
            <p>
              We provide the platform and tools for buyers and sellers to
              transact. Except where we expressly state otherwise, we are not a
              party to the contract of sale between buyer and seller.
            </p>
            <p className="mt-2">
              If a dispute arises between users (for example, about condition,
              delays, or behaviour), we may at our discretion:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Provide information that we reasonably hold about the deal.</li>
              <li>Offer guidance or informal assistance.</li>
              <li>
                Take action on the relevant accounts (including suspension)
                where we consider it appropriate.
              </li>
            </ul>
            <p className="mt-2">
              We are not obliged to resolve every dispute and we are not
              responsible for enforcing contracts between buyers and sellers.
            </p>
          </section>

          {/* 13. Liability */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              13. Liability
            </h2>
            <p>
              While we aim to provide a smooth and secure platform, we do not
              guarantee uninterrupted or error-free operation, or that every
              listing, bid or sale will complete successfully.
            </p>
            <p className="mt-2">To the fullest extent permitted by law, we are not liable for:</p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Losses arising from disputes between buyers and sellers.</li>
              <li>DVLA decisions, delays or administrative errors.</li>
              <li>Loss of data, loss of profit, loss of opportunity or business interruption.</li>
              <li>
                Actions or omissions of third parties (including payment
                providers, mail/courier services or plate manufacturers).
              </li>
              <li>
                Any indirect or consequential losses (except where we cannot
                exclude them by law).
              </li>
            </ul>
            <p className="mt-2">
              Nothing in these Terms excludes or limits liability for death or
              personal injury caused by our negligence, fraud, or any other
              liability that cannot be excluded under applicable law.
            </p>
          </section>

          {/* 14. Non-Payment by Buyer */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              14. Non-Payment by Buyer
            </h2>
            <p>
              If a winning bidder fails to pay or complete required steps within
              a reasonable time:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>We may cancel the sale.</li>
              <li>
                We may suspend or terminate the buyer&apos;s account and/or
                restrict future use.
              </li>
              <li>The seller may be allowed to relist the registration.</li>
              <li>
                We may record the non-payment internally and/or share it with
                the affected seller, where appropriate.
              </li>
            </ul>
          </section>

          {/* 15. Suspension & Removal */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              15. Suspension &amp; Removal
            </h2>
            <p>
              We may suspend, restrict or remove any account or listing at our
              discretion where we suspect:
            </p>
            <ul className="list-disc ml-5 space-y-1 mt-1">
              <li>Fraud or attempted fraud.</li>
              <li>Abusive or threatening behaviour.</li>
              <li>Breaches of these Terms or applicable law.</li>
              <li>
                Activity that could harm other users or our reputation as a
                marketplace.
              </li>
            </ul>
          </section>

          {/* 16. Changes to Terms */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              16. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. Changes will normally
              apply from the date they are posted on this page. Your continued
              use of AuctionMyPlate.co.uk after changes are published
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 17. Governing Law & Jurisdiction */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              17. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms, and any dispute or claim arising out of or in
              connection with them (including non-contractual disputes), are
              governed by the laws of England and Wales.
            </p>
            <p className="mt-2">
              The courts of England and Wales will have non-exclusive
              jurisdiction. If you are a consumer, you may also have the right
              to bring proceedings in your local courts.
            </p>
          </section>

          {/* 18. Contact */}
          <section>
            <h2 className="font-semibold text-lg mb-2 text-[#FFD500]">
              18. Contact
            </h2>
            <p>
              If you have any questions about these Terms, your account, or a
              specific transaction, please contact:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@auctionmyplate.co.uk"
                className="text-[#FFD500] underline"
              >
                support@auctionmyplate.co.uk
              </a>
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
