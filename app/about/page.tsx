// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import AboutContent from "./AboutContent";

function normalizeBaseUrl(input: string) {
  return (input || "").trim().replace(/\/+$/, "");
}

const SITE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk"
);

// ✅ Keep meta description in a safe 120–155 character range, and reuse everywhere.
const ABOUT_DESCRIPTION =
  "Learn about AuctionMyCamera — a premium UK marketplace for cameras, lenses and photography gear, with weekly auctions, secure Stripe payments and clear selling steps.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "About | AuctionMyCamera",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "About | AuctionMyCamera",
    description: ABOUT_DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: "AuctionMyCamera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About | AuctionMyCamera",
    description: ABOUT_DESCRIPTION,
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200">
      {/* HERO WITH IMAGE */}
      <section className="relative h-[380px] w-full overflow-hidden">
        <Image
          src="/hero/antique-cameras.jpg"
          alt="Vintage cameras and photography gear"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 to-black/95" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gold mb-4 tracking-tight">
            About AuctionMyCamera
          </h1>
          <p className="text-xl max-w-2xl text-gray-300">
            A premium UK marketplace for cameras, lenses and photography gear —
            built for clear weekly auctions and confident buyers.
          </p>
        </div>
      </section>

      {/* MAIN CLIENT UI */}
      <AboutContent />

      <div className="h-24" />
    </main>
  );
}