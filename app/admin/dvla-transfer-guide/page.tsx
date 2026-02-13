// app/admin/dvla-transfer-guide/page.tsx

export const metadata = {
  title: "DVLA Transfer Guide | Admin | AuctionMyPlate",
  description:
    "Internal admin guide for completing DVLA private plate transfers for AuctionMyPlate buyers and sellers.",
};

export default function AdminDvlaTransferGuidePage() {
  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-6 md:p-10 space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Admin DVLA Transfer Guide
          </h1>
          <p className="text-gray-700">
            Internal instructions for AuctionMyPlate staff on how to complete
            private number transfers through DVLA, including certificates,
            grantee / nominee, and vehicle assignments.
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
              DVLA is the authority that actually changes who a registration
              belongs to or which vehicle it is on. AuctionMyPlate manages the{" "}
              <span className="font-semibold">documents and applications</span>{" "}
              between buyer, seller and DVLA.
            </li>
            <li>
              The <span className="font-semibold">Grantee / Purchaser</span> on
              a certificate (V750 / V778) is the person who owns the{" "}
              <span className="font-semibold">right</span> to the registration.
              Only the grantee can assign it.
            </li>
            <li>
              A <span className="font-semibold">Nominee</span> is the person
              whose vehicle the plate can be put on if it is not going on the
              grantee&apos;s own vehicle. The nominee does{" "}
              <span className="font-semibold">not</span> own the plate until
              DVLA have actually assigned it to a vehicle they keep.
            </li>
            <li>
              Our job is to make sure the registration moves safely:
              <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                <li>
                  From the seller or our stock (grantee) &rarr; to the buyer&apos;s
                  vehicle (registered keeper); and
                </li>
                <li>
                  Nobody fits plates or is paid out until the transfer is{" "}
                  <span className="font-semibold">confirmed</span>.
                </li>
              </ul>
            </li>
          </ul>
        </section>

        {/* SECTION 2 – Pre-checks */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            2. Before you start any DVLA transfer
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                2.1 Check the listing & transaction in AuctionMyPlate
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>Listing status is marked as SOLD / AWAITING DVLA.</li>
                <li>
                  Stripe payment is fully successful (no pending / disputed
                  flags).
                </li>
                <li>
                  Buyer transaction record is created with amount, DVLA fee and
                  commission.
                </li>
                <li>
                  Buyer and seller contact details are complete (name, address,
                  email, phone).
                </li>
              </ul>
            </div>

            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                2.2 Confirm you have all required documents
              </h3>
              <p className="text-sm text-gray-800">
                You must have clear scans or photos of:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>
                  <span className="font-semibold">BUYER vehicle</span> – V5C
                  log book (or dealership details if it is a brand-new car).
                </li>
                <li>
                  <span className="font-semibold">PLATE ownership</span>:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      V750 Certificate of Entitlement <span className="font-semibold">or</span>
                    </li>
                    <li>V778 Retention Document, or</li>
                    <li>
                      V5C for the seller&apos;s vehicle if the plate is still on
                      that car.
                    </li>
                  </ul>
                </li>
                <li>
                  Any ID documents you require under your internal KYC policy.
                </li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="font-semibold">If anything is missing</span>, stop
            and request the document through the Transactions area. Do not start
            a DVLA application on guesswork.
          </p>
        </section>

        {/* SECTION 3 – Case A: Plate on certificate */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            3. Case A – Plate held on a certificate (V750 / V778)
          </h2>
          <p className="text-gray-800">
            In this case the registration is not on a vehicle. It is held on a{" "}
            <span className="font-semibold">V750</span> (never assigned) or{" "}
            <span className="font-semibold">V778</span> (taken off a vehicle and
            kept on retention). The seller or AuctionMyPlate is the{" "}
            <span className="font-semibold">Grantee</span>.
          </p>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.1 Check certificate details
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>Certificate is in date (not expired).</li>
              <li>
                The certificate number and registration match the listing in our
                system.
              </li>
              <li>The Grantee details match our seller / stock records.</li>
              <li>
                Note the current Nominee if one is shown. It may be blank or an
                old name – that is normal.
              </li>
            </ul>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.2 Understanding the nominee for certificate plates
            </h3>
            <p className="text-sm text-gray-800">
              DVLA allow the Grantee to{" "}
              <span className="font-semibold">
                add or change a nominee up until, or at the same time as,
                assigning the registration
              </span>{" "}
              to a vehicle. The nominee does not own the plate – it is simply
              the person whose vehicle it can be put on.
            </p>
            <p className="text-sm text-gray-800">
              Practically, for AuctionMyPlate:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>
                We do <span className="font-semibold">not</span> need the buyer
                to appear as nominee before the auction.
              </li>
              <li>
                When we assign the plate to the buyer&apos;s vehicle, we either:
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    update the nominee details into the buyer&apos;s name, and/or
                  </li>
                  <li>
                    assign directly via the online service as the Grantee
                    (depending on what DVLA asks for).
                  </li>
                </ul>
              </li>
              <li>
                If we use the postal route, we complete the nominee section on
                the V750 / V778 with the buyer&apos;s full name before posting.
              </li>
            </ul>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.3 Online assignment – step by step
            </h3>
            <p className="text-sm text-gray-800">
              This is the preferred method – it is usually instant if DVLA
              doesn&apos;t need to inspect the vehicle.
            </p>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>
                Go to GOV.UK and open the{" "}
                <span className="font-semibold">
                  &quot;Assign a private number to a vehicle&quot;
                </span>{" "}
                service in your browser.
              </li>
              <li>
                Select that you are the{" "}
                <span className="font-semibold">Grantee / Purchaser</span> for
                this registration.
              </li>
              <li>
                Enter the private registration number exactly as it appears on
                the certificate (no extra spaces or punctuation).
              </li>
              <li>
                When prompted, enter the certificate reference number from the
                V750 / V778.
              </li>
              <li>
                Enter the{" "}
                <span className="font-semibold">
                  buyer&apos;s vehicle registration
                </span>{" "}
                and the V5C document reference number, plus the V5C keeper&apos;s
                postcode.
              </li>
              <li>
                Follow the on-screen confirmation steps. If the vehicle is
                eligible and no inspection is required, DVLA will confirm that
                the registration has been assigned immediately.
              </li>
            </ol>
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-2">
              When you see DVLA&apos;s confirmation screen, the plate is now
              legally on the buyer&apos;s vehicle. Make a screenshot or note the
              reference number for our records.
            </p>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              3.4 Postal assignment (fallback)
            </h3>
            <p className="text-sm text-gray-800">
              Use this only if the online service will not complete the
              assignment (for example, DVLA require paper documents, name
              issues, or an inspection).
            </p>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>
                Complete the relevant sections of the V750 / V778 including:
                <ul className="list-disc pl-5 space-y-1">
                  <li>Buyer&apos;s full name as the Nominee (if requested).</li>
                  <li>
                    Buyer&apos;s vehicle details &ndash; as per DVLA guidance.
                  </li>
                </ul>
              </li>
              <li>
                Enclose the buyer&apos;s V5C (or V62 + green slip if applicable)
                as per GOV.UK instructions.
              </li>
              <li>
                Post to the DVLA Personalised Registrations address shown on the
                form.
              </li>
              <li>
                Update the transaction in AuctionMyPlate to show{" "}
                <span className="font-semibold">DVLA – posted</span> with the
                date and any tracking reference.
              </li>
            </ol>
          </div>
        </section>

        {/* SECTION 4 – Case B: Plate currently on seller vehicle */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            4. Case B – Plate currently on the seller&apos;s vehicle
          </h2>
          <p className="text-gray-800">
            Here the private plate is still on the seller&apos;s car. We usually
            follow a two-step process:
          </p>
          <ol className="list-decimal pl-5 text-gray-800 space-y-1 text-sm">
            <li>Remove the plate into retention (V778) in the seller&apos;s name.</li>
            <li>Assign the retained plate from the V778 to the buyer&apos;s vehicle.</li>
          </ol>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              4.1 Take the plate off the seller&apos;s vehicle (online)
            </h3>
            <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
              <li>
                Go to GOV.UK and open the{" "}
                <span className="font-semibold">
                  &quot;Take a registration number off a vehicle&quot;
                </span>{" "}
                service.
              </li>
              <li>Enter the seller&apos;s current registration and V5C details.</li>
              <li>
                Follow the prompts to retain the number. DVLA will usually:
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    issue a retention confirmation (V778 reference); and
                  </li>
                  <li>
                    reassign the vehicle back to its original age-related
                    registration.
                  </li>
                </ul>
              </li>
              <li>
                Save / note the retention reference (V778). Update the listing
                record with the new retention details.
              </li>
            </ol>
          </div>

          <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-semibold text-gray-900">
              4.2 Assign from retention to buyer&apos;s vehicle
            </h3>
            <p className="text-sm text-gray-800">
              Once you have the V778 details (or DVLA online confirmation),
              treat it the same as a standard certificate case:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              <li>Check the V778 is valid and in the seller / our name.</li>
              <li>
                If using post, fill in the Nominee section with the
                buyer&apos;s details.
              </li>
              <li>
                Use the online &quot;Assign a private number&quot; service to
                assign to the buyer&apos;s vehicle using their V5C details.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION 5 – After DVLA confirms */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            5. After DVLA confirm the transfer
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                5.1 What you must do in AuctionMyPlate
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>
                  Update the listing status to{" "}
                  <span className="font-semibold">Completed / DVLA assigned</span>.
                </li>
                <li>
                  Update the transaction record:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Set DVLA status to &quot;Completed&quot;.</li>
                    <li>Add DVLA reference number and date.</li>
                  </ul>
                </li>
                <li>
                  Trigger / send the{" "}
                  <span className="font-semibold">Buyer DVLA complete</span>{" "}
                  email (plate now legally on their vehicle, they can fit
                  plates).
                </li>
                <li>
                  Trigger / send the{" "}
                  <span className="font-semibold">Seller DVLA complete</span>{" "}
                  email (plate no longer in their control).
                </li>
              </ul>
            </div>

            <div className="border rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="font-semibold text-gray-900">
                5.2 When to release funds to the seller
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                <li>
                  Only after DVLA transfer is confirmed complete (online screen{" "}
                  or written confirmation).
                </li>
                <li>
                  Check for any fraud / compliance flags on the transaction.
                </li>
                <li>
                  If all clear, schedule payout according to our finance rules
                  (for example, within 2–5 working days of DVLA confirmation).
                </li>
                <li>
                  Mark payout status as PAID with date and reference once sent.
                </li>
              </ul>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                If there is any doubt about the DVLA status,{" "}
                <span className="font-semibold">
                  pause the payout and escalate to a senior admin
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
            <li>All documents received (buyer V5C, certificate / V5C from seller)? ✅</li>
            <li>
              Plate on certificate (V750 / V778)? → Use online assign where
              possible.
            </li>
            <li>
              Plate on seller vehicle? → Remove to retention first, then assign
              to buyer.
            </li>
            <li>
              Nominee details updated / handled as part of assignment (online or
              on the form).
            </li>
            <li>DVLA confirms success and reference saved.</li>
            <li>Listing & transaction updated to DVLA COMPLETE.</li>
            <li>Buyer & seller emails sent.</li>
            <li>Seller payout released and recorded.</li>
          </ul>
          <p className="text-xs text-gray-600">
            If any step is unclear, stop and ask a senior admin before
            continuing. It is always easier to delay a transfer than to fix a
            mistake with DVLA after the fact.
          </p>
        </section>
      </div>
    </main>
  );
}
