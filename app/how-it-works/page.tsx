import type { Metadata } from "next";

const SITE_URL = "https://auctionmyplate.co.uk";

export const metadata: Metadata = {
  title: "How It Works | AuctionMyPlate",
  description:
    "Learn how AuctionMyPlate.co.uk works for buyers and sellers of UK cherished number plates. Auction rules, fees, DVLA paperwork and what happens after you win.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/how-it-works`,
    title: "How It Works | AuctionMyPlate",
    description:
      "How our weekly number plate auctions work for buyers and sellers — bids, Buy Now, fees, DVLA paperwork and what happens after a plate is sold.",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | AuctionMyPlate",
    description:
      "How our weekly number plate auctions work for buyers and sellers — bids, Buy Now, fees, DVLA paperwork and what happens after a plate is sold.",
  },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-600/70 p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD500] mb-4">
          How AuctionMyPlate Works
        </h1>

        <p className="text-sm md:text-base text-gray-300 mb-6">
          AuctionMyPlate.co.uk is a dedicated UK marketplace for cherished number plates. This page
          explains, in plain English, how auctions work for both buyers and sellers, what fees apply,
          and what happens after a plate is sold.
        </p>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <a
            href="/sell-my-plate"
            className="inline-block bg-[#FFD500] hover:bg-yellow-400 text-black font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Sell a plate
          </a>
          <a
            href="/dashboard"
            className="inline-block border border-yellow-700 hover:border-yellow-500 text-[#FFD500] hover:text-yellow-300 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            Go to dashboard
          </a>
          <a
            href="/fees"
            className="inline-block border border-gray-700 hover:border-gray-500 text-gray-100 font-semibold px-5 py-3 rounded-md text-sm md:text-base text-center"
          >
            View fees
          </a>
        </div>

        {/* On-page navigation */}
        <nav className="mb-10 rounded-xl border border-gray-800 bg-black/30 p-4">
          <p className="text-xs md:text-sm text-gray-300 mb-2 font-semibold">
            Jump to:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm md:text-base">
            <a href="#basics" className="text-[#FFD500] hover:text-yellow-300 underline">
              The basics
            </a>
            <a href="#buying" className="text-[#FFD500] hover:text-yellow-300 underline">
              Buying
            </a>
            <a href="#selling" className="text-[#FFD500] hover:text-yellow-300 underline">
              Selling
            </a>
            <a href="#timing" className="text-[#FFD500] hover:text-yellow-300 underline">
              Timing &amp; soft close
            </a>
            <a href="#fees" className="text-[#FFD500] hover:text-yellow-300 underline">
              Fees
            </a>
            <a href="#after" className="text-[#FFD500] hover:text-yellow-300 underline">
              After you win
            </a>
            <a href="#dvla" className="text-[#FFD500] hover:text-yellow-300 underline">
              DVLA &amp; legal
            </a>
            <a href="#help" className="text-[#FFD500] hover:text-yellow-300 underline">
              Help
            </a>
          </div>
        </nav>

        <section id="basics" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">1. The Basics</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              Plates are listed into weekly online auctions. You can <strong>bid</strong> or, where available,
              use <strong>Buy Now</strong> to purchase immediately.
            </li>
            <li>
              All auctions are for UK registration marks only. Listings must comply with DVLA rules and UK law.
            </li>
            <li>
              We run the online auction process and guide the DVLA assignment paperwork steps, but we are{" "}
              <strong>not affiliated, authorised or endorsed by DVLA</strong>.
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              Want the official DVLA process in black and white?
            </p>
            <a
              href="https://www.gov.uk/personalised-vehicle-registration-numbers/take-private-number-off"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[#FFD500] hover:text-yellow-300 underline text-sm md:text-base"
            >
              View the DVLA guide on GOV.UK
            </a>
            <p className="text-gray-400 text-xs md:text-sm mt-2">
              AuctionMyPlate is not affiliated with the DVLA.
            </p>
          </div>
        </section>

        <section id="buying" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">2. Buying a Plate – Step by Step</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Create an account</strong> and verify your email. You can then browse and bid on live auctions.
            </li>
            <li>
              <strong>Browse listings.</strong> You can see plates that are live or coming soon (weekly auctions).
            </li>
            <li>
              <strong>Place a bid.</strong> When you bid, you are making a <strong>binding offer</strong> to buy if you win.
            </li>
            <li>
              <strong>Watch for outbids.</strong> If someone outbids you, you can bid again until the auction closes.
            </li>
            <li>
              <strong>Buy Now (where available).</strong> If a listing has a Buy Now price, you can use it to end the auction
              and secure the plate (subject to payment and checks).
            </li>
            <li>
              <strong>Pay securely.</strong> Winning bidders pay online via our payment provider. Card details are handled
              securely by the provider and are not stored on our servers.
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              You&apos;ll see any buyer-facing fees clearly at checkout, including if a listing is a legacy exception where
              the DVLA £80 is charged to the buyer.
            </p>
          </div>
        </section>

        <section id="selling" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">3. Selling a Plate – Step by Step</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Register and complete your profile.</strong> We need your contact details so we can verify the seller
              and pay out funds.
            </li>
            <li>
              <strong>List your plate from your dashboard.</strong> Enter the registration, plate type (vehicle or retention),
              reserve price, starting price and any key details.
            </li>
            <li>
              <strong>Admin approval.</strong> Our team reviews each listing for suitability and DVLA compliance. We may ask you
              for extra information before a plate is approved.
            </li>
            <li>
              <strong>Plate goes into the next auction.</strong> Once approved, your plate is queued into a weekly auction
              window and appears in listings when scheduled.
            </li>
            <li>
              <strong>Sale completes.</strong> If the reserve is met (or Buy Now is used), the plate is marked as sold and moves
              into the post-sale transfer stage.
            </li>
            <li>
              <strong>Documents &amp; payout.</strong> You upload any required documents via your dashboard. After checks and a
              successful assignment process, we pay out your proceeds minus any agreed commission.
            </li>
          </ol>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            Selling guide:{" "}
            <a href="/sell-my-plate" className="text-[#FFD500] underline hover:text-yellow-300">
              Sell your plate at auction
            </a>
            .
          </p>
        </section>

        <section id="timing" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">4. Auction Timing &amp; Soft Close</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed mb-2">
            Auctions normally run within a weekly window. Some key rules:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>Soft close:</strong> if a bid is placed in the final minutes of an auction, the end time may be extended
              to reduce last-second “sniping”.
            </li>
            <li>
              <strong>Reserve price:</strong> if the hidden reserve is not met, the seller does not have to accept the highest bid.
            </li>
            <li>
              <strong>Binding bids:</strong> when you bid or use Buy Now, you are committing to complete the purchase if you win.
            </li>
          </ul>
        </section>

        <section id="fees" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">5. Fees &amp; Charges</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              <strong>DVLA Assignment Fee – £80.00:</strong> the DVLA assignment / transfer process has a fixed £80 fee.
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>
                  <strong>Default:</strong> the <strong>seller</strong> covers this fee and it is deducted from the seller&apos;s
                  proceeds when a sale completes.
                </li>
                <li>
                  <strong>Legacy exception:</strong> a small number of older listings charge the DVLA fee to the <strong>buyer</strong>.
                  If applicable, this will be clearly shown on the listing and at checkout.
                </li>
              </ul>
              <span className="block mt-2">
                AuctionMyPlate.co.uk is not affiliated with DVLA; we manage the steps and paperwork associated with the DVLA assignment process.
              </span>
            </li>
            <li>
              <strong>Commission:</strong> a commission fee may be deducted from the seller’s proceeds on successful sales. The rate is shown
              during the listing process or in your seller dashboard.
            </li>
            <li>
              <strong>Listing fees:</strong> during promotional periods, listing may be free. Any future listing fees will be clearly displayed
              before you submit a plate.
            </li>
          </ul>

          <p className="text-xs md:text-sm text-gray-400 mt-3">
            For the full breakdown (and examples), see{" "}
            <a href="/fees" className="text-[#FFD500] underline hover:text-yellow-300">
              Fees
            </a>{" "}
            and our{" "}
            <a href="/terms" className="text-[#FFD500] underline hover:text-yellow-300">
              Terms &amp; Conditions
            </a>
            .
          </p>
        </section>

        <section id="after" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">6. What Happens After You Win?</h2>
          <ol className="list-decimal ml-5 space-y-3 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              You receive confirmation in your dashboard (and usually by email) that you are the winning bidder or Buy Now purchaser.
            </li>
            <li>You complete payment online if this has not already been taken.</li>
            <li>
              Buyer and seller are asked to <strong>upload the required documents</strong> through their dashboards (V5C / V750 / V778, ID where needed).
            </li>
            <li>Our team reviews the documents and works with the parties to complete the DVLA assignment steps.</li>
            <li>Once the transfer is completed, the seller is paid their proceeds and the transaction is marked as complete.</li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <p className="text-gray-200 text-sm md:text-base">
              Important: bids are binding. Don&apos;t bid unless you&apos;re ready to complete the purchase if you win.
            </p>
          </div>
        </section>

        <section id="dvla" className="mb-8">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">7. DVLA &amp; Legal Display</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed mb-2">
            AuctionMyPlate.co.uk is{" "}
            <strong>
              not affiliated, authorised, endorsed or associated with the Driver and Vehicle Licensing Agency (DVLA)
            </strong>{" "}
            or any UK government organisation.
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm md:text-base text-gray-100 leading-relaxed">
            <li>
              It is the vehicle keeper’s responsibility to ensure the plate is displayed legally (correct font, spacing, colouring and placement).
            </li>
            <li>
              We are not responsible for fines, MOT failures or enforcement action arising from illegal spacing or non-compliant plates.
            </li>
          </ul>
        </section>

        <section id="help">
          <h2 className="text-xl font-semibold text-[#FFD500] mb-3">8. Need Help or Have Questions?</h2>
          <p className="text-sm md:text-base text-gray-100 leading-relaxed">
            If you are unsure about any part of the process, or you are a first-time buyer or seller of a cherished plate,
            you can contact us at{" "}
            <a
              href="mailto:support@auctionmyplate.co.uk"
              className="text-[#FFD500] underline hover:text-yellow-300"
            >
              support@auctionmyplate.co.uk
            </a>
            . We are happy to walk you through the steps before you bid or list a plate.
          </p>

          <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-200 text-sm md:text-base">
              Ready to list your plate?
            </p>
            <a
              href="/sell-my-plate"
              className="inline-block bg-[#FFD500] hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-md text-sm md:text-base"
            >
              Sell your plate
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
