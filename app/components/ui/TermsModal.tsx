// app/components/ui/TermsModal.tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function TermsModal({ onClose }: { onClose: () => void }) {
  const year = new Date().getFullYear();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Save the element that had focus before opening (so we can restore it)
    restoreFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Close on Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    // Focus the modal panel for accessibility
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);

      // Restore focus to the previous element (best-effort)
      try {
        restoreFocusRef.current?.focus?.();
      } catch {
        // ignore
      }
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 px-4 bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onPointerDown={(e) => {
        // Click outside the panel closes the modal
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden relative outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2
              id="terms-modal-title"
              className="text-2xl font-bold text-gray-900"
            >
              Terms &amp; Conditions (Summary)
            </h2>
            <p className="text-xs text-gray-500">
              Effective date: see full Terms
            </p>
          </div>

          <button
            className="text-gray-500 hover:text-gray-800 text-xl"
            onClick={onClose}
            aria-label="Close terms"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm leading-relaxed text-gray-800 space-y-4">
          <p>
            Please read these Terms carefully before using{" "}
            <span className="font-semibold">AuctionMyCamera.co.uk</span>. By
            registering, listing, bidding or buying/selling items, you agree to
            be bound by them.
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold text-gray-900 mb-1">This is a summary.</p>
            <p className="text-gray-700">
              The full legal Terms live on the{" "}
              <Link href="/terms" className="underline font-semibold">
                Terms &amp; Conditions page
              </Link>
              . If anything in this summary conflicts with the full Terms, the
              full Terms take priority.
            </p>
          </div>

          <h3 className="font-semibold text-lg mt-4">1. Eligibility</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>You must be at least 18 years old.</li>
            <li>You must provide accurate, truthful information.</li>
            <li>You must be legally capable of entering binding agreements.</li>
            <li>
              Fraud, identity misuse, or false information may result in account
              suspension or closure.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">2. Accounts &amp; Security</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              You are responsible for keeping your login details secure and for
              all activity on your account.
            </li>
            <li>Notify us immediately if you suspect unauthorised access.</li>
            <li>
              We may suspend or restrict accounts for abuse, fraud, suspicious
              activity, chargeback misuse, or breaches of these Terms.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">
            3. Listings, Condition &amp; Accuracy
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Sellers must describe items honestly (condition, faults, shutter
              count where relevant, included accessories, compatibility, and any
              missing parts).
            </li>
            <li>
              Photos must be of the <strong>actual item</strong> being sold (not
              stock images).
            </li>
            <li>
              Counterfeit, replica, stolen, prohibited, or unlawful items are
              not allowed. Listings may be removed without notice.
            </li>
            <li>
              We may request additional information, proof of ownership, or
              clarification before approving or keeping a listing live.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">4. Auction Rules</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Auctions run on timed windows. Timing and scheduling may change.</li>
            <li>
              <strong>Bids are binding.</strong> If you bid and win, you commit to
              purchase (subject to payment verification and platform checks).
            </li>
            <li>
              We may use soft-close rules (bids near the end can extend the end
              time) to reduce last-second sniping.
            </li>
            <li>
              We do not allow shill bidding, collusion, or manipulation. Suspected
              activity may lead to voided sales and account restrictions.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">
            5. Winning, Payment &amp; Authorisation
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              When you win, payment is collected via our payment provider (e.g. Stripe),
              using the checkout flow and/or an authorised saved payment method (where enabled).
            </li>
            <li>We do not store full card details on our servers.</li>
            <li>
              If payment fails, is reversed, or a charge is disputed, we may cancel
              the sale, restrict the account, and/or take steps to protect the marketplace.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">
            6. Dispatch Window, Delivery &amp; Collection
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Sellers must dispatch (or make the item available for collection) within the
              delivery/dispatch window shown on the listing and in the seller dashboard. If no special
              terms are shown, dispatch is usually expected within <strong>3 working days</strong>.
            </li>
            <li>
              Where shipping is used, sellers should provide tracking/proof of dispatch where available
              and package items safely.
            </li>
            <li>
              Where collection is offered, both parties must follow any agreed instructions
              and behave respectfully and safely.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">
            7. Receipt Confirmation &amp; Seller Payout
          </h3>
          <p>
            This site does not work like a basic classifieds site. Our flow is designed to
            protect both sides.
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>The seller does <strong>not</strong> receive funds immediately on a win.</li>
            <li>
              Funds are released after the buyer confirms receipt through the platform{" "}
              <strong>or</strong> the platform flow completes based on evidence available (for example,
              delivery status / timeouts / dispute outcomes as described in the full Terms).
            </li>
            <li>
              If a buyer raises a valid issue (non-delivery, material misdescription, damage in transit),
              payout may be paused while the issue is handled under the platform process.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">8. Fees</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              Listing fees may apply (or may be free during promotional periods). Any fee is shown
              clearly before listing.
            </li>
            <li>
              A commission may be deducted from the seller’s proceeds on successful sales. The rate
              is shown in the seller flow/dashboard.
            </li>
            <li>
              Delivery charges (if any) are shown on the listing and form part of the deal terms.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">9. Prohibited Use</h3>
          <p>You must not use AuctionMyCamera.co.uk to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>List counterfeit, stolen, unlawful, or prohibited items.</li>
            <li>Misrepresent condition, functionality, or included components.</li>
            <li>Manipulate auctions or engage in harassment/abuse.</li>
            <li>Attempt to hack, disrupt, scrape, or abuse the platform.</li>
            <li>Make unjustified chargebacks or payment disputes.</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">10. Platform Role &amp; Disputes</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              We provide the platform and transaction flow. We may assist with disputes but are not
              obliged to resolve every dispute.
            </li>
            <li>
              We may request evidence (photos, tracking, messages, etc.) and take action on accounts
              where we suspect fraud or abuse.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">11. Liability</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              We do not guarantee uninterrupted or error-free operation or that every sale will complete.
            </li>
            <li>
              To the fullest extent permitted by law, we are not liable for indirect or consequential
              losses, or disputes between users, except where liability cannot be excluded.
            </li>
            <li>
              Nothing in these Terms limits liability for fraud, or death/personal injury caused by negligence,
              or any liability that cannot be excluded by law.
            </li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">12. Changes &amp; Contact</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>We may update these Terms from time to time.</li>
            <li>
              Contact:{" "}
              <a
                href="mailto:support@auctionmycamera.co.uk"
                className="underline font-semibold"
              >
                support@auctionmycamera.co.uk
              </a>
            </li>
          </ul>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-600">
              <strong>Brand note:</strong> AuctionMyCamera is an independent marketplace and is not
              affiliated with or endorsed by any camera manufacturer. Brand names are used only to
              describe items listed by sellers.
            </p>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            © {year} AuctionMyCamera.co.uk. All rights reserved.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between gap-3">
          <Link
            href="/terms"
            className="text-sm underline font-semibold text-gray-800"
          >
            View full Terms
          </Link>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-black transition"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}