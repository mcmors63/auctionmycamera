// app/register/page.tsx
import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create account | AuctionMyCamera",
  description: "Create an account to bid and sell camera gear in weekly auctions.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterClient />;
}