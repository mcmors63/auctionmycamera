// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";

import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/footer";
import AutoLogout from "@/components/ui/AutoLogout";
import CookieBanner from "@/components/ui/CookieBanner";
import GoogleAdsLoader from "@/components/ui/GoogleAdsLoader";

const PROD_SITE_URL = "https://auctionmyplate.co.uk";

function isProdEnv() {
  // On Vercel Preview, NODE_ENV is still "production" — so ONLY trust VERCEL_ENV when present.
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  // Remove trailing slashes so we control slash behavior consistently.
  return trimmed.replace(/\/+$/, "");
}

function getCanonicalSiteUrl() {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");

  const onVercel = !!process.env.VERCEL_ENV;
  const isProd = isProdEnv();

  // ✅ Hard-lock canonical in real production so Google never sees vercel.app as canonical.
  if (isProd) return PROD_SITE_URL;

  // Non-prod: prefer explicit if set (e.g. local/dev), otherwise use Vercel preview URL.
  if (explicit) return explicit;

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
  );
  if (onVercel && vercelUrl) return vercelUrl;

  return "http://localhost:3000";
}

const SITE_URL = getCanonicalSiteUrl();
const IS_PROD = isProdEnv();

const GOOGLE_VERIFICATION = (process.env.GOOGLE_SITE_VERIFICATION || "").trim();

// Explicit canonical with trailing slash for homepage consistency.
// (Prevents tiny variant signals: https://site vs https://site/)
const CANONICAL_HOME = `${SITE_URL}/`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Auction My Plate",
    template: "%s | Auction My Plate",
  },
  description: "Buy and sell cherished number plates through weekly auctions",

  // ✅ Use an absolute canonical URL with a trailing slash for the homepage.
  // This remains stable even if metadataBase resolution behavior changes.
  alternates: { canonical: CANONICAL_HOME },

  robots: IS_PROD
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },

  openGraph: {
    type: "website",
    url: CANONICAL_HOME,
    siteName: "Auction My Plate",
    title: "Auction My Plate",
    description: "Buy and sell cherished number plates through weekly auctions",
  },

  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="bg-[#FFFFEA] text-black antialiased flex flex-col min-h-screen">
        <Navbar />

        <AutoLogout />

        {/* Loads Google Ads only after cookie consent */}
        <GoogleAdsLoader />

        <main className="flex-grow">
          <Suspense fallback={null}>{children}</Suspense>
        </main>

        <Footer />

        <CookieBanner />

        <Analytics />
      </body>
    </html>
  );
}
