// app/contact/page.tsx
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us | AuctionMyPlate",
  description:
    "Get in touch with AuctionMyPlate if you have questions about listings, auctions or transfers.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <ContactForm />
    </main>
  );
}
