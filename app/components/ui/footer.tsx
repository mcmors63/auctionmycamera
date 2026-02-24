// app/components/ui/footer.tsx
"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 bg-slate-950 text-slate-200 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand block */}
          <div className="text-left">
            <div className="text-base font-semibold tracking-tight">
              AuctionMyCamera
              <span className="text-slate-400 font-normal">.co.uk</span>
            </div>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              A premium UK marketplace for cameras, lenses and photography gear —
              weekly auctions, verified users, and a clear post-sale handover.
            </p>

            <p className="mt-4 text-xs text-slate-500">
              © {year} AuctionMyCamera.co.uk. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full md:w-auto">
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Marketplace
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/current-listings"
                    className="underline hover:text-white transition"
                  >
                    Browse auctions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sell"
                    className="underline hover:text-white transition"
                  >
                    Sell your gear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works"
                    className="underline hover:text-white transition"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="underline hover:text-white transition"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Support
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/contact"
                    className="underline hover:text-white transition"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="underline hover:text-white transition"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="underline hover:text-white transition"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Legal
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/terms"
                    className="underline hover:text-white transition"
                  >
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="underline hover:text-white transition"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookie-policy"
                    className="underline hover:text-white transition"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-slate-400">
            Other marketplaces by the same team:{" "}
            <a
              href="https://sealabid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition"
            >
              Sealabid
            </a>
            <span className="text-white/30">{" · "}</span>
            <a
              href="https://auctionmyplate.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition"
            >
              AuctionMyPlate
            </a>
          </p>

          <p className="text-xs text-slate-500">
            AuctionMyCamera is an independent marketplace and is not affiliated with any camera manufacturer or brand.
          </p>
        </div>
      </div>
    </footer>
  );
}