// app/about/page.tsx

import AboutContent from "./AboutContent";
import Link from "next/link";

export const metadata = {
  title: "About | AuctionMyPlate",
  description: "Learn more about AuctionMyPlate and our mission.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200">
      {/* HERO WITH IMAGE */}
      <section className="relative h-[380px] w-full overflow-hidden">
        <img
          src="https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=2400"
          alt="Luxury car hero"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/95" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gold mb-4 tracking-tight">
            About AuctionMyPlate
          </h1>
          <p className="text-xl max-w-2xl text-gray-300">
            The UK’s premium marketplace for cherished, distinctive and
            investment-grade number plates.
          </p>
        </div>
      </section>

      {/* Sister platform note (contextual, clean) */}
      <section className="mx-auto max-w-5xl px-4 pt-8">
        <div className="rounded-xl border border-yellow-600/30 bg-black/40 p-5 text-sm leading-relaxed text-gray-200">
          <p>
            If you’re selling something where you want{" "}
            <strong>complete price privacy</strong> and a seller-picked outcome,
            we also operate{" "}
            <Link
              href="https://sealabid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-200 transition"
            >
              Sealabid
            </Link>
            , a sealed-bid marketplace focused on discreet outcomes.
          </p>
        </div>
      </section>

      {/* MAIN CLIENT UI */}
      <AboutContent />

      <div className="h-24" />
    </main>
  );
}
