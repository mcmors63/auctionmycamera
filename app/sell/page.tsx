// app/sell/page.tsx
import type { Metadata } from "next";
import SellClient from "./SellClient";

export const metadata: Metadata = {
  title: "Sell | AuctionMyCamera",
  description: "Create a camera gear auction listing. Login required.",
  robots: { index: false, follow: true },
};

export default function SellPage() {
  return <SellClient />;
}