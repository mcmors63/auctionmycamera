// app/current-listings/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import CurrentListingsClient from "./CurrentListingsClient";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// ✅ Use ISR instead of force-dynamic so Google gets stable HTML
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

  // ✅ Always use the real domain in production (canonical consistency)
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

// ----------------------------------------------------
// Appwrite (server/admin)
// ----------------------------------------------------
const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const endpoint = endpointRaw.replace(/\/+$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// ✅ IMPORTANT: Only use LISTINGS envs (no LISTINGS fallback).
// If these are missing, we'd rather fail loudly than silently query the wrong database.
const DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

function serverDb() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function fetchByStatuses(statuses: string[]) {
  if (!DB_ID || !COLLECTION_ID) {
    throw new Error(
      "Missing Appwrite LISTINGS env vars. Set APPWRITE_LISTINGS_DATABASE_ID + APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents)."
    );
  }

  const clean = (statuses || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (clean.length === 0) return [];

  const db = serverDb();
  const res = await db.listDocuments(DB_ID, COLLECTION_ID, [
    // Appwrite supports passing an array to equal() for OR matching on a single attribute
    Query.equal("status", clean),
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

/** Prefer camera listing fields, with safe fallbacks for legacy docs */
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
  let loadFailed = false;

  try {
    // Be tolerant to common cloned-project status naming
    const LIVE_STATUSES = ["live", "active"];
    const SOON_STATUSES = ["queued", "upcoming"];

    [live, soon] = await Promise.all([
      fetchByStatuses(LIVE_STATUSES),
      fetchByStatuses(SOON_STATUSES),
    ]);
  } catch (err) {
    console.error("Failed to load current listings (server):", err);
    loadFailed = true;
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
      const name = `${getListingTitle(doc)} – Camera Gear Auction`;
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
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Current auctions", item: `${SITE_URL}/current-listings` },
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

      {/* Crawlable block (uses SAME theme tokens as homepage) */}
      <section className="bg-background text-foreground px-4 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">Useful:</span>
            <Link href="/sell" className="text-primary underline hover:opacity-80">
              Sell your gear
            </Link>
            <Link href="/how-it-works" className="text-primary underline hover:opacity-80">
              How it works
            </Link>
            <Link href="/fees" className="text-primary underline hover:opacity-80">
              Fees
            </Link>
            <Link href="/faq" className="text-primary underline hover:opacity-80">
              FAQ
            </Link>
          </div>

          <details className="mt-4 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold">
              Crawlable auction links (Live: {live.length} • Coming next: {soon.length})
            </summary>

            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-bold text-primary mb-2">Live auctions</h2>
                {live.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No live auctions right now.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {live.slice(0, 40).map((doc) => {
                      const title = getListingTitle(doc);
                      const label = getListingLabel(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="underline hover:opacity-80">
                            {title}
                          </Link>
                          {label ? (
                            <span className="text-xs text-muted-foreground">{"  "}({label})</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-primary mb-2">Coming next</h2>
                {soon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing queued right now.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {soon.slice(0, 40).map((doc) => {
                      const title = getListingTitle(doc);
                      const label = getListingLabel(doc);
                      return (
                        <li key={doc?.$id}>
                          <Link href={listingHref(doc)} className="underline hover:opacity-80">
                            {title}
                          </Link>
                          {label ? (
                            <span className="text-xs text-muted-foreground">{"  "}({label})</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Tip: this block helps crawlers discover listings even if scripts are slow. Your full interactive UI is just
              below.
            </p>

            {!DB_ID || !COLLECTION_ID ? (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <p className="font-semibold">Config issue</p>
                <p className="mt-1">
                  Missing Appwrite LISTINGS env vars. Set{" "}
                  <code className="font-mono">APPWRITE_LISTINGS_DATABASE_ID</code> and{" "}
                  <code className="font-mono">APPWRITE_LISTINGS_COLLECTION_ID</code>.
                </p>
              </div>
            ) : null}

            {loadFailed ? (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <p className="font-semibold">Listings temporarily unavailable</p>
                <p className="mt-1">
                  The server couldn’t reach the listings database just now. This usually means Appwrite env keys/scopes,
                  endpoint, or permissions are misconfigured. Check server logs for the exact error.
                </p>
              </div>
            ) : null}
          </details>
        </div>
      </section>

      {/* Interactive client UI */}
      <CurrentListingsClient initialLive={live} initialSoon={soon} />
    </>
  );
}