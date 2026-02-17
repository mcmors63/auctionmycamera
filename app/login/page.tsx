// app/login/page.tsx
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login | AuctionMyCamera",
  description: "Log in to manage your auctions and listings.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginClient />;
}