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
    "Get in touch with AuctionMyCamera.co.uk if you have questions about listings, auctions, payments or delivery.",
  alternates: { canonical: `${SITE_URL}/contact` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Contact Us | AuctionMyCamera",
    description:
      "Get in touch with AuctionMyCamera.co.uk if you have questions about listings, auctions, payments or delivery.",
    url: `${SITE_URL}/contact`,
    siteName: "AuctionMyCamera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | AuctionMyCamera",
    description:
      "Get in touch with AuctionMyCamera.co.uk if you have questions about listings, auctions, payments or delivery.",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <ContactForm />
    </main>
  );
}
