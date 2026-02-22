import type { Metadata } from "next";
import AdminLoginClient from "./AdminLoginClient";

export const metadata: Metadata = {
  title: "Admin Login | AuctionMyCamera",
  description: "Restricted admin access for managing listings and transactions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <AdminLoginClient />;
}