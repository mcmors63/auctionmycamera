// app/register/page.tsx
import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account | AuctionMyCamera",
  description: "Create an account to bid and sell camera gear in weekly auctions.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}