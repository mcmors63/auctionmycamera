// app/fees/page.tsx
import type { Metadata } from "next";

const SITE_URL = "https://auctionmyplate.co.uk";

export const metadata: Metadata = {
  title: "Fees | AuctionMyPlate",
  description:
    "Clear, transparent information on listing, commission and DVLA transfer fees at AuctionMyPlate.",
  alternates: { canonical: `${SITE_URL}/fees` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/fees`,
    title: "Fees | AuctionMyPlate",
    description:
      "Clear, transparent information on listing, commission and DVLA transfer fees at AuctionMyPlate.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fees | AuctionMyPlate",
    description:
      "Clear, transparent information on listing, commission and DVLA transfer fees at AuctionMyPlate.",
  },
};

export default function FeesPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-600/60 p-8 md:p-10">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-[#FFD500] mb-4 text-center tracking-tight">
          Fees &amp; Costs
        </h1>
        <p className="text-lg text-gray-300 text-center mb-6">
          Simple, transparent and seller-friendly. No surprises.
        </p>

        {/* QUICK ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <a
            href="/sell-my-plate"
            className="inline-block bg-[#FFD500] hover:bg-yellow-400 text-black font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Sell a plate
          </a>
          <a
            href="/how-it-works"
            className="inline-block border border-yellow-700 hover:border-yellow-500 text-[#FFD500] hover:text-yellow-300 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            How it works
          </a>
          <a
            href="/dashboard"
            className="inline-block border border-gray-700 hover:border-gray-500 text-gray-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Dashboard
          </a>
        </div>

        {/* FREE LISTING */}
        <div className="bg-emerald-900/40 border border-emerald-500/70 rounded-xl p-6 mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-200 mb-2">
            It’s Completely Free To List Your Number Plate
          </h2>
          <p className="text-gray-100 text-base md:text-lg">
            No listing fees. No upfront charges. You only pay commission if your
            plate actually sells.
          </p>
        </div>

        {/* QUICK SUMMARY */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">In summary</h2>
          <div className="bg-[#1c1c1c] border border-yellow-700/60 rounded-xl p-5 text-sm md:text-base text-gray-100">
            <ul className="list-disc list-inside space-y-1">
              <li>Listing your plate on AuctionMyPlate is free.</li>
              <li>
                If it doesn’t sell, you pay <strong>nothing</strong>.
              </li>
              <li>
                If it sells, we deduct a small percentage commission from the{" "}
                <strong>winning bid</strong>.
              </li>
              <li>
                A <strong>£80.00 DVLA transfer fee</strong> applies to the
                transfer process. By default this is covered by the{" "}
                <strong>seller</strong> and is deducted from the seller payout
                when a sale completes.
              </li>
              <li className="text-gray-300">
                A small number of older <strong>legacy</strong> listings still
                have the DVLA fee paid by the buyer — if that applies, it will
                be clearly shown on the listing and at checkout.
              </li>
            </ul>
          </div>
        </section>

        {/* COMMISSION TABLE */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
            Commission Structure
          </h2>
          <p className="text-gray-300 mb-6 text-sm md:text-base">
            Commission is only charged when a sale is completed. There is{" "}
            <strong>no charge if your plate does not sell.</strong>
          </p>

          <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm md:text-base min-w-[520px]">
                <thead className="bg-[#FFD500] text-black">
                  <tr>
                    <th className="py-3 px-4">Final Sale Price (Winning Bid)</th>
                    <th className="py-3 px-4">Commission Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700">
                    <td className="py-3 px-4">Up to £4,999</td>
                    <td className="py-3 px-4">10%</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-3 px-4">£5,000 – £9,999</td>
                    <td className="py-3 px-4">8%</td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td className="py-3 px-4">£10,000 – £24,999</td>
                    <td className="py-3 px-4">6%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">£25,000+</td>
                    <td className="py-3 px-4">5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs md:text-sm text-gray-400 mb-4 text-center">
            Commission is calculated on the winning bid amount (the hammer
            price) and automatically deducted before your payout is sent.
          </p>
        </section>

        {/* DVLA FEE SECTION */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3 text-[#FFD500]">
            DVLA Transfer Fee (£80.00)
          </h2>
          <div className="bg-[#112233] border border-blue-500/70 rounded-xl p-5 text-sm md:text-base text-gray-100">
            <p className="mb-2">
              The DVLA assignment / transfer process has a{" "}
              <strong>fixed £80.00 fee</strong>.
            </p>

            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Default:</strong> the <strong>seller</strong> covers the
                DVLA fee and it is deducted from the seller payout when the sale
                completes.
              </li>
              <li>
                <strong>Legacy exception:</strong> a small number of older
                listings charge the DVLA fee to the <strong>buyer</strong>. If
                that applies, it will be clearly shown on the listing and at
                checkout.
              </li>
              <li>
                This fee covers the DVLA assignment/transfer required to move
                the registration legally.
              </li>
            </ul>

            <div className="mt-4 rounded-lg border border-blue-500/30 bg-black/25 p-4">
              <p className="text-gray-100">
                Want the official DVLA process?
              </p>
              <a
                href="https://www.gov.uk/personalised-vehicle-registration-numbers/take-private-number-off"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[#FFD500] underline hover:text-yellow-300"
              >
                View the DVLA guide on GOV.UK
              </a>
              <p className="mt-3 text-xs text-gray-400">
                AuctionMyPlate.co.uk is an independent marketplace and is not
                affiliated, associated, authorised, endorsed by, or in any way
                officially connected with the Driver and Vehicle Licensing
                Agency (DVLA) or any other UK government organisation.
              </p>
            </div>
          </div>
        </section>

        {/* EXAMPLES / CALCULATIONS */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-[#FFD500]">Examples</h2>
          <p className="text-gray-300 mb-4 text-sm md:text-base">
            Here&apos;s exactly how it works in practice (default: seller covers
            DVLA £80):
          </p>

          <div className="space-y-4 text-sm md:text-base text-gray-100">
            {/* Example 1 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 1 – £2,000 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£2,000</strong>
                </li>
                <li>
                  Commission band: Up to £4,999 → <strong>10%</strong>
                </li>
                <li>
                  Our commission: 10% of £2,000 = <strong>£200</strong>
                </li>
                <li>
                  DVLA transfer fee (seller): <strong>£80</strong>
                </li>
                <li>
                  Seller payout: £2,000 − £200 − £80 ={" "}
                  <strong>£1,720</strong>
                </li>
                <li>
                  Buyer pays: <strong>£2,000</strong>
                  <span className="text-gray-300"> (DVLA fee is not added)</span>
                </li>
              </ul>
            </div>

            {/* Example 2 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 2 – £7,500 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£7,500</strong>
                </li>
                <li>
                  Commission band: £5,000 – £9,999 → <strong>8%</strong>
                </li>
                <li>
                  Our commission: 8% of £7,500 = <strong>£600</strong>
                </li>
                <li>
                  DVLA transfer fee (seller): <strong>£80</strong>
                </li>
                <li>
                  Seller payout: £7,500 − £600 − £80 ={" "}
                  <strong>£6,820</strong>
                </li>
                <li>
                  Buyer pays: <strong>£7,500</strong>
                  <span className="text-gray-300"> (DVLA fee is not added)</span>
                </li>
              </ul>
            </div>

            {/* Example 3 */}
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-4">
              <h3 className="font-bold mb-2">Example 3 – £20,000 winning bid</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Winning bid: <strong>£20,000</strong>
                </li>
                <li>
                  Commission band: £10,000 – £24,999 → <strong>6%</strong>
                </li>
                <li>
                  Our commission: 6% of £20,000 = <strong>£1,200</strong>
                </li>
                <li>
                  DVLA transfer fee (seller): <strong>£80</strong>
                </li>
                <li>
                  Seller payout: £20,000 − £1,200 − £80 ={" "}
                  <strong>£18,720</strong>
                </li>
                <li>
                  Buyer pays: <strong>£20,000</strong>
                  <span className="text-gray-300"> (DVLA fee is not added)</span>
                </li>
              </ul>
            </div>

            {/* Legacy note */}
            <div className="bg-yellow-900/20 border border-yellow-700/60 rounded-xl p-4 text-sm">
              <p className="font-semibold text-yellow-200 mb-1">
                Legacy listings (buyer pays DVLA fee)
              </p>
              <p className="text-gray-200">
                A small number of older legacy listings still add the DVLA £80
                fee to the buyer at checkout. If a listing is legacy, it will be
                clearly labelled on the listing and during checkout so there’s
                no ambiguity.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 text-[#FFD500]">FAQs</h2>
          <div className="space-y-3">
            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                Do I pay anything if my plate doesn&apos;t sell?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                No. If your plate doesn&apos;t sell (for example, the reserve isn&apos;t met), you pay nothing.
              </p>
            </details>

            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                Is commission based on the reserve price or the final sale price?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                Commission is based on the final winning bid (the hammer price), not your reserve.
              </p>
            </details>

            <details className="rounded-xl border border-gray-800 bg-black/30 p-4">
              <summary className="cursor-pointer text-gray-100 font-semibold text-sm md:text-base">
                Why is the DVLA fee usually deducted from the seller payout?
              </summary>
              <p className="text-gray-200 mt-2 text-sm md:text-base">
                By default we keep the buyer price clean and deduct the DVLA £80 from the seller proceeds when a sale completes.
                If a listing is a legacy exception where the buyer pays the DVLA fee, it will be clearly shown.
              </p>
            </details>
          </div>
        </section>

        {/* FINAL CTA */}
        <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-gray-200 text-sm md:text-base">
            Ready to list? It’s free to start and you only pay if your plate sells.
          </p>
          <a
            href="/sell-my-plate"
            className="inline-block bg-[#FFD500] hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-md text-sm md:text-base"
          >
            Sell your plate
          </a>
        </div>

        {/* FINAL NOTE */}
        <p className="text-xs text-gray-400 mt-6 text-center">
          All figures above are examples. Exact commission and payouts are
          calculated automatically when a plate sells, based on the final
          winning bid.
        </p>
      </div>
    </main>
  );
}
