// app/contact/page.tsx
import type { Metadata } from "next";
import ContactForm from "./ContactForm";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// ✅ Keep meta description in the safe 120–155 character range.
const CONTACT_DESCRIPTION =
  "Contact AuctionMyCamera for help with listings, weekly auctions, bidding, payments, delivery or collection. We’ll get back to you as soon as possible.";

export const metadata: Metadata = {
  title: "Contact Us | AuctionMyCamera",
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "Contact Us | AuctionMyCamera",
    description: CONTACT_DESCRIPTION,
    url: `${SITE_URL}/contact`,
    siteName: "AuctionMyCamera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | AuctionMyCamera",
    description: CONTACT_DESCRIPTION,
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <ContactForm />
    </main>
  );
}