// app/login/page.tsx
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Login | AuctionMyCamera",
  description: "Log in to manage your account, listings, and bids on AuctionMyCamera.",
  alternates: { canonical: `${SITE_URL}/login` },
  // ✅ Keep login out of Google, but don’t block link discovery
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginClient />;
}