// app/admin-login/page.tsx
import type { Metadata } from "next";
import AdminLoginClient from "./AdminLoginClient";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Admin Login | AuctionMyCamera",
  description: "Restricted admin access for managing listings and transactions.",
  alternates: { canonical: `${SITE_URL}/admin-login` },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page() {
  return <AdminLoginClient />;
}