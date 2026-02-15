// app/about/page.tsx

import type { Metadata } from "next";
import Image from "next/image";
import AboutContent from "./AboutContent";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "About | AuctionMyCamera",
  description:
    "Learn more about AuctionMyCamera — a premium UK marketplace for cameras, lenses and photography gear, with weekly auctions and secure payments.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "About | AuctionMyCamera",
    description:
      "Learn more about AuctionMyCamera — a premium UK marketplace for cameras, lenses and photography gear, with weekly auctions and secure payments.",
    url: `${SITE_URL}/about`,
    siteName: "AuctionMyCamera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About | AuctionMyCamera",
    description:
      "Learn more about AuctionMyCamera — a premium UK marketplace for cameras, lenses and photography gear, with weekly auctions and secure payments.",
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