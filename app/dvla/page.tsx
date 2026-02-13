// app/dvla/page.tsx
"use client";

import Link from "next/link";

export default function DvlaPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb / Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-[#FFD500] underline hover:text-yellow-300"
          >
            ← Back to home
          </Link>
        </div>

        {/* Page container */}
        <div className="bg-[#111111] rounded-2xl border border-yellow-700 shadow-lg p-6 md:p-8">
          {/* Page title */}
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-[#FFD500]">
            DVLA Rules for Displaying Number Plates
          </h1>

          {/* 🟡 DVLA AFFILIATION DISCLAIMER */}
          <p className="bg-yellow-900/60 border border-yellow-600 text-xs md:text-sm text-yellow-50 p-4 rounded-lg mb-6">
            <strong>Important:</strong> AuctionMyPlate.co.uk is an independent
            marketplace and is not affiliated, associated, authorised, endorsed
            by, or in any way officially connected with the Driver and Vehicle
            Licensing Agency (DVLA) or any other UK government organisation.
            All DVLA-related information on this page is provided for general
            guidance only.
          </p>

          <p className="text-sm text-gray-300 mb-6">
            This page is a summary of the key display rules for vehicle
            registration numbers in the UK. It is your responsibility to ensure
            your plates comply with current DVLA regulations.
          </p>

          {/* Alert */}
          <div className="bg-yellow-950 border border-yellow-700 rounded-lg p-4 mb-8 text-sm text-yellow-50">
            <strong>Important:</strong> This guide is for general information
            only and may not cover every situation. For full and latest
            requirements, always refer to official DVLA guidance.
          </div>

          {/* Section 1 – General rules */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              1. General legal requirements
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              In the UK, vehicle registration plates must comply with specific
              rules set by the DVLA. It is illegal to rearrange, alter or style
              characters to make a registration look like a different number
              or word.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>Plates must be made from reflective material.</li>
              <li>No background patterns are allowed on the main character area.</li>
              <li>
                Front plates must have a white background; rear plates must have
                a yellow background.
              </li>
              <li>
                Characters must be displayed in the correct order – you must not
                alter spacing or layout.
              </li>
              <li>
                The registration must be easily readable at a distance by law
                enforcement and ANPR systems.
              </li>
            </ul>
          </section>

          {/* Section 2 – Character font and size */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              2. Character font, size and spacing
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              All characters on a legal UK number plate must follow the standard
              typeface (commonly known as the &quot;Charles Wright&quot; font)
              and comply with fixed sizes and spacing.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>
                Characters must be 79mm high and 50mm wide (except the number 1
                or letter I).
              </li>
              <li>The stroke (thickness) of each character must be 14mm.</li>
              <li>The space between characters in the same group must be 11mm.</li>
              <li>
                The space between the two groups (e.g. AB12 and CDE) must be
                33mm.
              </li>
              <li>
                The margin at the top, bottom and sides of the plate should be
                at least 11mm.
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-400">
              Note: These measurements apply to standard car plates. Motorcycle
              and some imported vehicles may have slightly different size rules.
            </p>
          </section>

          {/* Section 3 – Flags, identifiers and symbols */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              3. Flags, identifiers and symbols
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              Certain flags and national identifiers are permitted on UK plates,
              but only in specific formats.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>
                Permitted flags include: Union Flag, Cross of St George, Cross
                of St Andrew, Red Dragon of Wales.
              </li>
              <li>
                Permitted identifiers include: GB, UK, ENG, SCO, CYM, or W.
              </li>
              <li>
                Flags and identifiers must appear on the left-hand side, on a
                vertical band.
              </li>
              <li>
                No other logos, emblems, backgrounds or images are allowed in
                the character area.
              </li>
            </ul>
          </section>

          {/* Section 4 – What is NOT allowed */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              4. Illegal spacing and styling
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              Even if your registration number itself is valid, the way it is
              displayed can make the plate illegal.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>You must not change spacing to make names or words.</li>
              <li>You must not use non-standard fonts or stylised characters.</li>
              <li>
                You must not add screws, bolts or stickers to alter the
                appearance of characters.
              </li>
              <li>
                Shadowed, 3D-effect or coloured fonts that reduce legibility
                may be illegal.
              </li>
              <li>
                Background images or patterns behind the characters are not
                allowed.
              </li>
            </ul>
          </section>

          {/* Section 5 – Supplier and mark */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              5. Plate supplier details
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              Legal number plates must include the details of the supplier and
              the relevant British Standard mark.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>The plate should show the name and postcode of the supplier.</li>
              <li>
                The plate must show the correct British Standard (e.g. BS AU
                145e) in a small mark.
              </li>
              <li>
                These marks are usually printed at the bottom centre or bottom
                corner of the plate.
              </li>
            </ul>
          </section>

          {/* Section 6 – Penalties and enforcement */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              6. Penalties for illegal plates
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              Driving with an illegal number plate can lead to enforcement
              action.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>
                You can be fined if your plates are not legal or are difficult
                to read.
              </li>
              <li>
                The registration number can be withdrawn if it is persistently
                displayed incorrectly.
              </li>
              <li>
                Vehicles may fail an MOT test if plates do not meet the
                required standard.
              </li>
            </ul>
          </section>

          {/* Section 7 – Retention and transfers */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
              7. Retention and transfers
            </h2>
            <p className="mb-3 text-sm md:text-base text-gray-200">
              Many cherished registrations are kept on retention documents
              before being assigned to a vehicle.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-200">
              <li>
                V750 – Certificate of Entitlement (for unassigned numbers
                purchased from DVLA).
              </li>
              <li>
                V778 – Retention Document (for numbers taken off a vehicle and
                held on retention).
              </li>
              <li>
                You must follow DVLA procedures when assigning or transferring
                a registration to a vehicle.
              </li>
            </ul>
          </section>

          {/* Closing note */}
          <div className="border-t border-gray-700 pt-4 text-xs text-gray-400">
            <p className="mb-2">
              <strong>Disclaimer:</strong> This summary is provided by
              AuctionMyPlate.co.uk for general guidance only and does not
              replace official DVLA advice. Requirements can change, and you
              should always check the most up-to-date rules on the official
              government website.
            </p>
            <p>
              For full details, please consult the official UK government
              guidance on vehicle registration plates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
