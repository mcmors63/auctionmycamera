// app/admin/auction-manager/page.tsx

import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auction Manager | Admin | AuctionMyCamera",
  robots: { index: false, follow: false },
};

export default function AdminAuctionManagerPage() {
  // Permanent internal redirect to the real auctions manager
  redirect("/admin/auctions");
}