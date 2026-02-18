// app/cookies/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

export const metadata: Metadata = {
  title: "Cookie Policy | AuctionMyCamera",
  description:
    "How AuctionMyCamera.co.uk uses cookies and similar technologies to keep your account secure, run auctions, support payments, and improve the website.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${SITE_URL}/cookies`,
  },
  openGraph: {
    title: "Cookie Policy | AuctionMyCamera",
    description:
      "How AuctionMyCamera.co.uk uses cookies and similar technologies to keep your account secure, run auctions, support payments, and improve the website.",
    url: `${SITE_URL}/cookies`,
  },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-10 px-4 text-slate-100">
      <div className="max-w-4xl mx-auto bg-slate-900/40 rounded-2xl shadow-md border border-white/10 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-sky-300 mb-4">
          Cookie Policy
        </h1>

        <p className="text-sm text-slate-400 mb-6">
          Effective Date: <strong>February 2026</strong>
        </p>

        <p className="text-sm text-slate-200 mb-4">
          This Cookie Policy explains how{" "}
          <span className="font-semibold">AuctionMyCamera.co.uk</span> (
          &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar
          technologies when you visit or use our website.
        </p>

        <p className="text-sm text-slate-200 mb-6">
          This Policy should be read alongside our{" "}
          <Link href="/privacy" className="text-sky-300 font-semibold underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-sky-300 font-semibold underline">
            Terms &amp; Conditions
          </Link>
          . It is intended to help you understand what we do in order to comply
          with UK GDPR and the UK Privacy and Electronic Communications
          Regulations (PECR).
        </p>

        <div className="space-y-6 text-sm text-slate-200 leading-relaxed">
          {/* 1. What cookies are */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. They help the site remember your actions and
              preferences (such as login state or basic settings) so you don&apos;t
              have to re-enter them every time you return.
            </p>
            <p className="mt-2">
              We may also use similar technologies (for example{" "}
              <strong>local storage</strong>) to keep you logged in, remember
              basic settings (such as cookie consent choices), and support core
              marketplace features while you use AuctionMyCamera.
            </p>
          </section>

          {/* 2. How we use cookies */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              2. How We Use Cookies
            </h2>
            <p>We use cookies and similar technologies for the following:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Essential cookies (strictly necessary):</strong> required
                for the site to function. These support login/security, secure
                forms, session integrity, and core features such as bidding and
                checkout. Without these, the website will not work correctly.
              </li>
              <li>
                <strong>Preference cookies:</strong> remember basic choices (for
                example, cookie consent or interface preferences) to make repeat
                visits easier.
              </li>
              <li>
                <strong>Analytics / performance cookies:</strong> help us
                understand how visitors use the site so we can improve layout,
                performance and content (for example, which pages are most
                visited, or whether a feature is working properly).
              </li>
            </ul>
            <p className="mt-2">
              We aim to keep cookie use proportionate. We do not use cookies to
              build invasive marketing profiles of individual users.
            </p>
          </section>

          {/* 3. Types we use */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
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
                <strong>First-party cookies:</strong> set by AuctionMyCamera.co.uk
                and used only by our website.
              </li>
              <li>
                <strong>Third-party cookies:</strong> set by external services
                such as analytics providers or payment providers.
              </li>
            </ul>
          </section>

          {/* 4. Examples */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              4. Examples of Cookies &amp; Similar Technologies
            </h2>
            <p>Examples include (this is not a complete list):</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                Cookies or local storage entries that store your login session so
                you don&apos;t have to sign in on every page view.
              </li>
              <li>
                A small local storage value that remembers your cookie consent
                choices (for example, whether you accepted optional analytics).
              </li>
              <li>
                Analytics tools that count how many people visit certain pages
                and how long they stay there, so we can identify what&apos;s working
                and where we need to improve.
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
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              5. Consent &amp; Managing Your Cookies
            </h2>
            <p>
              When you first visit AuctionMyCamera, you&apos;ll see a{" "}
              <strong>cookie banner</strong>. Essential cookies are used because
              they are necessary for the website to function. Where required by
              law, we ask for your consent before setting non-essential cookies
              (such as optional analytics cookies).
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
              not work properly (for example, you may not be able to stay logged
              in, place bids, or complete purchases).
            </p>
          </section>

          {/* 6. Third-party cookies & Stripe / analytics */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              6. Third-Party Cookies &amp; Services
            </h2>
            <p>
              We may use third-party services that set their own cookies or
              similar technologies. These may include:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Payment providers:</strong> such as <strong>Stripe</strong>,
                which may use cookies or similar technologies to help prevent fraud,
                support secure card payments, and complete transactions.
              </li>
              <li>
                <strong>Analytics providers:</strong> tools that help us understand
                site usage and performance (for example, how many visitors we
                receive and which pages they view), where enabled.
              </li>
            </ul>
            <p className="mt-2">
              These third parties are responsible for their own cookies and will
              process your data in line with their own privacy and cookie
              policies. Where required, we aim to ensure appropriate safeguards
              and agreements are in place.
            </p>
          </section>

          {/* 7. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              7. Changes to This Cookie Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in technology, law or how we operate the site. When we do,
              we will update the &quot;Effective Date&quot; at the top of this page.
              If the changes are significant, we may also show a notice on the website.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-2 text-sky-300">
              8. Contact Us
            </h2>
            <p>
              If you have questions about this Cookie Policy or how we use
              cookies and similar technologies, you can contact us at{" "}
              <strong>support@auctionmycamera.co.uk</strong>.
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm">
          <Link href="/" className="text-sky-300 underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
