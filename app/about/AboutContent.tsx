// app/about/AboutContent.tsx
"use client";

import {
  StarIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  TruckIcon,
  ClockIcon,
  BanknotesIcon,
} from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

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
          AuctionMyCamera was created for people who care about photography gear
          as much as they care about the craft. No clutter, no confusion — just
          a clean, premium platform built specifically for buying and selling
          cameras, lenses and kit.
        </p>

        <p>
          We combine weekly auctions, modern technology and clear processes so{" "}
          <strong className="text-gray-100">buyers know what they’re bidding on</strong>{" "}
          and <strong className="text-gray-100">sellers know exactly what happens next</strong>.
          Verified users, secure payments, and straightforward post-sale steps sit at the
          heart of everything we do.
        </p>

        <p className="font-semibold text-gold">
          This isn&apos;t a generic marketplace. It&apos;s a dedicated home for
          photographers, collectors and serious sellers.
        </p>
      </motion.div>

      {/* TRUST STRIP */}
      <div className="mb-10 grid md:grid-cols-3 gap-4">
        {[
          {
            icon: <BanknotesIcon className="w-6 h-6 text-gold" />,
            title: "Safer payments",
            desc: "Funds are collected on a win and handled through a structured post-sale flow.",
          },
          {
            icon: <ClockIcon className="w-6 h-6 text-gold" />,
            title: "Delivery window",
            desc: "Clear dispatch expectations so deals don’t drag on for weeks.",
          },
          {
            icon: <TruckIcon className="w-6 h-6 text-gold" />,
            title: "Tracked handover",
            desc: "Dispatch proof / tracking where available, plus a simple receipt confirmation step.",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex gap-3 items-start bg-black/40 border border-gold/20 rounded-xl p-4"
          >
            <div className="mt-0.5">{item.icon}</div>
            <div>
              <div className="font-semibold text-gray-100">{item.title}</div>
              <div className="text-sm text-gray-400">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PLATFORM FAMILY (Sealabid + AuctionMyPlate) */}
      <div className="mb-16 rounded-xl border border-gold/20 bg-black/40 p-5 text-sm leading-relaxed text-gray-300">
        <p className="mb-2">
          AuctionMyCamera is built by the same team behind:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <a
              href="https://sealabid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline hover:text-yellow-200 transition"
            >
              Sealabid
            </a>{" "}
            — sealed-bid marketplace where the final price stays private and sellers choose
            outcomes based on more than just the highest number.
          </li>
          <li>
            <a
              href="https://auctionmyplate.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline hover:text-yellow-200 transition"
            >
              AuctionMyPlate
            </a>{" "}
            — UK number plate auctions with structured weekly windows and clear seller tooling.
          </li>
        </ul>
      </div>

      {/* HOW IT WORKS */}
      <h2 className="text-3xl font-bold text-gold text-center mb-8">
        How It Works
      </h2>

      <div className="grid md:grid-cols-3 gap-10 mb-20">
        {[
          {
            step: "1",
            title: "List Your Gear",
            desc: "Enter details, upload clear photos, set your reserve (optional) and submit. Approval is fast, simple and verified.",
          },
          {
            step: "2",
            title: "Auction Goes Live",
            desc: "Your item enters a timed weekly auction, creating real competition between genuine bidders.",
          },
          {
            step: "3",
            title: "Secure Handover",
            desc: "When an item sells, payment is collected and handled through the post-sale steps. The seller dispatches within the delivery window, and funds are released once the buyer confirms receipt (or the platform flow completes).",
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
            desc: "A modern, focused platform that treats photography gear like the valuable equipment it is.",
          },
          {
            icon: <ShieldCheckIcon className="w-12 h-12 text-gold mx-auto" />,
            title: "Security & Trust",
            desc: "Verified accounts, clear rules and transparent auctions — no games, no hidden tricks.",
          },
          {
            icon: <ArrowTrendingUpIcon className="w-12 h-12 text-gold mx-auto" />,
            title: "Real Value",
            desc: "Structured bidding designed for fair prices, strong returns and confident buyers.",
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
            year: "2025",
            text: "The idea: build a dedicated platform for camera gear that feels premium, fair and easy to use — without endless messages and time-wasting.",
          },
          {
            year: "2026",
            text: "Development: shaping weekly auctions, seller tools, and a post-sale flow designed around dispatch windows and receipt confirmation.",
          },
          {
            year: "Today",
            text: "Growth: bringing photographers, collectors and enthusiasts into one focused marketplace — built for confidence on both sides.",
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
            text: "Listed my lens once, sold in the first auction. Straightforward, clear and properly managed.",
            name: "James T – Private Seller",
          },
          {
            text: "Exactly what the gear market needed — structured auctions instead of endless messages and time-wasters.",
            name: "Sarah L – Photographer",
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
          “The camera gear world is full of potential, but for years it&apos;s
          been dominated by clunky listings, time-wasters and unclear processes.
          AuctionMyCamera was built to fix that — a focused, trustworthy space
          where people can sell equipment properly, with structure and clarity,
          without the stress and guesswork.”
        </p>
        <p className="font-semibold text-gold">— AuctionMyCamera Team</p>
      </div>

      {/* BRAND / TRADEMARK DISCLAIMER (ABOUT PAGE VERSION) */}
      <div className="bg-black/60 border border-gold/30 rounded-xl p-5 text-xs text-gray-400">
        <p className="mb-1">
          <strong className="text-gold">Important:</strong> AuctionMyCamera is an
          independent marketplace and is not affiliated with, associated with,
          authorised, endorsed by, or in any way officially connected with any
          camera manufacturer or brand.
        </p>
        <p>
          Any brand names are used only to describe items listed by sellers.
          Buyers should check listing descriptions carefully and ask questions
          before bidding.
        </p>
      </div>
    </section>
  );
}
