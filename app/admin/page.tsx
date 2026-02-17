// app/admin/page.tsx
import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin | AuctionMyCamera",
  description: "Admin dashboard for managing listings and transactions.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}