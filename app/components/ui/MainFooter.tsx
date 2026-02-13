// app/components/ui/MainFooter.tsx

import Link from "next/link";

export default function MainFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white/80 backdrop-blur mt-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <span>© {year} AuctionMyPlate.co.uk. All rights reserved.</span>

        <div className="flex flex-wrap gap-4">
          <Link href="/terms" className="hover:underline">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/cookies" className="hover:underline">
            Cookie Policy
          </Link>
          <a
            href="mailto:support@auctionmyplate.co.uk"
            className="hover:underline"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
