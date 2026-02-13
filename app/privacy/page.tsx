// app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | AuctionMyPlate",
  description:
    "How AuctionMyPlate.co.uk collects, uses and protects your personal data when you register, list number plates or place bids.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-md border border-yellow-700 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD500] mb-4">
          Privacy Policy
        </h1>

        <p className="text-sm text-gray-400 mb-6">
          Effective Date: <strong>February 2025</strong>
        </p>

        <p className="text-sm text-gray-200 mb-4">
          This Privacy Policy explains how{" "}
          <span className="font-semibold">AuctionMyPlate.co.uk</span> (
          &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, stores and
          protects your personal data when you use our website, register for an
          account, list a plate, or bid in an auction.
        </p>

        <p className="text-sm text-gray-200 mb-6">
          This Policy should be read together with our{" "}
          <Link
            href="/cookies"
            className="text-[#FFD500] underline font-semibold"
          >
            Cookie Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-[#FFD500] underline font-semibold"
          >
            Terms &amp; Conditions
          </Link>
          .
        </p>

        <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
          {/* 1. Who we are */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              1. Who We Are &amp; Contact Details
            </h2>
            <p>
              AuctionMyPlate.co.uk is an online marketplace that allows users to
              list and bid on personalised registration plates. We are{" "}
              <strong>not affiliated, authorised, endorsed or associated</strong>{" "}
              with the Driver and Vehicle Licensing Agency (DVLA) or any UK
              government organisation.
            </p>
            <p className="mt-2">
              For the purposes of the UK GDPR and EU GDPR,{" "}
              <strong>AuctionMyPlate.co.uk</strong> is the{" "}
              <strong>data controller</strong> for the personal data we collect
              about you via this website.
            </p>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or how your
              data is handled, you can contact us at:
            </p>
            <p className="mt-1">
              <strong>support@auctionmyplate.co.uk</strong>
            </p>
          </section>

          {/* 2. Data we collect */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              2. Data We Collect
            </h2>
            <p>We may collect and process the following types of data:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Account information:</strong> name, email address,
                password (encrypted), phone number, and postal address.
              </li>
              <li>
                <strong>Listing information:</strong> registration marks, plate
                type (vehicle or retention), reserve price, starting price, Buy
                Now price, expiry dates, description, and related auction
                details.
              </li>
              <li>
                <strong>Transaction-related information:</strong> winning bids,
                sale amounts, settlement breakdowns (commission, DVLA fee, etc.)
                and payout-related data.{" "}
                <strong>
                  We do not store full card numbers or CVV codes on our own
                  servers
                </strong>
                ; these are processed securely by our payment provider,
                currently <strong>Stripe</strong>.
              </li>
              <li>
                <strong>Documents you upload:</strong> such as scans/photos of
                DVLA paperwork (e.g. V5C, V750, V778, retention certificates),
                and where necessary, identity or vehicle documents to help
                complete the transfer.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, links clicked, time
                on site, device type, browser type, approximate location (based
                on IP address) and basic analytics/cookie data.
              </li>
              <li>
                <strong>Communication data:</strong> messages and notifications
                we send to you (e.g. bid updates, sale notifications, document
                requests) and your replies.
              </li>
            </ul>
          </section>

          {/* 3. How we use your data */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              3. How We Use Your Data
            </h2>
            <p>We use your personal data for the following purposes:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>To create and manage your account and login security.</li>
              <li>
                To list plates for sale, run auctions, process bids and handle
                Buy Now purchases.
              </li>
              <li>
                To communicate with you about your account, listings, bids,
                purchases, documents and support queries.
              </li>
              <li>
                To calculate fees, handle payments, and process payouts to
                sellers.
              </li>
              <li>
                To prevent fraud, protect the platform, investigate suspicious
                activity and enforce our Terms &amp; Conditions.
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
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              4. Legal Basis for Processing
            </h2>
            <p>
              We process your personal data under one or more of the following
              legal bases under UK / EU GDPR:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Contract:</strong> to provide the services you register
                for (e.g. running auctions, managing your listings, and
                completing transactions).
              </li>
              <li>
                <strong>Legitimate interests:</strong> to keep the platform
                secure, prevent fraud, improve our services, and send certain
                service-related communications.
              </li>
              <li>
                <strong>Legal obligation:</strong> to comply with applicable
                laws, regulations or court orders (for example, accounting and
                tax rules).
              </li>
              <li>
                <strong>Consent:</strong> where required for non-essential
                cookies, analytics and marketing. You can manage these via our{" "}
                <Link
                  href="/cookies"
                  className="text-[#FFD500] underline hover:text-yellow-400"
                >
                  Cookie Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 5. Payments & Stripe */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              5. Payments &amp; Stripe
            </h2>
            <p>
              We use <strong>Stripe</strong> to process card payments securely.
              When you add a card or when we take payment for a winning bid or
              Buy Now purchase, your payment details are handled directly by
              Stripe and are{" "}
              <strong>not stored in full on AuctionMyPlate&apos;s servers</strong>.
            </p>
            <p className="mt-2">
              We receive limited information from Stripe (for example, the last
              four digits of your card, card brand and expiry date, and the
              status of the payment) so we can identify your payment, prevent
              fraud and manage payouts.
            </p>
            <p className="mt-2">
              Stripe acts as a <strong>data processor</strong> for us when it
              processes payments on our behalf. Stripe may process data in
              countries outside the UK/EEA. For details on how Stripe handles
              your data, please see{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFD500] underline"
              >
                Stripe&apos;s Privacy Policy
              </a>
              .
            </p>
          </section>

          {/* 6. Cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              6. Cookies &amp; Similar Technologies
            </h2>
            <p>
              We use essential cookies and similar technologies to keep you
              logged in, remember your preferences and keep the site secure. We
              may also use optional analytics and advertising cookies (for
              example, to understand how the site is used and to measure
              marketing campaigns).
            </p>
            <p className="mt-2">
              Where required, we rely on your{" "}
              <strong>consent for non-essential cookies</strong>. You can manage
              your cookie preferences through the cookie banner on the site and
              in your browser settings.
            </p>
            <p className="mt-2">
              For full details of the cookies we use and how to control them,
              please see our{" "}
              <Link
                href="/cookies"
                className="text-[#FFD500] underline hover:text-yellow-400"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* 7. Who we share with */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              7. Who We Share Your Data With
            </h2>
            <p>
              We do <strong>not</strong> sell your personal data. We may share
              limited data with:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Service providers / processors:</strong> for example,
                hosting and infrastructure providers (such as Vercel), database
                and backend services (such as Appwrite), email providers, and
                payment providers (such as Stripe).
              </li>
              <li>
                <strong>Professional advisers:</strong> such as accountants,
                lawyers or auditors where necessary.
              </li>
              <li>
                <strong>Law enforcement or authorities:</strong> where required
                by law or to help prevent fraud, crime or abuse of our
                platform.
              </li>
              <li>
                <strong>Other users:</strong> where necessary to complete a
                sale or resolve a dispute related to a listing or transaction
                (for example, sharing limited contact or transaction details
                between a buyer and seller where appropriate).
              </li>
            </ul>
          </section>

          {/* 8. International transfers */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              8. International Data Transfers
            </h2>
            <p>
              Some of our service providers (including hosting, email and
              payment processors such as Stripe) may process data in countries
              outside the UK and European Economic Area (EEA).
            </p>
            <p className="mt-2">
              Where this happens, we aim to ensure that appropriate safeguards
              are in place, such as{" "}
              <strong>
                standard contractual clauses or equivalent protections
              </strong>{" "}
              recognised under the UK GDPR/EU GDPR, so that your data remains
              protected.
            </p>
          </section>

          {/* 9. Data retention */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              9. How Long We Keep Your Data
            </h2>
            <p>
              We keep your data for as long as is reasonably necessary to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Maintain your account and transaction records.</li>
              <li>
                Resolve disputes, answer queries, and prevent fraud and abuse.
              </li>
              <li>
                Meet legal, accounting or reporting obligations (for example,
                where certain records must be retained for a number of years).
              </li>
            </ul>
            <p className="mt-2">
              Where data is no longer required, we will delete it or anonymise
              it so that it can no longer be linked back to you.
            </p>
          </section>

          {/* 10. Security */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              10. How We Protect Your Data
            </h2>
            <p>
              We use reasonable technical and organisational measures to protect
              your personal data against unauthorised access, loss or misuse.
              This includes secure hosting, access controls and encrypting
              passwords.
            </p>
            <p className="mt-2">
              No system is 100% secure, but we work to keep your information
              safe and review our safeguards regularly.
            </p>
          </section>

          {/* 11. Your rights */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              11. Your Rights
            </h2>
            <p>
              Under UK GDPR/EU GDPR, you may have the right to:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request corrections to inaccurate or incomplete data.</li>
              <li>
                Request deletion of certain data, subject to legal and
                contractual limits.
              </li>
              <li>
                Object to or restrict certain types of processing in some
                circumstances.
              </li>
              <li>
                Withdraw consent where processing is based on your consent
                (e.g. non-essential cookies or marketing).
              </li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact us at{" "}
              <strong>support@auctionmyplate.co.uk</strong>. We may need to
              verify your identity before responding.
            </p>
            <p className="mt-2">
              You also have the right to lodge a complaint with your local data
              protection authority. In the UK, this is the{" "}
              <strong>Information Commissioner&apos;s Office (ICO)</strong>.
            </p>
          </section>

          {/* 12. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do,
              we will update the &quot;Effective Date&quot; at the top of the
              page. Your continued use of the site after any changes means you
              accept the updated policy.
            </p>
          </section>

          {/* Disclaimer */}
          <section>
            <p className="text-xs text-gray-400 mt-4 italic">
              This Privacy Policy is provided for general information and should
              not be taken as formal legal advice. If you need specific legal
              guidance on GDPR compliance, you should consult a qualified legal
              professional.
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm">
          <Link href="/" className="text-[#FFD500] underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
