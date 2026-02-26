// app/payment-method/page.tsx
import type { Metadata } from "next";
import PaymentMethodClient from "./PaymentMethodClient";

export const metadata: Metadata = {
  title: "Payment Method | AuctionMyCamera",
  robots: { index: false, follow: false },
};

export default function PaymentMethodPage() {
  return <PaymentMethodClient />;
}