// app/cookies/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | AuctionMyPlate",
  description:
    "How AuctionMyPlate.co.uk uses cookies and similar technologies to keep your account secure, run auctions and improve the website.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/cookies",
  },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-black py-10 px-4 text-gray-100">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-md border border-yellow-700 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD500] mb-4">
          Cookie Policy
        </h1>

        <p className="text-sm text-gray-400 mb-6">
          Effective Date: <strong>February 2025</strong>
        </p>

        <p className="text-sm text-gray-200 mb-4">
          This Cookie Policy explains how{" "}
          <span className="font-semibold">AuctionMyPlate.co.uk</span>{" "}
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar
          technologies when you visit or use our website.
        </p>

        <p className="text-sm text-gray-200 mb-6">
          This Policy should be read alongside our{" "}
          <Link
            href="/privacy"
            className="text-[#FFD500] font-semibold underline"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="text-[#FFD500] font-semibold underline"
          >
            Terms &amp; Conditions
          </Link>
          . It is intended to help you understand what we do in order to comply
          with UK GDPR and the UK Privacy and Electronic Communications
          Regulations (PECR).
        </p>

        <div className="space-y-6 text-sm text-gray-200 leading-relaxed">
          {/* 1. What cookies are */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. They help the site remember your actions and
              preferences (such as login details or region) so you don&apos;t
              have to re-enter them every time you return.
            </p>
            <p className="mt-2">
              We also use similar technologies – for example{" "}
              <strong>local storage</strong> – to keep you logged in and to
              store basic settings (such as your cookie consent choice) while
              you use AuctionMyPlate to browse and bid on number plates.
            </p>
          </section>

          {/* 2. How we use cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              2. How We Use Cookies
            </h2>
            <p>We use cookies and similar technologies for the following:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Essential cookies (strictly necessary):</strong> these
                are required for the site to function. They keep you logged in,
                secure forms, remember basic security/session information and
                enable core features like bidding and checkout. Without these,
                the website will not work correctly.
              </li>
              <li>
                <strong>Preference cookies:</strong> these remember basic
                choices (for example, cookie consent or interface preferences)
                to make repeat visits easier.
              </li>
              <li>
                <strong>Analytics / performance cookies:</strong> these help us
                understand how visitors use the site so we can improve layout,
                performance and content (for example, which pages are most
                popular, or whether a particular feature is working properly).
              </li>
            </ul>
            <p className="mt-2">
              At the moment, we use a small number of cookies and similar
              technologies to run the platform and measure performance – we do
              not use them to build invasive marketing profiles of individual
              users.
            </p>
          </section>

          {/* 3. Types we use */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              3. Types of Cookies We May Use
            </h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Session cookies:</strong> temporary cookies that are
                deleted when you close your browser. These are often used for
                login and security.
              </li>
              <li>
                <strong>Persistent cookies:</strong> remain on your device for a
                set period or until you delete them (for example, remembering
                that you&apos;ve already seen the cookie banner).
              </li>
              <li>
                <strong>First-party cookies:</strong> set by
                AuctionMyPlate.co.uk and used only by our website.
              </li>
              <li>
                <strong>Third-party cookies:</strong> set by external services
                such as analytics, payment providers or future advertising
                partners.
              </li>
            </ul>
          </section>

          {/* 4. Examples */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              4. Examples of Cookies &amp; Similar Technologies
            </h2>
            <p>Examples include (this is not a complete list):</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Cookies or local storage entries that store your login session
                so you don&apos;t have to sign in on every page view.
              </li>
              <li>
                A small local storage value that remembers whether you&apos;ve
                already{" "}
                <strong>accepted the cookie banner on AuctionMyPlate</strong>.
              </li>
              <li>
                Analytics tools that count how many people visit certain pages
                and how long they stay there, so we can identify which parts of
                the site are working well and where we need to improve.
              </li>
              <li>
                Cookies or similar technologies set by{" "}
                <strong>payment providers (such as Stripe)</strong> to help
                prevent fraud and complete secure card payments.
              </li>
            </ul>
          </section>

          {/* 5. Consent & managing cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              5. Consent &amp; Managing Your Cookies
            </h2>
            <p>
              When you first visit AuctionMyPlate, you&apos;ll see a{" "}
              <strong>cookie banner</strong> at the bottom of the page. By
              clicking &quot;Accept&quot; or by continuing to use the site, you
              agree to our use of cookies as described in this Policy, including
              essential cookies and any analytics cookies we use.
            </p>
            <p className="mt-2">
              You can also control cookies through your browser settings. Most
              browsers let you:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Delete existing cookies from your device.</li>
              <li>Block all cookies or certain types of cookies.</li>
              <li>
                Receive a warning before cookies are stored so you can decide
                whether to allow them.
              </li>
            </ul>
            <p className="mt-2">
              Please note that if you block or delete{" "}
              <strong>essential cookies</strong>, some parts of the website may
              not work properly (for example, you may not be able to stay
              logged in, place bids, or complete purchases).
            </p>
            <p className="mt-2">
              If you want to limit analytics and advertising cookies specifically,
              you can also adjust settings provided by the relevant third
              parties (for example, Google or other ad/analytics providers) in
              addition to your browser controls.
            </p>
          </section>

          {/* 6. Third-party cookies & Stripe / analytics */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              6. Third-Party Cookies &amp; Services
            </h2>
            <p>
              We may use third-party services that set their own cookies or
              similar technologies. These include:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Payment providers:</strong> such as{" "}
                <strong>Stripe</strong>, which may use cookies or similar
                technologies to help prevent fraud, remember certain payment-
                related information and support secure transactions.
              </li>
              <li>
                <strong>Analytics providers:</strong> tools that help us
                understand site usage and performance (for example, how many
                visitors we receive and which pages they view).
              </li>
              <li>
                <strong>Future advertising / marketing tools:</strong> if we use
                online advertising platforms (such as Google Ads or similar)
                they may use cookies to measure campaign performance or, where
                permitted, to show relevant ads.
              </li>
            </ul>
            <p className="mt-2">
              These third parties are responsible for their own cookies and will
              process your data in line with their own privacy and cookie
              policies. Where required by law, we aim to ensure appropriate
              safeguards and agreements are in place.
            </p>
          </section>

          {/* 7. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              7. Changes to This Cookie Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in technology, law or how we operate the site. When we do,
              we will update the &quot;Effective Date&quot; at the top of this
              page. If the changes are significant, we may also show a notice on
              the website or via your account.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-[#FFD500]">
              8. Contact Us
            </h2>
            <p>
              If you have questions about this Cookie Policy or how we use
              cookies and similar technologies, you can contact us at{" "}
              <strong>support@auctionmyplate.co.uk</strong>.
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
