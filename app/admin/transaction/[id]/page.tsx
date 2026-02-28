// app/admin/transaction/[id]/page.tsx
import type { Metadata } from "next";
import AdminTransactionClient from "./AdminTransactionClient";

export const metadata: Metadata = {
  title: "Transaction | Admin | AuctionMyCamera",
  robots: { index: false, follow: false },
};

export default function AdminTransactionPage() {
  return <AdminTransactionClient />;
}