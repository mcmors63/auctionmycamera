// app/current-listings/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import CurrentListingsClient from "./CurrentListingsClient";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const revalidate = 300; // 5 minutes

const PROD_SITE_URL = "https://auctionmycamera.co.uk";

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

  if (isProd) return PROD_SITE_URL;
  if (explicit) return explicit;

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
  );
  if (onVercel && vercelUrl) return vercelUrl;

  return "http://localhost:3000";
}

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Current Camera Gear Auctions | AuctionMyCamera",
  description:
    "Browse live camera, lens and photography gear auctions and upcoming queued listings. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
  alternates: { canonical: `${SITE_URL}/current-listings` },
  openGraph: {
    title: "Current Camera Gear Auctions | AuctionMyCamera",
    description:
      "Browse live camera, lens and photography gear auctions and upcoming queued listings. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
    url: `${SITE_URL}/current-listings`,
    siteName: "AuctionMyCamera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Current Camera Gear Auctions | AuctionMyCamera",
    description:
      "Browse live camera, lens and photography gear auctions and upcoming queued listings. Secure Stripe payments, weekly schedule, and optional free auto-relist until sold.",
  },
  robots: { index: true, follow: true },
};

// Appwrite (server/admin)
const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const endpoint = endpointRaw.replace(/\/+$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// ✅ LISTINGS ONLY — no plates fallback (prevents silent “wrong DB” bugs)
const DB_ID = (process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "").trim();

const COLLECTION_ID = (process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "").trim();

function assertEnv() {
  if (!DB_ID || !COLLECTION_ID) {
    throw new Error(
      `Listings env not set. Set APPWRITE_LISTINGS_DATABASE_ID and APPWRITE_LISTINGS_COLLECTION_ID (server), ` +
        `or NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID / NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID.\n` +
        `Got DB_ID="${DB_ID || "(missing)"}" COLLECTION_ID="${COLLECTION_ID || "(missing)"}"`
    );
  }
}

function serverDb() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function fetchByStatus(status: string) {
  assertEnv();
  const db = serverDb();
  const res = await db.listDocuments(DB_ID, COLLECTION_ID, [
    Query.equal("status", status),
    Query.orderDesc("$updatedAt"),
    Query.limit(200),
  ]);
  return res.documents as any[];
}

function listingHref(doc: any) {
  return `/listing/${doc?.$id}`;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getListingTitle(doc: any) {
  const itemTitle = String(doc?.item_title || doc?.title || "").trim();
  const brand = String(doc?.brand || "").trim();
  const model = String(doc?.model || "").trim();

  if (itemTitle) return itemTitle;

  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const gearType = String(doc?.gear_type || doc?.type || "").trim();
  if (gearType) return `${capitalize(gearType)} listing`;

  return "Camera gear listing";
}

function getListingLabel(doc: any) {
  const gearType = String(doc?.gear_type || "").trim();
  const era = String(doc?.era || "").trim();
  const bits = [gearType && capitalize(gearType), era && capitalize(era)].filter(Boolean);
  return bits.length ? bits.join(" • ") : "";
}

export default async function CurrentListingsPage() {
  let live: any[] = [];
  let soon: any[] = [];

  try {
    [live, soon] = await Promise.all([fetchByStatus("live"), fetchByStatus("queued")]);
  } catch (err) {
    console.error("Failed to load current listings (server):", err);
    live = [];
    soon = [];
  }

  const liveForLd = live.slice(0, 50);

  const jsonLdItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: liveForLd.length,
    itemListElement: liveForLd.map((doc, idx) => {
      const name = `${getListingTitle(doc)} – Camera Gear Auction`;
      const url = `${SITE_URL}${listingHref(doc)}`;
      return { "@type": "ListItem", position: idx + 1, url, name };
    }),
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Current auctions", item: `${SITE_URL}/current-listings` },
    ],
  };

  return (
    <>
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

      <section className="bg-black text-gray-100 px-4 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-400">Useful:</span>
            <Link href="/sell" className="text-amber-200 hover:text-amber-100 underline">
              Sell your gear
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
                      const title = getListingTitle(doc);
                      const label = getListingLabel(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="text-gray-100 hover:text-amber-200 underline">
                            {title}
                          </Link>
                          {label ? <span className="text-xs text-gray-400">{"  "}({label})</span> : null}
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
                      const title = getListingTitle(doc);
                      const label = getListingLabel(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="text-gray-100 hover:text-amber-200 underline">
                            {title}
                          </Link>
                          {label ? <span className="text-xs text-gray-400">{"  "}({label})</span> : null}
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

      <CurrentListingsClient initialLive={live} initialSoon={soon} />
    </>
  );
}