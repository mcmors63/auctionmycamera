// app/components/dashboard/TransferTimelines.tsx
"use client";

import Link from "next/link";

export default function TransferTimelines() {
  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2">
      {/* Buyer timeline card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Buyer Transfer Timeline
        </h2>
        <p className="text-sm text-gray-700">
          This is what to expect after you win a plate or use Buy Now.
        </p>
        <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
          <li>Pay securely through AuctionMyPlate using Stripe.</li>
          <li>
            Upload the documents we request (for example your V5C and ID) as
            soon as possible.
          </li>
          <li>
            We submit the DVLA transfer once everything is received – usually
            within <span className="font-semibold">1–2 working days</span>.
          </li>
          <li>
            DVLA complete the transfer:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                Online / simple cases: often{" "}
                <span className="font-semibold">same day</span>.
              </li>
              <li>
                Postal / complex cases: usually{" "}
                <span className="font-semibold">2–4 weeks</span>.
              </li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">
              We email you when DVLA has assigned the plate to your vehicle.
            </span>{" "}
            This is the point you can obtain and fit physical plates.
          </li>
        </ol>
        <p className="text-xs text-gray-600 mt-2">
          As a sensible worst-case, allow up to{" "}
          <span className="font-semibold">6 weeks</span> from payment to final
          DVLA paperwork, although many transfers complete much sooner.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
          <span className="font-semibold">Important:</span> do not drive your
          vehicle displaying the new registration until we confirm the DVLA
          assignment is complete. Ordering plates early is fine –{" "}
          <span className="font-semibold">fitting them early is not</span>.
        </p>
        <div className="mt-3">
          <Link
            href="/faq#buyer-timeline"
            className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
          >
            Learn more in the full Buyer FAQ
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* Seller timeline card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Seller Payout Timeline
        </h2>
        <p className="text-sm text-gray-700">
          When your plate sells, we protect both you and the buyer by only
          paying out once the DVLA transfer is complete.
        </p>
        <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
          <li>
            The buyer pays in full and their funds are held securely by
            AuctionMyPlate.
          </li>
          <li>
            We request your DVLA documents (for example V750, V778 or V5C). The
            faster you upload them, the faster your sale completes.
          </li>
          <li>
            We submit the DVLA transfer, usually within{" "}
            <span className="font-semibold">1–2 working days</span> of having
            all documents.
          </li>
          <li>
            DVLA complete the transfer. Online cases can be rapid; postal /
            complex cases typically take{" "}
            <span className="font-semibold">2–4 weeks</span>.
          </li>
          <li>
            Once DVLA confirm the plate has left your control, we run final
            checks and release your proceeds to your nominated bank account.
          </li>
        </ol>
        <p className="text-xs text-gray-600 mt-2">
          In straightforward cases, you should normally receive funds{" "}
          <span className="font-semibold">within 2–5 working days</span> of DVLA
          confirming the transfer.
        </p>
        <p className="text-xs text-gray-600">
          As a clear upper limit, please allow up to{" "}
          <span className="font-semibold">6 weeks</span> from the date of buyer
          payment to final payout, to cover DVLA delays and compliance checks.
        </p>
        <div className="mt-3">
          <Link
            href="/faq#seller-timeline"
            className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
          >
            Learn more in the full Seller FAQ
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
