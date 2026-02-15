// app/admin/dvla-transfer-guide/page.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sale Handover Guide | Admin | AuctionMyCamera",
  description:
    "Internal admin guide for handling AuctionMyCamera sales: payment checks, item verification, delivery/collection, disputes, and payout release.",
  robots: { index: false, follow: false },
};

export default function AdminSaleHandoverGuidePage() {
  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-6 md:p-10 space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Admin Sale Handover Guide
          </h1>
          <p className="text-gray-700">
            Internal instructions for AuctionMyCamera staff on how to manage a
            completed sale: confirm payment, verify item details, coordinate
            delivery/collection, handle disputes, and release seller payout.
          </p>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">
            INTERNAL USE ONLY – DO NOT SHARE WITH CUSTOMERS
          </p>
        </header>

        {/* SECTION 1 – Overview & principles */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            1. Core principles
          </h2>
          <ul className="list-disc pl-6 text-gray-800 space-y-2">
            <li>
              AuctionMyCamera is the structured marketplace layer. Payments are
              handled through{" "}
              <span className="font-semibold">Stripe</span>, and the item handover
              is coordinated between buyer and seller based on the listing terms.
            </li>
            <li>
              Our job is to protect both parties with a clear process:
              <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                <li>Confirm payment status before progressing.</li>
                <li>Ensure item identity/condition expectations are clear.</li>
                <li>Record delivery/collection details and dates.</li>
                <li>Only release seller payout when your internal rules say it’s safe.</li>
              </ul>
            </li>
            <li>
              If something feels wrong (fraud signals, mismatched details, unusual
              requests),{" "}
              <span className="font-semibold">pause and escalate</span>.
            </li>
          </ul>
        </section>

        {/* SECTION 2 – Pre-checks */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            2. Before you start any handover work
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                2.1 Check the listing & transaction in AuctionMyCamera
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>Listing status is SOLD / AWAITING HANDOVER (or equivalent).</li>
                <li>
                  Stripe payment is fully successful (no pending / failed / disputed flags).
                </li>
                <li>
                  Buyer and seller contact details are complete (name, address, email, phone).
                </li>
                <li>
                  Any special listing terms are recorded (collection only, delivery cost, etc.).
                </li>
              </ul>
            </div>

            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                2.2 Confirm you have the essentials for verification
              </h3>
              <p className="text-sm text-gray-800">
                You should have enough information to confirm what was sold:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>
                  The listing’s brand/model and key included items (caps, hood,
                  battery, charger, case, box, filters, etc.).
                </li>
                <li>
                  Any serial number / unique identifiers if the seller provided them.
                </li>
                <li>
                  Photos that clearly match the item condition described.
                </li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="font-semibold">If anything is unclear</span>, stop
            and request clarification or evidence before progressing. Don’t rely
            on assumptions.
          </p>
        </section>

        {/* SECTION 3 – Item identity & condition */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            3. Verify item identity & expectations
          </h2>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.1 Confirm what’s included
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>Body only vs kit lens vs multiple lenses.</li>
              <li>Battery/charger included, original box, manuals, straps, caps.</li>
              <li>Accessories: bags, filters, flashes, grips, memory cards, etc.</li>
              <li>Any defects disclosed: scratches, fungus, haze, AF issues, stuck aperture, etc.</li>
            </ul>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.2 High-risk categories (extra care)
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                High-value lenses/bodies: ask for serial confirmation (photo) if not already provided.
              </li>
              <li>
                “For parts / not working”: ensure buyer acknowledged it clearly.
              </li>
              <li>
                Vintage gear: clarify that wear is expected; verify any “tested/working” claims.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 4 – Delivery / collection */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            4. Delivery / collection coordination
          </h2>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              4.1 Collection
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>Confirm collection location and a safe time window.</li>
              <li>Advise both parties to bring proof of identity.</li>
              <li>Encourage a quick inspection at handover (match photos/description).</li>
            </ul>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              4.2 Delivery
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>Confirm the delivery charge (if any) and who pays it.</li>
              <li>Require tracked shipping for anything valuable.</li>
              <li>Record carrier + tracking number + dispatch date in your admin notes.</li>
            </ul>
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-2">
              If tracking shows delivered, record the timestamp and keep it with the transaction record.
            </p>
          </div>
        </section>

        {/* SECTION 5 – After handover / disputes / payout */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            5. After handover: confirmation, disputes, payout
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                5.1 What you must do in AuctionMyCamera
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>Update listing status to COMPLETED (or equivalent).</li>
                <li>Update transaction record with handover/dispatch details.</li>
                <li>Send buyer/seller completion emails if your system supports them.</li>
              </ul>
            </div>

            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                5.2 When to release seller funds
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>Only after your defined “safe point” is met (e.g. delivery confirmed / collection completed).</li>
                <li>Check for disputes/chargeback signals before releasing payout.</li>
                <li>Record payout status + date + reference once sent.</li>
              </ul>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                If there is any doubt,{" "}
                <span className="font-semibold">
                  pause the payout and escalate
                </span>{" "}
                rather than guessing.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 – Quick reference */}
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            6. Quick reference checklist
          </h2>
          <ul className="list-disc pl-6 text-gray-800 space-y-1 text-sm">
            <li>Payment cleared? ✅</li>
            <li>Buyer/seller details complete? ✅</li>
            <li>Listing identity matches (brand/model/photos/notes)? ✅</li>
            <li>High-value item: serial evidence captured if needed? ✅</li>
            <li>Delivery: tracking recorded? / Collection: time/location confirmed? ✅</li>
            <li>Handover complete recorded? ✅</li>
            <li>Completion emails sent (if applicable)? ✅</li>
            <li>Payout released per rules and recorded? ✅</li>
          </ul>
          <p className="text-xs text-gray-600">
            If any step is unclear, stop and escalate. It’s always easier to delay
            a payout than fix a dispute after the fact.
          </p>
        </section>
      </div>
    </main>
  );
}