// app/about/AboutContent.tsx
"use client";

import {
  StarIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutContent() {
  return (
    <section className="max-w-5xl mx-auto bg-[#111] shadow-2xl rounded-2xl p-10 mt-[-60px] border border-gold/30 relative z-10">
      {/* INTRO */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-lg leading-relaxed text-gray-300 space-y-6 mb-10"
      >
        <p>
          AuctionMyPlate was created for people who care about registrations
          as much as they care about cars. No clutter, no confusion — just a
          clean, premium platform built specifically for buying and selling
          cherished UK number plates.
        </p>

        <p>
          We combine weekly auctions, modern technology and clear processes
          so sellers know exactly what they&apos;re getting and buyers can bid
          with confidence. Verified users, secure bidding and legally
          compliant transfers sit at the heart of everything we do.
        </p>

        <p className="font-semibold text-gold">
          This isn&apos;t a generic marketplace. It&apos;s a dedicated home
          for plate enthusiasts, collectors and serious sellers.
        </p>
      </motion.div>

      {/* ✅ Sister platform note (inside AboutContent so it can’t be hidden) */}
      <div className="mb-16 rounded-xl border border-gold/20 bg-black/40 p-5 text-sm leading-relaxed text-gray-300">
        <p>
          Looking for a marketplace where the final price stays private and
          sellers choose the outcome based on more than just the highest number?
          We also operate{" "}
          <Link
            href="https://sealabid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline hover:text-yellow-200 transition"
          >
            Sealabid
          </Link>
          , a sealed-bid marketplace built for discreet outcomes.
        </p>
      </div>

      {/* HOW IT WORKS */}
      <h2 className="text-3xl font-bold text-gold text-center mb-8">
        How It Works
      </h2>

      <div className="grid md:grid-cols-3 gap-10 mb-20">
        {[
          {
            step: "1",
            title: "List Your Plate",
            desc: "Enter your details, set your reserve and submit. Approval is fast, simple and verified.",
          },
          {
            step: "2",
            title: "Auction Goes Live",
            desc: "Your plate enters a timed auction, creating real competition between genuine bidders.",
          },
          {
            step: "3",
            title: "Secure Handover",
            desc: "Once sold, we guide both parties through a safe, legal DVLA-compliant transfer.",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-black/40 border border-gold/20 rounded-xl p-6 text-center shadow-lg"
          >
            <div className="text-4xl font-extrabold text-gold mb-3">
              {item.step}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-100">
              {item.title}
            </h3>
            <p className="text-gray-400">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* VALUES */}
      <h2 className="text-3xl font-bold text-gold text-center mb-8">
        What We Stand For
      </h2>

      <div className="grid sm:grid-cols-3 gap-10 mb-20">
        {[
          {
            icon: <StarIcon className="w-12 h-12 text-gold mx-auto" />,
            title: "Premium Experience",
            desc: "A modern, focused platform that treats cherished plates like the luxury assets they are.",
          },
          {
            icon: <ShieldCheckIcon className="w-12 h-12 text-gold mx-auto" />,
            title: "Security & Trust",
            desc: "Verified accounts, clear rules and transparent auctions — no games, no hidden tricks.",
          },
          {
            icon: (
              <ArrowTrendingUpIcon className="w-12 h-12 text-gold mx-auto" />
            ),
            title: "Real Value",
            desc: "Sensibly structured bidding designed for fair prices, strong returns and long-term value.",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-black/40 border border-gold/20 rounded-xl p-6 text-center shadow-lg"
          >
            {item.icon}
            <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-100">
              {item.title}
            </h3>
            <p className="text-gray-400 text-sm">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* TIMELINE */}
      <h2 className="text-3xl font-bold text-gold text-center mb-10">
        Our Story
      </h2>

      <div className="space-y-8 mb-20">
        {[
          {
            year: "2023",
            text: "The idea: build a dedicated platform for UK plates that feels premium, fair and easy to use.",
          },
          {
            year: "2024",
            text: "Development: shaping weekly auctions, seller tools and a smooth DVLA transfer journey.",
          },
          {
            year: "2025",
            text: "Launch: AuctionMyPlate opens to sellers and buyers across the UK.",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-6"
          >
            <div className="text-3xl font-bold text-gold w-24">
              {item.year}
            </div>
            <p className="text-gray-400 flex-1">{item.text}</p>
          </motion.div>
        ))}
      </div>

      {/* TESTIMONIALS */}
      <h2 className="text-3xl font-bold text-gold text-center mb-10">
        What People Say
      </h2>

      <div className="grid md:grid-cols-2 gap-10 mb-20">
        {[
          {
            text: "Listed my plate once, sold in the first auction. Straightforward, clear and fully managed.",
            name: "James T – Private Seller",
          },
          {
            text: "Exactly what the plate market needed — structured auctions instead of confusing classified ads.",
            name: "Sarah L – Collector",
          },
        ].map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-black/40 border border-gold/20 rounded-xl p-6 shadow-lg"
          >
            <p className="italic text-gray-300 mb-4">“{t.text}”</p>
            <div className="font-semibold text-gold">{t.name}</div>
          </motion.div>
        ))}
      </div>

      {/* FOUNDER MESSAGE */}
      <div className="bg-black/40 border border-gold/30 rounded-xl p-8 shadow-xl mb-10">
        <h2 className="text-3xl font-bold text-gold mb-4">
          A Message from the Founder
        </h2>
        <p className="text-gray-300 mb-4 leading-relaxed">
          “The number plate world is full of potential, but for years it&apos;s
          been dominated by clunky websites, hidden fees and unclear processes.
          AuctionMyPlate was built to fix that — a focused, trustworthy space
          where people can treat registrations like the premium assets they are,
          without the stress and guesswork.”
        </p>
        <p className="font-semibold text-gold">— AuctionMyPlate Team</p>
      </div>

      {/* DVLA DISCLAIMER (ABOUT PAGE VERSION) */}
      <div className="bg-black/60 border border-gold/30 rounded-xl p-5 text-xs text-gray-400">
        <p className="mb-1">
          <strong className="text-gold">Important:</strong> AuctionMyPlate.co.uk
          is an independent marketplace and is not affiliated, associated,
          authorised, endorsed by, or in any way officially connected with the
          Driver and Vehicle Licensing Agency (DVLA) or any other UK government
          organisation.
        </p>
        <p>
          Any references to DVLA processes are provided for general guidance
          only. Always refer to official government sources for the latest legal
          requirements.
        </p>
      </div>
    </section>
  );
}
