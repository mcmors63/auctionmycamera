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

const PROD_SITE_URL = "https://auctionmycamera.co.uk";

const BRAND_NAME = "AuctionMyCamera";
const BRAND_TEMPLATE = "%s | AuctionMyCamera";
const BRAND_DESCRIPTION =
  "Buy and sell cameras, lenses and photography gear through weekly auctions.";

// ✅ Bing verification token (safe to be public)
const BING_VERIFICATION = "3AD4012E062C1636310720768FA73650";

function isProdEnv() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function getCanonicalSiteUrl() {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
  const onVercel = !!process.env.VERCEL_ENV;
  const isProd = isProdEnv();

  if (isProd) return PROD_SITE_URL;
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
const SITE_HOME = `${SITE_URL}/`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND_NAME, template: BRAND_TEMPLATE },
  description: BRAND_DESCRIPTION,

  robots: IS_PROD
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },

  openGraph: {
    type: "website",
    url: SITE_HOME,
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
  },

  // ✅ Search engine verification tags (Google + Bing)
  verification: {
    ...(GOOGLE_VERIFICATION ? { google: GOOGLE_VERIFICATION } : {}),
    other: {
      "msvalidate.01": BING_VERIFICATION,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col">
        <Navbar />

        {/* Still global. If you only want this on /dashboard,/sell,/admin, we’ll move it next. */}
        <AutoLogout />

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