// app/components/ui/TermsModal.tsx
"use client";

export default function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Terms &amp; Conditions
            </h2>
            <p className="text-xs text-gray-500">
              Effective Date: February 2025
            </p>
          </div>

          <button
            className="text-gray-500 hover:text-gray-700 text-xl"
            onClick={onClose}
            aria-label="Close terms"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm leading-relaxed text-gray-800 space-y-4">
          <p>
            Please read these Terms carefully before using{" "}
            <span className="font-semibold">AuctionMyPlate.co.uk</span>. By
            registering, listing or bidding, you agree to be bound by them.
          </p>

          <p>
            These Terms and Conditions govern your use of{" "}
            <span className="font-semibold">AuctionMyPlate.co.uk</span>{" "}
            (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By accessing or
            using the platform, you agree to these Terms. If you do not agree,
            you must not use the website.
          </p>

          <p>
            AuctionMyPlate.co.uk is not affiliated, authorised, endorsed or
            associated with the Driver and Vehicle Licensing Agency (DVLA) or
            any UK government organisation.
          </p>

          <h3 className="font-semibold text-lg mt-4">1. Eligibility</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>You must be at least 18 years old.</li>
            <li>You must provide accurate and truthful information.</li>
            <li>You must be legally capable of entering into binding agreements.</li>
            <li>
              Fraud, identity misuse, or providing false information may result
              in immediate suspension or closure of your account.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">2. User Accounts</h3>
          <p>
            You are responsible for keeping your login details secure and for
            all activity carried out using your account. You must notify us
            immediately if you suspect unauthorised access to your account.
          </p>
          <p>We reserve the right to suspend or terminate accounts that:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Provide false or misleading information.</li>
            <li>Engage in abusive, fraudulent or suspicious activity.</li>
            <li>Breach these Terms or any applicable law.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">
            3. Listings &amp; Plate Ownership
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              By listing a registration, you confirm you are the legal owner or
              have written permission to sell it.
            </li>
            <li>
              You must hold the correct documentation (e.g. V5C, V750, V778) and
              provide it when requested.
            </li>
            <li>
              You must not misrepresent the registration, its eligibility for a
              vehicle, or its legal status.
            </li>
            <li>
              We may edit, suspend or remove any listing at our discretion,
              including where we suspect fraud, misrepresentation, or breach of
              DVLA guidance.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">4. Auction Format</h3>
          <p>
            Auctions typically run on a weekly cycle, with plates added into a
            live auction window. Exact timings and scheduling may be adjusted by
            us from time to time.
          </p>
          <p>Key auction rules include (but are not limited to):</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>All bids placed are legally binding offers to purchase if you win.</li>
            <li>
              You must ensure you have the funds available to complete the
              purchase, including any fees.
            </li>
            <li>
              Reserve prices are hidden from bidders. If the reserve is not met,
              the plate does not have to be sold.
            </li>
            <li>
              We may operate a soft-close system. Bids placed close to the end
              of the auction may extend the auction end time to reduce
              &quot;sniping&quot;.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">5. Buy Now</h3>
          <p>Some plates may offer a Buy Now option. Where available:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Using Buy Now places an immediate commitment to purchase at the
              displayed price (plus any applicable fees shown at checkout).
            </li>
            <li>
              The auction will end once Buy Now is used, and the listing will be
              treated as sold (subject to successful payment and transfer).
            </li>
            <li>You must complete payment and any required documentation promptly.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">6. Reserve Prices</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              The seller may set a reserve price (minimum acceptable sale price).
              This value is not shown publicly.
            </li>
            <li>
              If the final bid is below the reserve price, the seller is not
              obliged to complete the sale.
            </li>
            <li>
              If the final bid is at or above the reserve price, the plate should
              be treated as sold and both parties are expected to complete the
              transaction.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">7. Fees</h3>

          <p className="font-semibold">7.1 Listing Fees</p>
          <p>
            Listing may be free during introductory or promotional periods. We
            reserve the right to introduce or amend listing fees in the future,
            and will make such fees clear before you list.
          </p>

          <p className="font-semibold mt-2">7.2 Commission</p>
          <p>
            A commission fee may be charged on successful sales. Commission is
            normally calculated as a percentage of the final sale price and is
            deducted from the seller&apos;s proceeds. No commission is usually
            charged if the plate does not sell.
          </p>

          <p className="font-semibold mt-2">
            7.3 DVLA Assignment Fee (&pound;80.00)
          </p>
          <p>
            The DVLA assignment/transfer process has a fixed{" "}
            <strong>&pound;80.00</strong> fee.
          </p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>
              <strong>Default:</strong> the <strong>seller</strong> covers the DVLA fee
              and it is deducted from the seller&apos;s proceeds when a sale completes.
            </li>
            <li>
              <strong>Legacy exception:</strong> a small number of older listings may
              charge the DVLA fee to the <strong>buyer</strong>. If applicable, this will be
              clearly shown on the listing and at checkout.
            </li>
            <li>
              AuctionMyPlate.co.uk has no affiliation with DVLA; this fee relates to
              the DVLA assignment/transfer process and the associated handling of
              required steps.
            </li>
          </ul>

          <p className="font-semibold mt-2">7.4 Refunds</p>
          <p>
            Fees and commissions are generally non-refundable unless we are
            required by law to issue a refund, or we expressly agree to one in
            writing.
          </p>

          <h3 className="font-semibold text-lg mt-4">8. Transfer of Registration</h3>
          <p className="font-semibold">Seller responsibilities:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Provide accurate details and valid DVLA documentation.</li>
            <li>
              Co-operate promptly with us and/or the buyer to complete the transfer.
            </li>
            <li>
              Not to withhold documents or deliberately delay the transfer without valid reason.
            </li>
          </ul>
          <p className="font-semibold mt-2">Buyer responsibilities:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Ensure the intended vehicle is eligible for the registration.</li>
            <li>
              Provide accurate details required for the DVLA transfer and pay any
              buyer-facing fees clearly shown at checkout.
            </li>
            <li>Submit and sign documentation promptly when requested.</li>
          </ul>
          <p>
            We are not responsible for delays, rejections or issues caused by DVLA,
            postal services, errors in information supplied by users, or failure by
            either party to co-operate.
          </p>

          <h3 className="font-semibold text-lg mt-4">9. Legal Display of Plates</h3>
          <p>
            All number plates must be displayed in accordance with DVLA and UK law
            (including font, spacing, colouring, and placement).
          </p>
          <p>
            It is the driver&apos;s responsibility to ensure the plate is displayed
            legally. We are not responsible for fines, penalties, MOT failures or
            enforcement action arising from illegal spacing, misrepresentation, or
            non-compliant plates.
          </p>

          <h3 className="font-semibold text-lg mt-4">10. Prohibited Use</h3>
          <p>You must not use AuctionMyPlate.co.uk to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>List plates you do not own or have no right to sell.</li>
            <li>Engage in fraud, money laundering or other illegal activity.</li>
            <li>
              Manipulate auctions (including shill bidding or colluding to distort prices).
            </li>
            <li>Harass, abuse or threaten other users or staff.</li>
            <li>Upload malicious code, attempt to hack, or disrupt the platform.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">11. Liability</h3>
          <p>
            While we aim to provide a smooth and secure platform, we do not
            guarantee uninterrupted or error-free operation.
          </p>
          <p>To the fullest extent permitted by law, we are not liable for:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Losses arising from disputes between buyers and sellers.</li>
            <li>DVLA decisions, delays or administrative errors.</li>
            <li>Loss of data, loss of profit, or business interruption.</li>
            <li>
              Actions or omissions of third parties (including payment providers or delivery services).
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">12. Non-Payment by Buyer</h3>
          <p>
            If a winning bidder fails to pay or complete required steps within a reasonable time:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>We may cancel the sale.</li>
            <li>
              We may suspend or terminate the buyer&apos;s account and/or restrict future use.
            </li>
            <li>The seller may be allowed to relist the registration.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">13. Suspension &amp; Removal</h3>
          <p>
            We may suspend, restrict or remove any account or listing at our discretion where we suspect:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Fraud or attempted fraud.</li>
            <li>Abusive or threatening behaviour.</li>
            <li>Breaches of these Terms or applicable law.</li>
            <li>Activity that could harm other users or our reputation as a marketplace.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">14. Changes to These Terms</h3>
          <p>
            We may update these Terms from time to time. Changes will normally apply from the date they are posted.
            Continued use of AuctionMyPlate.co.uk after changes are published constitutes acceptance of the updated Terms.
          </p>

          <h3 className="font-semibold text-lg mt-4">15. Contact</h3>
          <p>If you have any questions, please contact: support@auctionmyplate.co.uk</p>

          <p className="mt-4 text-xs text-gray-500">
            © 2025 AuctionMyPlate.co.uk. All rights reserved.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
