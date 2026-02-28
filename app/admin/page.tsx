// app/admin/page.tsx
import type { Metadata } from "next";
import AdminClient from "./AdminClient";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Admin | AuctionMyCamera",
  description: "Admin dashboard for managing listings and transactions.",
  alternates: { canonical: `${SITE_URL}/admin` },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminClient />;
}