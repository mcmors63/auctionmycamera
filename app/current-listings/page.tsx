import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import CurrentListingsClient from "./CurrentListingsClient";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// ✅ Use ISR instead of force-dynamic so Google gets stable HTML
// Still updates frequently enough for auctions.
export const revalidate = 300; // 5 minutes

const PROD_SITE_URL = "https://auctionmyplate.co.uk";

function isProdEnv() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function getSiteUrl() {
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
  const onVercel = !!process.env.VERCEL_ENV;
  const isProd = isProdEnv();

  // ✅ Always use the real domain in production (canonical consistency)
  if (isProd) return PROD_SITE_URL;

  // Local/dev or preview can use explicit if set
  if (explicit) return explicit;

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
  );
  if (onVercel && vercelUrl) return vercelUrl;

  return "http://localhost:3000";
}

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Current Number Plate Auctions | AuctionMyPlate",
  description:
    "Browse live cherished number plate auctions and upcoming queued plates. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
  alternates: { canonical: `${SITE_URL}/current-listings` },
  openGraph: {
    title: "Current Number Plate Auctions | AuctionMyPlate",
    description:
      "Browse live cherished number plate auctions and upcoming queued plates. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
    url: `${SITE_URL}/current-listings`,
    siteName: "AuctionMyPlate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Current Number Plate Auctions | AuctionMyPlate",
    description:
      "Browse live cherished number plate auctions and upcoming queued plates. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
  },
  robots: { index: true, follow: true },
};

const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const endpoint = endpointRaw.replace(/\/+$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

function serverDb() {
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return new Databases(client);
}

async function fetchByStatus(status: string) {
  const db = serverDb();
  const res = await db.listDocuments(DB_ID, COLLECTION_ID, [
    Query.equal("status", status),
    // ✅ Stable ordering (helps keep page content consistent for crawlers)
    Query.orderDesc("$updatedAt"),
    Query.limit(200),
  ]);
  return res.documents as any[];
}

function pickReg(doc: any) {
  const raw =
    doc?.registration ||
    doc?.reg ||
    doc?.plate ||
    doc?.registrationNumber ||
    doc?.numberPlate ||
    doc?.title ||
    "";
  const s = String(raw || "").toUpperCase().replace(/\s+/g, "");
  return s;
}

function formatRegForDisplay(reg: string) {
  const s = (reg || "").toUpperCase().replace(/\s+/g, "");
  if (!s) return "Unknown plate";
  if (s.length <= 3) return s;
  // Simple DVLA-style split: last 3 as the suffix group (e.g. CC71 CCC)
  return `${s.slice(0, -3)} ${s.slice(-3)}`;
}

function listingHref(doc: any) {
  // Your live site uses /listing/[id]
  return `/listing/${doc?.$id}`;
}

export default async function CurrentListingsPage() {
  let live: any[] = [];
  let soon: any[] = [];

  try {
    // keep them separate for clarity + trust
    [live, soon] = await Promise.all([fetchByStatus("live"), fetchByStatus("queued")]);
  } catch (err) {
    console.error("Failed to load current listings (server):", err);
    live = [];
    soon = [];
  }

  // JSON-LD for crawlable auction links (kept small)
  const liveForLd = live.slice(0, 50);
  const jsonLdItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: liveForLd.length,
    itemListElement: liveForLd.map((doc, idx) => {
      const reg = pickReg(doc);
      const name = reg
        ? `${formatRegForDisplay(reg)} – Private Number Plate Auction`
        : "Private Number Plate Auction";
      const url = `${SITE_URL}${listingHref(doc)}`;
      return {
        "@type": "ListItem",
        position: idx + 1,
        url,
        name,
      };
    }),
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Current Listings",
        item: `${SITE_URL}/current-listings`,
      },
    ],
  };

  return (
    <>
      {/* Structured data for SEO */}
      <Script
        id="ld-current-itemlist"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
      />
      <Script
        id="ld-current-breadcrumbs"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />

      {/* Small, safe server-rendered crawlable block (won’t fight your client UI) */}
      <section className="bg-black text-gray-100 px-4 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-400">Useful:</span>
            <Link href="/sell-my-plate" className="text-amber-200 hover:text-amber-100 underline">
              Sell a plate
            </Link>
            <Link href="/how-it-works" className="text-amber-200 hover:text-amber-100 underline">
              How it works
            </Link>
            <Link href="/fees" className="text-amber-200 hover:text-amber-100 underline">
              Fees
            </Link>
            <Link href="/faq" className="text-amber-200 hover:text-amber-100 underline">
              FAQ
            </Link>
          </div>

          <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <summary className="cursor-pointer font-semibold text-white">
              Crawlable auction links (Live: {live.length} • Coming next: {soon.length})
            </summary>

            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-bold text-amber-200 mb-2">Live auctions</h2>
                {live.length === 0 ? (
                  <p className="text-sm text-gray-300">No live auctions right now.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {live.slice(0, 40).map((doc) => {
                      const reg = pickReg(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="text-gray-100 hover:text-amber-200 underline">
                            {formatRegForDisplay(reg)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-amber-200 mb-2">Coming next</h2>
                {soon.length === 0 ? (
                  <p className="text-sm text-gray-300">Nothing queued right now.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {soon.slice(0, 40).map((doc) => {
                      const reg = pickReg(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="text-gray-100 hover:text-amber-200 underline">
                            {formatRegForDisplay(reg)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              Tip: this block helps crawlers discover listings even if scripts are slow. Your full interactive UI is just
              below.
            </p>
          </details>
        </div>
      </section>

      {/* Your existing interactive client UI */}
      <CurrentListingsClient initialLive={live} initialSoon={soon} />
    </>
  );
}
