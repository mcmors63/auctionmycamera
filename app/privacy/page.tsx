// app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Privacy Policy | AuctionMyCamera",
  description:
    "How AuctionMyCamera.co.uk collects, uses and protects your personal data when you register, list photographic equipment, place bids, and complete transactions (including held payments and delivery confirmations).",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy | AuctionMyCamera",
    description:
      "How AuctionMyCamera.co.uk collects, uses and protects your personal data when you register, list items, bid, and complete transactions.",
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card shadow-sm p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
          Privacy Policy
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Effective Date: <strong className="text-foreground">February 2026</strong>
        </p>

        <p className="text-sm text-muted-foreground mb-4">
          This Privacy Policy explains how{" "}
          <span className="font-semibold text-foreground">AuctionMyCamera.co.uk</span> (
          &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, stores and
          protects your personal data when you use our website, register for an
          account, list photographic equipment, place bids, and complete
          transactions.
        </p>

        <p className="text-sm text-muted-foreground mb-6">
          This Policy should be read together with our{" "}
          <Link href="/cookie-policy" className="underline font-semibold text-primary hover:opacity-80">
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline font-semibold text-primary hover:opacity-80">
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          {/* 1. Who we are */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              1. Who We Are &amp; Contact Details
            </h2>
            <p>
              AuctionMyCamera.co.uk is an online marketplace that allows users
              to list and bid on photographic equipment and related accessories.
              We are an independent marketplace and are not affiliated with,
              authorised by, endorsed by, or associated with any camera
              manufacturer or brand.
            </p>
            <p className="mt-2">
              For the purposes of the UK GDPR and EU GDPR,{" "}
              <strong className="text-foreground">AuctionMyCamera.co.uk</strong> is the{" "}
              <strong className="text-foreground">data controller</strong> for the personal data we collect
              about you via this website.
            </p>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or how your
              data is handled, you can contact us at:
            </p>
            <p className="mt-1">
              <strong className="text-foreground">support@auctionmycamera.co.uk</strong>
            </p>
          </section>

          {/* 2. Data we collect */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              2. Data We Collect
            </h2>
            <p>We may collect and process the following types of data:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Account information:</strong> name, email address,
                password (encrypted), phone number, and postal address.
              </li>
              <li>
                <strong className="text-foreground">Listing information:</strong> item title/category,
                description, condition details, included accessories, images,
                pricing/reserve information (where applicable), and auction
                details such as start/end times.
              </li>
              <li>
                <strong className="text-foreground">Transaction-related information:</strong> winning bids,
                sale amounts, fee/commission breakdowns, refunds, disputes, and
                payout-related data (for sellers).
              </li>
              <li>
                <strong className="text-foreground">Delivery and fulfilment information:</strong> delivery
                address, dispatch proof, tracking numbers (where provided),
                courier details (where provided), delivery/receipt confirmation
                timestamps, and messages related to fulfilment.
              </li>
              <li>
                <strong className="text-foreground">Payments data (limited):</strong>{" "}
                <strong className="text-foreground">
                  we do not store full card numbers or CVV codes on our servers
                </strong>
                . Card payments are processed securely by our payment provider,
                currently <strong className="text-foreground">Stripe</strong>. We may receive limited
                payment method information (e.g. last four digits, brand, expiry
                month/year) and payment status so we can operate the platform,
                prevent fraud, and manage transactions (including holding funds
                until receipt confirmation where the platform flow requires it).
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> pages visited, links clicked, time
                on site, device type, browser type, approximate location (based
                on IP address) and basic analytics/cookie data.
              </li>
              <li>
                <strong className="text-foreground">Communication data:</strong> messages and notifications
                we send to you (e.g. bid updates, sale notifications, delivery
                reminders) and your replies.
              </li>
              <li>
                <strong className="text-foreground">Support and verification data:</strong> information you
                provide when contacting support or where we request information
                to protect users or investigate suspected fraud (for example,
                evidence relating to non-delivery, misdescription, or suspected
                prohibited goods).
              </li>
            </ul>
          </section>

          {/* 3. How we use your data */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              3. How We Use Your Data
            </h2>
            <p>We use your personal data for the following purposes:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>To create and manage your account and login security.</li>
              <li>
                To list items for sale, run auctions, process bids, and manage
                completed sales.
              </li>
              <li>
                To operate transaction flows, including payment collection,
                holding funds (where applicable), delivery/dispatch windows, and
                buyer receipt confirmation.
              </li>
              <li>
                To communicate with you about your account, listings, bids,
                purchases, delivery, disputes and support queries.
              </li>
              <li>
                To calculate fees, handle payments, process refunds, and process
                payouts to sellers where applicable.
              </li>
              <li>
                To prevent fraud, protect the platform, investigate suspicious
                activity, and enforce our Terms &amp; Conditions.
              </li>
              <li>
                To analyse site usage so we can improve performance, layout and
                user experience.
              </li>
              <li>
                To comply with legal and regulatory obligations, including
                record keeping and responding to lawful requests from
                authorities.
              </li>
            </ul>
          </section>

          {/* 4. Legal bases */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              4. Legal Basis for Processing
            </h2>
            <p>
              We process your personal data under one or more of the following
              legal bases under UK / EU GDPR:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Contract:</strong> to provide the services you register
                for (e.g. running auctions, managing your listings, and
                completing transactions).
              </li>
              <li>
                <strong className="text-foreground">Legitimate interests:</strong> to keep the platform
                secure, prevent fraud, improve our services, and send certain
                service-related communications.
              </li>
              <li>
                <strong className="text-foreground">Legal obligation:</strong> to comply with applicable
                laws, regulations or court orders (for example, accounting and
                tax rules).
              </li>
              <li>
                <strong className="text-foreground">Consent:</strong> where required for non-essential
                cookies and analytics. You can manage these via our{" "}
                <Link href="/cookie-policy" className="underline text-primary hover:opacity-80">
                  Cookie Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 5. Payments & Stripe */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              5. Payments &amp; Stripe
            </h2>
            <p>
              We use <strong className="text-foreground">Stripe</strong> to process card payments securely.
              When you add a card or when we take payment for a winning bid, your
              payment details are handled directly by Stripe and are{" "}
              <strong className="text-foreground">not stored in full on our servers</strong>.
            </p>
            <p className="mt-2">
              We receive limited information from Stripe (for example, the last
              four digits of your card, card brand and expiry date, and payment
              status) so we can identify your payment, reduce fraud, operate
              transaction flows, and manage refunds/payouts.
            </p>
            <p className="mt-2">
              Stripe acts as a <strong className="text-foreground">data processor</strong> for us when it
              processes payments on our behalf. Stripe may process data in
              countries outside the UK/EEA. For details on how Stripe handles
              your data, please see{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:opacity-80"
              >
                Stripe&apos;s Privacy Policy
              </a>
              .
            </p>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              6. Cookies &amp; Similar Technologies
            </h2>
            <p>
              We use essential cookies and similar technologies to keep you
              logged in, remember your preferences and keep the site secure. We
              may also use optional analytics cookies to understand how the site
              is used and to improve performance.
            </p>
            <p className="mt-2">
              Where required, we rely on your{" "}
              <strong className="text-foreground">consent for non-essential cookies</strong>. You can manage
              your cookie preferences through the cookie banner on the site and
              in your browser settings.
            </p>
            <p className="mt-2">
              For full details of the cookies we use and how to control them,
              please see our{" "}
              <Link href="/cookie-policy" className="underline text-primary hover:opacity-80">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* 7. Who we share with */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              7. Who We Share Your Data With
            </h2>
            <p>
              We do <strong className="text-foreground">not</strong> sell your personal data. We may share
              limited data with:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong className="text-foreground">Service providers / processors:</strong> for example,
                hosting and infrastructure providers, database/backend services,
                email providers, analytics providers (where enabled), and payment
                providers (such as Stripe).
              </li>
              <li>
                <strong className="text-foreground">Professional advisers:</strong> such as accountants,
                lawyers or auditors where necessary.
              </li>
              <li>
                <strong className="text-foreground">Law enforcement or authorities:</strong> where required
                by law or to help prevent fraud, crime or abuse of our
                platform.
              </li>
              <li>
                <strong className="text-foreground">Other users:</strong> where necessary to complete a sale
                or resolve a dispute (for example, sharing delivery details with
                the seller so they can dispatch, or sharing limited transaction
                details between buyer and seller where appropriate).
              </li>
            </ul>
          </section>

          {/* 8. International transfers */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              8. International Data Transfers
            </h2>
            <p>
              Some service providers may process data in countries outside the
              UK and European Economic Area (EEA). Where this happens, we aim to
              ensure appropriate safeguards are in place (such as standard
              contractual clauses or equivalent protections recognised under UK
              GDPR/EU GDPR).
            </p>
          </section>

          {/* 9. Data retention */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              9. How Long We Keep Your Data
            </h2>
            <p>We keep your data for as long as reasonably necessary to:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Maintain your account and transaction records.</li>
              <li>Operate delivery/receipt and dispute resolution flows.</li>
              <li>Resolve disputes, answer queries, and prevent fraud and abuse.</li>
              <li>
                Meet legal, accounting or reporting obligations (for example,
                retaining certain records for a number of years).
              </li>
            </ul>
            <p className="mt-2">
              Where data is no longer required, we will delete it or anonymise
              it so it can no longer be linked back to you.
            </p>
          </section>

          {/* 10. Security */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              10. How We Protect Your Data
            </h2>
            <p>
              We use reasonable technical and organisational measures to protect
              personal data against unauthorised access, loss or misuse. This
              includes secure hosting, access controls and encrypting passwords.
            </p>
            <p className="mt-2">
              No system is 100% secure, but we work to keep your information
              safe and review safeguards regularly.
            </p>
          </section>

          {/* 11. Your rights */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              11. Your Rights
            </h2>
            <p>Under UK GDPR/EU GDPR, you may have the right to:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request corrections to inaccurate or incomplete data.</li>
              <li>
                Request deletion of certain data, subject to legal and
                contractual limits.
              </li>
              <li>Object to or restrict certain processing in some circumstances.</li>
              <li>
                Withdraw consent where processing is based on your consent
                (e.g. non-essential cookies/analytics).
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact{" "}
              <strong className="text-foreground">support@auctionmycamera.co.uk</strong>. We may need to
              verify your identity before responding.
            </p>
            <p className="mt-2">
              You also have the right to lodge a complaint with your local data
              protection authority. In the UK, this is the{" "}
              <strong className="text-foreground">Information Commissioner&apos;s Office (ICO)</strong>.
            </p>
          </section>

          {/* 12. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-foreground">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do,
              we will update the &quot;Effective Date&quot; at the top of the
              page. Your continued use of the site after changes are published
              means you accept the updated policy.
            </p>
          </section>

          {/* Disclaimer */}
          <section>
            <p className="text-xs text-muted-foreground mt-4 italic">
              This Privacy Policy is provided for general information and should
              not be taken as formal legal advice. If you need specific legal
              guidance on GDPR compliance, consult a qualified legal
              professional.
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm">
          <Link href="/" className="underline text-primary hover:opacity-80">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}