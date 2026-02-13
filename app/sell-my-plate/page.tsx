// app/sell-my-plate/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell or Auction Your Private Number Plate | AuctionMyPlate UK",
  description:
    "Sell your private number plate by auction in the UK. Set a hidden reserve, reach verified buyers, and get guided DVLA transfer support. No listing fee during launch.",
};

export default function SellMyPlatePage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-lg p-8 border border-yellow-700">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD500] mb-4">
          Sell your private number plate at auction
        </h1>

        <p className="text-gray-200 mb-6 leading-relaxed text-sm md:text-base">
          Want to sell your private number plate but not sure what it&apos;s worth? AuctionMyPlate lets
          you list your reg, set a hidden reserve, and auction it to genuine UK buyers — without paying
          a listing fee during our launch period. Whether your plate is on a vehicle or on a retention
          certificate, we run the auction and guide you through the DVLA transfer so you can sell with
          confidence.
        </p>

        {/* Trust bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-[#FFD500] font-semibold text-sm md:text-base">Verified UK bidders</p>
            <p className="text-gray-200 text-xs md:text-sm mt-1">
              Buyers register and verify details before bidding.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-[#FFD500] font-semibold text-sm md:text-base">Hidden reserve</p>
            <p className="text-gray-200 text-xs md:text-sm mt-1">
              You stay in control — your reserve isn&apos;t shown publicly.
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-[#FFD500] font-semibold text-sm md:text-base">DVLA transfer guidance</p>
            <p className="text-gray-200 text-xs md:text-sm mt-1">
              Clear steps for plates on vehicles or retention.
            </p>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-[#FFD500] mb-2">
            Why auction instead of a fixed price sale?
          </h2>
          <p className="text-gray-200 mb-3 text-sm md:text-base">
            A fixed price listing is guesswork. If you price too low, you lose out. If you price too high,
            nothing happens.
          </p>
          <ul className="list-disc ml-5 space-y-1 text-gray-200 text-sm md:text-base">
            <li>
              <strong>Finds the true market value</strong> — buyers compete, pushing the price up.
            </li>
            <li>
              <strong>Creates urgency</strong> — a clear end time and soft-close window encourage real bidding.
            </li>
            <li>
              <strong>Filters out time-wasters</strong> — bidders must register and verify before they can bid.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-[#FFD500] mb-2">
            What you&apos;ll need to list your plate
          </h2>
          <ul className="list-disc ml-5 space-y-1 text-gray-200 text-sm md:text-base">
            <li>Your registration number (exactly as on your documents)</li>
            <li>
              Whether it&apos;s on a <strong>vehicle</strong> or a{" "}
              <strong>retention certificate</strong>
            </li>
            <li>A realistic reserve price</li>
            <li>
              A short description of why the plate is desirable (wording, age, initials, etc.)
            </li>
          </ul>
          <p className="text-gray-200 mt-3 text-sm md:text-base">
            You can also choose a starting price and optional Buy Now price. We&apos;ll show you the expected
            fees and payout before you confirm.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold text-[#FFD500] mb-2">Fees &amp; your payout</h2>
          <ul className="list-disc ml-5 space-y-1 text-gray-200 text-sm md:text-base">
            <li>
              <strong>Listing fee:</strong> £0 — no charge to list a plate during our launch period.
            </li>
            <li>
              <strong>Commission:</strong> a small percentage only if your plate sells (based on the final sale price).
            </li>
            <li>
              <strong>DVLA fee:</strong> the DVLA assignment fee is <strong>£80</strong>.{" "}
              <strong>Default:</strong> it is covered seller-side and deducted from the seller payout when a sale completes.{" "}
              <strong>Legacy exception:</strong> a small number of older listings charge this to the buyer — if that applies,
              it will be clearly shown on the listing and at checkout.
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              Want the official DVLA steps? See the GOV.UK guide for taking a private number off a vehicle and assigning it.
            </p>
            <a
              href="https://www.gov.uk/personalised-vehicle-registration-numbers/take-private-number-off"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[#FFD500] hover:text-yellow-400 underline text-sm md:text-base"
            >
              View DVLA process on GOV.UK
            </a>
            <p className="text-gray-400 text-xs md:text-sm mt-2">
              Note: AuctionMyPlate is not affiliated with the DVLA.
            </p>
          </div>

          <p className="text-gray-200 mt-4 text-sm md:text-base">
            Before you submit your listing, we show your reserve price, our commission rate and an estimated payout to you
            after fees. If the reserve isn&apos;t met, the plate simply doesn&apos;t sell and you owe nothing.
          </p>

          <p className="text-gray-200 mt-3 text-sm md:text-base">
            Prefer the full breakdown? See our{" "}
            <a href="/fees" className="text-[#FFD500] hover:text-yellow-400 underline">
              Fees page
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-[#FFD500] mb-2">
            How selling your plate with AuctionMyPlate works
          </h2>
          <ol className="list-decimal ml-5 space-y-2 text-gray-200 text-sm md:text-base">
            <li>
              <strong>Create your seller account</strong> — register with your name, address and contact details. We verify email and phone.
            </li>
            <li>
              <strong>Submit your plate</strong> — enter your registration, choose plate type, add details and set your reserve / Buy Now.
            </li>
            <li>
              <strong>Admin review</strong> — we check the listing for obvious issues. If anything is missing we&apos;ll contact you before approving it.
            </li>
            <li>
              <strong>Queued for the next auction</strong> — once approved, your plate is queued for the next weekly auction window. You&apos;ll see the countdown in your dashboard.
            </li>
            <li>
              <strong>Live auction</strong> — buyers place bids and can use Buy Now if enabled.
            </li>
            <li>
              <strong>Sale, transfer, payout</strong> — when the auction ends and the reserve is met, we confirm the sale, oversee the DVLA transfer and pay your proceeds once everything is complete.
            </li>
          </ol>
        </section>

        {/* FAQ (no JS needed) */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-[#FFD500] mb-2">Seller FAQs</h2>

          <div className="space-y-3">
            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                Can I sell a plate that&apos;s on a vehicle?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                Yes. You can list plates that are currently assigned to a vehicle or held on retention. We guide you through
                the DVLA steps once the sale completes.
              </p>
            </details>

            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                What if my reserve isn&apos;t met?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                If bidding doesn&apos;t reach your reserve, your plate simply doesn&apos;t sell — and you owe nothing.
              </p>
            </details>

            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                When do I get paid?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                We pay out once the sale is confirmed and the transfer process is completed. We keep you updated through your dashboard.
              </p>
            </details>

            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                Do I need to guess a starting price?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                No. The most important number is your reserve (the minimum you&apos;ll accept). Starting price and Buy Now are optional —
                we show you the estimated payout before you confirm.
              </p>
            </details>
          </div>
        </section>

        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-gray-200 text-sm md:text-base">
            Ready to get started? It takes just a few minutes to list your plate.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-[#FFD500] hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-md text-sm md:text-base"
          >
            Create your free seller account
          </a>
        </div>
      </div>
    </main>
  );
}
