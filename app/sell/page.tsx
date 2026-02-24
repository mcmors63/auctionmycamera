// app/sell/page.tsx
import type { Metadata } from "next";
import SellClient from "./SellClient";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Sell Camera Gear | AuctionMyCamera",
  description:
    "Create a camera gear auction listing on AuctionMyCamera. Login required to start a sale.",
  alternates: { canonical: `${SITE_URL}/sell` },
  robots: { index: false, follow: false },
};

export default function SellPage() {
  return <SellClient />;
}