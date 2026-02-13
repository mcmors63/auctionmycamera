// app/faq/page.tsx

export const metadata = {
  title: "FAQ | AuctionMyPlate",
  description:
    "Common questions about buying and selling cherished plates with AuctionMyPlate.",
};

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-black py-12 px-4 text-gray-100">
      <div className="max-w-5xl mx-auto bg-[#111111] shadow-md rounded-2xl p-8 md:p-12 border border-yellow-700 space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-[#FFD500]">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-200 text-sm md:text-base">
            How the DVLA transfer works, what a nominee is, and how long buyers
            and sellers should expect the process to take.
          </p>
        </header>

        {/* SECTION: Overview */}
        <section id="overview" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Who actually handles the DVLA transfer?
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            DVLA is the government body that legally moves the registration
            number from one keeper or certificate to another. AuctionMyPlate
            acts as the paperwork middle-man: we collect the buyer&apos;s and
            seller&apos;s documents, prepare the DVLA application, submit it,
            and confirm to both parties when the transfer is complete.
          </p>
          <p className="text-gray-200 text-sm md:text-base">
            You should think of it like this:{" "}
            <span className="font-semibold">
              DVLA make the legal change; AuctionMyPlate manages the process and
              keeps everyone updated.
            </span>
          </p>
        </section>

        {/* SECTION: DVLA fee */}
        <section id="dvla-fee" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Who pays the DVLA transfer fee (£80)?
          </h2>
          <div className="border rounded-xl p-4 bg-[#181818] border-gray-700 space-y-3">
            <p className="text-gray-200 text-sm md:text-base">
              DVLA charge a fixed <span className="font-semibold">£80</span> fee
              to assign or transfer a registration.
            </p>
            <ul className="list-disc pl-6 text-gray-200 space-y-1 text-sm md:text-base">
              <li>
                <span className="font-semibold">Default:</span> the{" "}
                <span className="font-semibold">seller</span> covers this cost
                and it is deducted from the seller&apos;s proceeds when a sale
                completes.
              </li>
              <li>
                <span className="font-semibold">Legacy exception:</span> a small
                number of older listings may charge this to the{" "}
                <span className="font-semibold">buyer</span>. If it applies, it
                will be clearly shown on the listing and at checkout.
              </li>
            </ul>
            <p className="text-xs text-gray-400">
              AuctionMyPlate is an independent marketplace and is not affiliated
              with DVLA.
            </p>
          </div>
        </section>

        {/* SECTION: Grantee / Nominee */}
        <section id="grantee-nominee" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Plates on a DVLA certificate – grantee and nominee explained
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            Many cherished registrations are held on a DVLA certificate:
          </p>
          <ul className="list-disc pl-6 text-gray-200 space-y-1 text-sm md:text-base">
            <li>
              <span className="font-semibold">
                V750 Certificate of Entitlement
              </span>{" "}
              – a plate that&apos;s never been on a vehicle; or
            </li>
            <li>
              <span className="font-semibold">V778 Retention Document</span> – a
              plate that has been removed from a vehicle and is being kept
              &quot;on retention&quot;.
            </li>
          </ul>
          <p className="text-gray-200 text-sm md:text-base">
            On these certificates you will usually see two names:
          </p>
          <ul className="list-disc pl-6 text-gray-200 space-y-1 text-sm md:text-base">
            <li>
              <span className="font-semibold">Grantee / Purchaser</span> – the
              person who currently owns the right to the registration.
            </li>
            <li>
              <span className="font-semibold">Nominee</span> – the person whose
              vehicle the number can be assigned to if it is not going onto the
              grantee&apos;s own car.
            </li>
          </ul>
          <p className="text-gray-200 text-sm md:text-base">
            Only the <span className="font-semibold">grantee</span> can instruct
            DVLA to assign the number to a vehicle. The nominee does{" "}
            <span className="font-semibold">not</span> own the registration and
            has no rights over it until DVLA has actually assigned the number to
            a vehicle registered in their name. Once DVLA completes the
            assignment, the rights to that registration pass to the{" "}
            <span className="font-semibold">
              registered keeper of the vehicle
            </span>
            .
          </p>
        </section>

        {/* SECTION: Do I need to be nominee? */}
        <section id="need-nominee" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Do I have to be named as the nominee before I buy a plate?
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            No. You do <span className="font-semibold">not</span> need to be
            named as the nominee on the certificate before you buy a plate
            through AuctionMyPlate.
          </p>
          <p className="text-gray-200 text-sm md:text-base">
            DVLA allow the grantee to{" "}
            <span className="font-semibold">
              add or change a nominee up until, or at the same time as, the
              registration is assigned
            </span>{" "}
            to a vehicle. In plain English: we can update the details when we
            know who you are and which car the plate is going onto.
          </p>
          <p className="text-gray-200 text-sm md:text-base">
            When you buy a plate that is held on a certificate:
          </p>
          <ol className="list-decimal pl-6 text-gray-200 space-y-1 text-sm md:text-base">
            <li>
              The seller (or AuctionMyPlate, if we hold the certificate) acts
              as the <span className="font-semibold">grantee</span>.
            </li>
            <li>
              We collect your full legal name and the details of the vehicle you
              want the plate on (from your V5C log book).
            </li>
            <li>
              As part of the DVLA process we either{" "}
              <span className="font-semibold">
                update the nominee details into your name
              </span>{" "}
              and/or{" "}
              <span className="font-semibold">
                assign the registration straight to your vehicle
              </span>{" "}
              using DVLA&apos;s official online service.
            </li>
          </ol>
          <p className="text-gray-200 text-sm md:text-base">
            You usually never need to deal with DVLA directly to change a
            nominee – we handle it as part of completing the transfer.
          </p>
        </section>

        {/* SECTION: Buyer timeline */}
        <section id="buyer-timeline" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Buyer timeline – how long does the transfer take?
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            Timescales depend on how DVLA process the application. AuctionMyPlate
            submits your transfer promptly once payment has cleared and you have
            provided the documents we ask for. DVLA&apos;s own processing times
            are outside our control, so the timings below are a{" "}
            <span className="font-semibold">realistic guide</span>.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4 bg-[#181818] border-gray-700">
              <h3 className="font-semibold text-[#FFD500] mb-2">
                Standard / online cases
              </h3>
              <ul className="list-disc pl-5 text-gray-200 space-y-1 text-sm">
                <li>
                  Once we have everything we need, we normally submit the DVLA
                  transfer within{" "}
                  <span className="font-semibold">1–2 working days</span>.
                </li>
                <li>
                  Where DVLA can process the assignment online and no inspection
                  is needed, the plate is usually assigned on their system{" "}
                  <span className="font-semibold">the same day</span>.
                </li>
                <li>
                  In practice, most buyers can be fully assigned and ready to
                  fit plates within about{" "}
                  <span className="font-semibold">1–14 days</span> from payment,
                  as long as documents are supplied quickly.
                </li>
              </ul>
            </div>

            <div className="border rounded-xl p-4 bg-[#181818] border-gray-700">
              <h3 className="font-semibold text-[#FFD500] mb-2">
                Postal / complex cases
              </h3>
              <ul className="list-disc pl-5 text-gray-200 space-y-1 text-sm">
                <li>
                  If DVLA require a postal application or extra checks (for
                  example vehicle-to-vehicle transfer or missing paperwork),
                  they typically take around{" "}
                  <span className="font-semibold">2–4 weeks</span> to complete
                  the transfer once they receive everything.
                </li>
                <li>
                  DVLA then post out updated documents such as your new V5C log
                  book. They advise allowing up to{" "}
                  <span className="font-semibold">4 weeks</span> for documents
                  to arrive.
                </li>
                <li>
                  As a sensible worst-case, buyers should assume the entire
                  process from payment to final paperwork can take up to{" "}
                  <span className="font-semibold">6 weeks</span>, although in
                  many cases it is much quicker.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION: When should buyers order / fit plates? */}
        <section id="order-fit-plates" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            When should I order and fit my physical plates?
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            You must{" "}
            <span className="font-semibold">
              never display a registration on a vehicle until DVLA has assigned
              it to that vehicle
            </span>
            . Doing so can result in fines and the registration being withdrawn.
          </p>
          <p className="text-gray-200 text-sm md:text-base">Our guidance is:</p>
          <ul className="list-disc pl-6 text-gray-200 space-y-1 text-sm md:text-base">
            <li>
              <span className="font-semibold">
                Wait until AuctionMyPlate confirms the DVLA assignment is
                complete.
              </span>{" "}
              We will email you clearly when the plate is now on your vehicle.
            </li>
            <li>
              As soon as we send that confirmation, you can{" "}
              <span className="font-semibold">
                obtain physical plates immediately
              </span>{" "}
              from a DVLA-registered supplier, using either your updated V5C or
              the confirmation we provide.
            </li>
            <li>
              Fit the plates and update your insurance and any toll / charging
              accounts without delay so all records match the new registration.
            </li>
          </ul>
        </section>

        {/* SECTION: Seller timeline */}
        <section id="seller-timeline" className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#FFD500]">
            Seller timeline – when do I get paid?
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            For security and to protect buyers and sellers, AuctionMyPlate{" "}
            <span className="font-semibold">
              only releases sale proceeds once the DVLA transfer is complete
            </span>{" "}
            and the registration has safely left your control.
          </p>

          <div className="border rounded-xl p-4 bg-[#181818] border-gray-700">
            <h3 className="font-semibold text-[#FFD500] mb-2">
              Typical seller journey
            </h3>
            <ol className="list-decimal pl-6 text-gray-200 space-y-1 text-sm">
              <li>
                Your plate sells and the buyer&apos;s payment clears via Stripe.
              </li>
              <li>
                We request the documents we need from you (for example V750,
                V778 or your V5C) and from the buyer.
              </li>
              <li>
                Once we have everything, we submit the DVLA transfer, usually
                within <span className="font-semibold">1–2 working days</span>.
              </li>
              <li>
                DVLA complete the transfer. Online cases can be same-day;
                postal / complex cases typically take{" "}
                <span className="font-semibold">2–4 weeks</span>.
              </li>
              <li>
                After DVLA confirm the transfer, we run final fraud / compliance
                checks and then release your proceeds to your nominated bank
                account.
              </li>
              <li className="pt-1">
                Your final payout is your sale price minus any applicable fees
                (for example, commission and the DVLA fee where the seller covers it).
              </li>
            </ol>
          </div>

          <div className="border rounded-xl p-4 bg-[#181818] border-gray-700">
            <h3 className="font-semibold text-[#FFD500] mb-2">
              Maximum payout timing
            </h3>
            <p className="text-gray-200 text-sm mb-2">
              Our aim is to pay sellers as quickly as possible while keeping the
              process secure:
            </p>
            <ul className="list-disc pl-6 text-gray-200 space-y-1 text-sm">
              <li>
                In most straightforward cases, you should receive your funds{" "}
                <span className="font-semibold">within 2–5 working days</span>{" "}
                of DVLA confirming the transfer.
              </li>
              <li>
                As a clear upper limit, we advise that{" "}
                <span className="font-semibold">
                  the entire process from buyer&apos;s payment to seller payout
                  can take up to 6 weeks
                </span>
                , depending on DVLA processing times and how quickly documents
                are provided.
              </li>
              <li>
                If DVLA or our fraud checks flag anything unusual, we will
                contact you and keep you updated rather than leaving you in the
                dark.
              </li>
            </ul>
          </div>
        </section>

        {/* SECTION: Summary */}
        <section id="summary" className="space-y-3 border-t border-gray-700 pt-6">
          <h2 className="text-2xl font-semibold text-[#FFD500]">In summary</h2>
          <p className="text-gray-200 text-sm md:text-base">
            AuctionMyPlate manages the DVLA process end-to-end: certificates,
            grantee / nominee details, and assignment to the buyer&apos;s
            vehicle. Buyers should wait for our confirmation before fitting
            plates, and sellers are paid once the transfer is complete, with
            realistic maximum timescales explained up-front.
          </p>
        </section>
      </div>
    </main>
  );
}
