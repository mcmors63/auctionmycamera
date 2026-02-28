// app/faq/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

// ✅ Keep meta description in the safe 120–155 character range and reuse everywhere.
const FAQ_DESCRIPTION =
  "FAQs for AuctionMyCamera: how weekly auctions work, bidding rules, saved-card payments, delivery or collection, disputes, safety checks and account rules.";

export const metadata: Metadata = {
  title: "FAQ | AuctionMyCamera",
  description: FAQ_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/faq`,
    title: "FAQ | AuctionMyCamera",
    description: FAQ_DESCRIPTION,
    siteName: "AuctionMyCamera",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | AuctionMyCamera",
    description: FAQ_DESCRIPTION,
  },
};

type FaqItem = {
  id: string;
  category: string;
  q: string;
  a: string;
};

const FAQS: FaqItem[] = [
  // AUCTIONS & BIDDING
  {
    id: "what-is",
    category: "Auctions & bidding",
    q: "What is AuctionMyCamera?",
    a: "AuctionMyCamera is a UK marketplace built specifically for cameras, lenses and photography gear. Sellers list items into timed auctions, buyers bid, and the platform provides the transaction flow, payment handling, and post-sale steps.",
  },
  {
    id: "auction-format",
    category: "Auctions & bidding",
    q: "How do auctions work?",
    a: "Listings run in timed auctions. While an auction is live, you can place bids. In some cases, soft-close may apply (bids near the end can extend the auction slightly) to reduce last-second sniping. Scheduling and mechanics can evolve over time, but the listing page shows the current live timing rules.",
  },
  {
    id: "are-bids-binding",
    category: "Auctions & bidding",
    q: "Are bids binding?",
    a: "Yes. If you place a bid and win, you’re committing to buy at the winning price plus any clearly shown charges (for example delivery charges if the listing includes them). Don’t bid unless you’re ready to complete the purchase.",
  },
  {
    id: "reserves",
    category: "Auctions & bidding",
    q: "Do listings have reserve prices?",
    a: "Some auctions may use a seller reserve (a minimum acceptable price). If a reserve applies, it may not be shown publicly. If the reserve is not met, the seller may not be required to complete the sale. The listing flow and/or seller dashboard determines how reserves are used on the platform at that time.",
  },
  {
    id: "outbid",
    category: "Auctions & bidding",
    q: "What happens if I get outbid?",
    a: "If someone outbids you, you can bid again while the auction is live. Auctions are competitive by design — bid only what you’re comfortable paying.",
  },
  {
    id: "sniping",
    category: "Auctions & bidding",
    q: "Do you prevent last-second sniping?",
    a: "Where enabled, soft-close means bids placed near the end can extend the end time slightly. This gives genuine bidders a fair chance to respond instead of losing to last-second clicks.",
  },
  {
    id: "buy-now",
    category: "Auctions & bidding",
    q: "Is there a Buy Now option?",
    a: "Some marketplaces include Buy Now on certain listings. If Buy Now exists on a listing, it will be shown clearly. If it’s not shown, assume it’s a standard timed auction.",
  },

  // PAYMENTS
  {
    id: "payments",
    category: "Payments",
    q: "How do payments work? Do you store card details?",
    a: "Card payments are processed securely by a payment provider (for example Stripe). AuctionMyCamera does not store full card numbers or CVV on our servers. Depending on the flow, you may pay via checkout and/or via an authorised saved payment method (where enabled).",
  },
  {
    id: "payment-fails",
    category: "Payments",
    q: "What if my payment fails or is declined?",
    a: "If payment fails, the platform may cancel the win, require you to retry payment, and/or restrict your account if it happens repeatedly. Don’t bid unless you’re confident you can pay promptly.",
  },
  {
    id: "chargebacks",
    category: "Payments",
    q: "What about chargebacks and payment disputes?",
    a: "Unjustified chargebacks harm sellers and the marketplace. If a payment is reversed or charged back, we may restrict the account and may cancel the transaction. If there’s a genuine issue (non-delivery, material misdescription), use the platform dispute route rather than a bank dispute first.",
  },

  // SELLER PAYOUT / HELD FUNDS
  {
    id: "when-seller-paid",
    category: "Delivery, receipt & payout",
    q: "When does the seller get paid?",
    a: "Not instantly. The platform flow is designed to protect both sides. Seller payout is normally released after the buyer confirms receipt in the platform, or after the relevant timeouts/evidence rules described in the full Terms.",
  },
  {
    id: "buyer-confirmation",
    category: "Delivery, receipt & payout",
    q: "Why do buyers confirm receipt?",
    a: "Because it prevents the classic marketplace nightmare: buyer pays, seller ships, and then everyone argues. Receipt confirmation (plus tracking/timeouts) creates a clear, fair point where the deal is considered complete and funds can be released.",
  },

  // DELIVERY / COLLECTION
  {
    id: "dispatch-window",
    category: "Delivery, receipt & payout",
    q: "How fast does the seller have to dispatch?",
    a: "Unless the listing states otherwise, sellers should dispatch within 3 working days after successful payment. Sellers should package items properly, use a delivery method suitable for value, and provide tracking/proof where available.",
  },
  {
    id: "delivery-costs",
    category: "Delivery, receipt & payout",
    q: "Who pays delivery/postage?",
    a: "It depends on the listing. Delivery charges (if any) should be shown clearly on the listing. If collection is offered, the listing should explain how collection works. Always check the listing terms before bidding.",
  },
  {
    id: "collection-safety",
    category: "Delivery, receipt & payout",
    q: "Is collection allowed and is it safe?",
    a: "Some listings may allow collection. If you collect, use common sense: meet in a safe place, keep communication within the platform where possible, and don’t hand over cash outside the platform if the listing requires platform payment. If anything feels off, walk away and report it.",
  },

  // CONDITION / AUTHENTICITY
  {
    id: "condition-accuracy",
    category: "Condition & authenticity",
    q: "Do you verify condition, shutter count, or authenticity?",
    a: "Sellers must describe items accurately (condition, faults, included accessories, compatibility, and where relevant shutter count). We may request additional info if a listing looks suspicious. However, buyers should still read listings carefully and ask questions before bidding — especially for high-value items.",
  },
  {
    id: "photos",
    category: "Condition & authenticity",
    q: "Do sellers have to use real photos?",
    a: "Yes. Photos should be of the actual item being sold, not stock images. Clear photos reduce disputes and build trust.",
  },
  {
    id: "serial-numbers",
    category: "Condition & authenticity",
    q: "Should serial numbers be included?",
    a: "Where relevant, sellers should be prepared to provide serial numbers (or provide them on request) and must not unlawfully remove or alter them. Buyers should be cautious of listings where key identifiers are missing without explanation.",
  },

  // DISPUTES
  {
    id: "disputes",
    category: "Disputes & problems",
    q: "What if the item doesn’t arrive, arrives damaged, or isn’t as described?",
    a: "Raise an issue promptly through the platform. We may request evidence from both parties (tracking, photos, messages). Funds may be held while it’s reviewed. Outcomes can include refund, partial refund, or release of funds depending on evidence and what the Terms allow.",
  },
  {
    id: "damage-in-transit",
    category: "Disputes & problems",
    q: "What about courier damage in transit?",
    a: "Sellers should package items properly and use an appropriate delivery service. If something arrives damaged, document it immediately with photos/video and raise it through the platform. We may ask for packaging photos and delivery evidence to assess what happened.",
  },
  {
    id: "misdescription",
    category: "Disputes & problems",
    q: "What counts as ‘materially not as described’?",
    a: "Think: major faults not disclosed, wrong model, missing key components that change the value/functionality, or condition stated as ‘mint’ when it’s clearly not. Minor cosmetic wear that was visible in photos is different. If you’re unsure, ask before you bid.",
  },
  {
    id: "returns",
    category: "Disputes & problems",
    q: "Do I have a right to return an item?",
    a: "This depends on the listing and seller type (private vs business) and applicable consumer law. The platform dispute process exists to handle genuine non-delivery and material misdescription issues. See the full Terms for how the platform handles disputes and outcomes.",
  },

  // FEES / RULES / ACCOUNTS
  {
    id: "fees",
    category: "Accounts, fees & rules",
    q: "What fees apply?",
    a: "Listing fees may apply (or may be free during promotional periods). A commission may be deducted from the seller’s proceeds on successful sales. Any applicable charges should be shown clearly in the seller flow and/or on the listing. For specifics, see the Fees page.",
  },
  {
    id: "tax",
    category: "Accounts, fees & rules",
    q: "Do I have to pay tax on what I sell?",
    a: "Users are responsible for their own tax obligations. If you’re selling regularly, treat it seriously and get proper advice. Platform fees may be subject to VAT where applicable and shown where required.",
  },
  {
    id: "account-restrictions",
    category: "Accounts, fees & rules",
    q: "Can my account be restricted?",
    a: "Yes. Accounts may be restricted for fraud/suspicion, repeated non-payment, repeated failure to dispatch, harassment/abuse, prohibited items, manipulation (shill bidding/collusion), or unjustified payment disputes.",
  },
  {
    id: "prohibited-items",
    category: "Accounts, fees & rules",
    q: "What items are not allowed?",
    a: "Counterfeit/replica items, stolen goods, illegal items, recalled/unsafe goods, and anything unlawful or prohibited. If we suspect prohibited goods, we may remove the listing and restrict the account.",
  },
  {
    id: "safety-tip",
    category: "Accounts, fees & rules",
    q: "What’s the #1 way to avoid problems as a buyer?",
    a: "Don’t guess. Read the description, scrutinise the photos, and ask questions before bidding. If the seller dodges basic questions or the listing looks too good to be true, move on.",
  },

  // WHERE TO READ FULL RULES
  {
    id: "full-rules",
    category: "More help",
    q: "Where can I read the full rules in one place?",
    a: "Start with Terms & Conditions (the full legal version). Then read How it Works and Fees for plain-English guidance. If anything in a summary conflicts with the full Terms, the full Terms take priority.",
  },
  {
    id: "contact",
    category: "More help",
    q: "How do I contact you?",
    a: "Use the Contact page for support questions. If your question is about a specific listing, include the listing ID and what you need clarified so we can help faster.",
  },
];

const CATEGORY_ORDER = [
  "Auctions & bidding",
  "Payments",
  "Delivery, receipt & payout",
  "Condition & authenticity",
  "Disputes & problems",
  "Accounts, fees & rules",
  "More help",
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const categories = CATEGORY_ORDER.filter((c) => FAQS.some((f) => f.category === c));

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card shadow-sm p-6 md:p-8 space-y-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold">
            Frequently Asked <span className="text-gold">Questions</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Longer, clearer answers — because “trust me bro” isn’t a policy.
          </p>
        </header>

        {/* Jump links */}
        <nav className="rounded-2xl border border-border bg-background p-5">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">Jump to</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {categories.map((c) => (
              <a
                key={c}
                href={`#${slugify(c)}`}
                className="underline text-primary hover:opacity-80"
              >
                {c}
              </a>
            ))}
          </div>
        </nav>

        {/* FAQ groups */}
        {categories.map((cat) => (
          <section key={cat} id={slugify(cat)} className="space-y-3 scroll-mt-24">
            <h2 className="text-xl md:text-2xl font-bold">{cat}</h2>

            <div className="space-y-3">
              {FAQS.filter((f) => f.category === cat).map((f) => (
                <details key={f.id} id={f.id} className="rounded-2xl border border-border bg-background p-5">
                  <summary className="cursor-pointer select-none font-semibold">{f.q}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-2xl border border-border bg-background p-5 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-semibold">Brand note:</span> AuctionMyCamera is an independent
            marketplace and is not affiliated with or endorsed by any camera manufacturer. Brand names are used only to
            describe items listed by sellers.
          </p>
        </div>

        <div className="border-t border-border pt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href="/how-it-works" className="underline text-primary hover:opacity-80">
            How it works
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/fees" className="underline text-primary hover:opacity-80">
            Fees
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/terms" className="underline text-primary hover:opacity-80">
            Terms
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/contact" className="underline text-primary hover:opacity-80">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}