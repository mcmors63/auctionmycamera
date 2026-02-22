// app/contact/page.tsx
import type { Metadata } from "next";
import ContactForm from "./ContactForm";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Contact Us | AuctionMyCamera",
  description:
    "Get in touch with AuctionMyCamera if you have questions about listings, auctions, delivery/collection or deals.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <ContactForm />
    </main>
  );
}