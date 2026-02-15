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

/**
 * ✅ PRODUCTION CANONICAL (hard-locked)
 * This prevents Google ever seeing a vercel.app URL as canonical in production.
 */
const PROD_SITE_URL = "https://auctionmycamera.co.uk";

/**
 * Brand/SEO strings
 */
const BRAND_NAME = "Auction My Camera";
const BRAND_TEMPLATE = "%s | Auction My Camera";
const BRAND_DESCRIPTION = "Buy and sell cameras through weekly auctions";

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
    default: BRAND_NAME,
    template: BRAND_TEMPLATE,
  },
  description: BRAND_DESCRIPTION,

  // ✅ Absolute canonical URL with trailing slash for homepage consistency
  alternates: { canonical: CANONICAL_HOME },

  robots: IS_PROD
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },

  openGraph: {
    type: "website",
    url: CANONICAL_HOME,
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
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