// app/login-or-register/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Login or Register | AuctionMyCamera",
  description: "Log in or create an account to bid or sell camera gear.",
  alternates: { canonical: `${SITE_URL}/login-or-register` },
  robots: { index: false, follow: true },
};

export default function LoginOrRegisterPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4 text-gray-100">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-lg border border-sky-700/60 p-6 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-sky-300">You need an account</h1>

        <p className="text-sm text-gray-300">
          To <strong>bid</strong> or <strong>sell camera gear</strong>, you must be logged in to
          your AuctionMyCamera account.
        </p>

        <div className="flex flex-col gap-3 mt-4">
          <Link
            href="/login"
            className="w-full bg-sky-500 hover:bg-sky-600 text-black font-semibold py-2 rounded-md text-sm transition-colors"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="w-full border border-sky-500 text-sky-200 hover:bg-sky-500/10 font-semibold py-2 rounded-md text-sm transition-colors"
          >
            Register
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Once logged in, you can access your <strong>Dashboard</strong>, list items, and place
          bids.
        </p>

        <p className="mt-2 text-[11px] text-gray-500">
          Or{" "}
          <Link href="/" className="text-sky-300 underline hover:text-sky-200">
            return to the homepage
          </Link>
          .
        </p>
      </div>
    </main>
  );
}