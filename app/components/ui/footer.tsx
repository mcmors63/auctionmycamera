// app/components/ui/footer.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      {/* ✅ Footer Section */}
      <footer className="relative z-10 bg-black text-yellow-400 py-6 text-center border-t border-yellow-600/40">
        <p className="text-sm">
          © {new Date().getFullYear()} AuctionMyPlate.co.uk. All rights reserved.{" "}
          <button
            onClick={() => setShowTerms(true)}
            className="underline hover:text-yellow-200 transition"
          >
            Terms &amp; Conditions
          </button>
          {" · "}
          <Link
            href="/how-it-works"
            className="underline hover:text-yellow-200 transition"
          >
            How It Works
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="underline hover:text-yellow-200 transition"
          >
            Privacy Policy
          </Link>
          {" · "}
          <Link
            href="/cookies"
            className="underline hover:text-yellow-200 transition"
          >
            Cookie Policy
          </Link>
          {" · "}
          <Link
            href="/contact"
            className="underline hover:text-yellow-200 transition"
          >
            Contact Us
          </Link>
          {" · "}
          <Link href="/blog" className="underline hover:text-yellow-200 transition">
            Blog
          </Link>
        </p>

        {/* ✅ Sister platform link (clean + non-spammy) */}
        <p className="mt-2 text-xs text-yellow-500/80">
          Other marketplace by the same team:{" "}
          <Link
            href="https://sealabid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-yellow-200 transition"
          >
            Sealabid
          </Link>
        </p>
      </footer>

      {/* ✅ Terms & Conditions Modal (synced with /terms content) */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white text-gray-800 w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowTerms(false)}
              className="absolute top-3 right-3 text-black text-xl font-bold hover:text-yellow-600"
              aria-label="Close Terms"
            >
              ✕
            </button>

            {/* Header */}
            <h2 className="text-2xl font-bold mb-2 text-center">
              Terms &amp; Conditions
            </h2>
            <p className="mb-4 text-center text-sm text-gray-600">
              Effective Date: <strong>February 2025</strong>
            </p>

            {/* Key points – aligned with /terms page */}
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                These Terms and Conditions govern your use of{" "}
                <strong>AuctionMyPlate.co.uk</strong>. By registering, listing
                or bidding, you agree to be bound by them.
              </p>

              <p>
                AuctionMyPlate.co.uk is{" "}
                <strong>not affiliated, authorised, endorsed or associated</strong>{" "}
                with the Driver and Vehicle Licensing Agency (DVLA) or any UK
                government organisation.
              </p>

              <ul className="list-disc ml-5 space-y-2">
                <li>
                  You must be at least 18 and able to enter binding contracts.
                </li>
                <li>
                  When listing a plate, you confirm you are the legal owner or
                  have written permission to sell and hold valid DVLA
                  documentation (V5C, V750, V778).
                </li>
                <li>
                  All bids and Buy Now actions are legally binding commitments
                  to purchase if you win.
                </li>
                <li>
                  Reserve prices are hidden. If the final bid is below reserve,
                  the plate does not have to be sold.
                </li>
                <li>
                  <strong>DVLA assignment fee (fixed £80):</strong>{" "}
                  <strong>default</strong> is seller-side (deducted from seller proceeds when a sale completes).{" "}
                  A small number of older <strong>legacy</strong> listings charge this to the buyer — if that applies,
                  it is clearly shown on the listing and at checkout.{" "}
                  (AuctionMyPlate.co.uk has no affiliation with DVLA.)
                </li>
                <li>
                  You are responsible for ensuring the plate is displayed
                  legally and that your vehicle is eligible.
                </li>
              </ul>

              <p>
                We may suspend or remove accounts and listings where we suspect
                fraud, abuse, or breach of these Terms. We are not responsible
                for DVLA delays, postal issues, or disputes between buyers and
                sellers.
              </p>

              <p className="mt-4 text-sm">
                For the full legal Terms &amp; Conditions, including details on
                fees, reserves, auction rules, responsibilities and liability,
                please read the full page below.
              </p>

              <div className="mt-4 text-center">
                <Link
                  href="/terms"
                  target="_blank"
                  className="inline-block px-4 py-2 rounded-md bg-black text-yellow-400 text-sm font-semibold hover:bg-yellow-500 hover:text-black transition"
                >
                  View Full Terms Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
