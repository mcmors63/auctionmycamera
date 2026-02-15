// app/admin/auctions/page.tsx

import type { Metadata } from "next";
import AdminAuctionsClient from "./AdminAuctionsClient";

export const metadata: Metadata = {
  title: "Auction Week Manager | Admin | AuctionMyCamera",
  robots: { index: false, follow: false },
};

export default function AdminAuctionsPage() {
  return (
    <main className="min-h-screen bg-yellow-50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <AdminAuctionsClient />
      </div>
    </main>
  );
}