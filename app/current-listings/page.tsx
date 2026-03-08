// app/current-listings/page.tsx
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import CurrentListingsClient from "./CurrentListingsClient";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// Use ISR so Google gets stable HTML
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

// ----------------------------------------------------
// Appwrite (server/admin)
// ----------------------------------------------------
const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const endpoint = endpointRaw.replace(/\/+$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

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

async function fetchByStatuses(
  statuses: string[],
  preferredOrder?: { field: string; dir: "asc" | "desc" }
) {
  if (!DB_ID || !COLLECTION_ID) {
    throw new Error(
      "Missing Appwrite LISTINGS env vars. Set APPWRITE_LISTINGS_DATABASE_ID + APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC equivalents)."
    );
  }

  const clean = (statuses || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (clean.length === 0) return [];

  const db = serverDb();
  const base = [Query.equal("status", clean), Query.limit(200)];

  if (preferredOrder?.field) {
    try {
      const res = await db.listDocuments(DB_ID, COLLECTION_ID, [
        ...base,
        preferredOrder.dir === "asc"
          ? Query.orderAsc(preferredOrder.field)
          : Query.orderDesc(preferredOrder.field),
      ]);
      return res.documents as any[];
    } catch (err) {
      console.warn(
        `[current-listings] preferred order failed (${preferredOrder.field}); falling back:`,
        err
      );
    }
  }

  const fallback = await db.listDocuments(DB_ID, COLLECTION_ID, [
    ...base,
    Query.orderDesc("$updatedAt"),
  ]);

  return fallback.documents as any[];
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

function parseMaybeDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(value: any) {
  const d = parseMaybeDate(value);
  if (!d) return null;

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
}

function getAuctionStart(doc: any) {
  return doc?.auction_start ?? doc?.start_time ?? doc?.startsAt ?? null;
}

function getAuctionEnd(doc: any) {
  return doc?.auction_end ?? doc?.end_time ?? doc?.endsAt ?? null;
}

function firstLiveEndingText(live: any[]) {
  if (!live.length) return "No live auctions right now";
  const label = formatDateLabel(getAuctionEnd(live[0]));
  return label ? `Earliest closing listing ends ${label} UK time` : "Live auctions are running now";
}

function firstQueuedStartingText(soon: any[]) {
  if (!soon.length) return "No queued listings right now";
  const label = formatDateLabel(getAuctionStart(soon[0]));
  return label ? `Next queued listing starts ${label} UK time` : "Queued listings are lined up for the next window";
}

export default async function CurrentListingsPage() {
  let live: any[] = [];
  let soon: any[] = [];
  let loadFailed = false;

  try {
    const LIVE_STATUSES = ["live", "active"];
    const SOON_STATUSES = ["queued", "upcoming"];

    [live, soon] = await Promise.all([
      fetchByStatuses(LIVE_STATUSES, { field: "auction_end", dir: "asc" }),
      fetchByStatuses(SOON_STATUSES, { field: "auction_start", dir: "asc" }),
    ]);
  } catch (err) {
    console.error("Failed to load current listings (server):", err);
    loadFailed = true;
    live = [];
    soon = [];
  }

  const combinedForLd = [...live, ...soon].slice(0, 50);

  const jsonLdItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: combinedForLd.length,
    itemListElement: combinedForLd.map((doc, idx) => {
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
      {
        "@type": "ListItem",
        position: 2,
        name: "Current auctions",
        item: `${SITE_URL}/current-listings`,
      },
    ],
  };

  const topLive = live.slice(0, 8);
  const topSoon = soon.slice(0, 8);

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

      {/* Server-rendered top section */}
      <section className="relative overflow-hidden border-b border-border bg-background text-foreground">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-36 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-primary/8 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-10">
          <div className="max-w-4xl">
            <p className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              AuctionMyCamera • UK camera & photography gear marketplace
            </p>

            <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight">
              Current camera gear auctions
            </h1>

            <p className="mt-4 max-w-3xl text-sm md:text-base leading-relaxed text-muted-foreground">
              Browse live auctions and queued listings for cameras, lenses, and photography
              gear. See what is active now, what is coming next, and move into a
              clearer post-sale process when an item is won.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login-or-register"
                className="rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition bg-primary text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Create an account to bid
              </Link>

              <Link
                href="/sell"
                className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Sell your gear
              </Link>

              <Link
                href="/how-it-works"
                className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                How it works
              </Link>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SnapshotCard
                title="Live now"
                value={String(live.length)}
                body={firstLiveEndingText(live)}
              />
              <SnapshotCard
                title="Coming next"
                value={String(soon.length)}
                body={firstQueuedStartingText(soon)}
              />
              <SnapshotCard
                title="Auction window"
                value="Mon–Sun"
                body="Weekly schedule: Monday 01:00 to Sunday 23:00, UK time."
              />
              <SnapshotCard
                title="After sale"
                value="Structured"
                body="Secure checkout first, then both sides follow the next steps clearly."
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>Useful:</span>
              <Link href="/sell" className="text-primary underline hover:opacity-80">
                Sell your gear
              </Link>
              <Link href="/fees" className="text-primary underline hover:opacity-80">
                Fees
              </Link>
              <Link href="/faq" className="text-primary underline hover:opacity-80">
                FAQ
              </Link>
            </div>
          </div>

          {/* Featured previews */}
          <div className="mt-10 grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Live now
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Auctions ending soon</h2>
                </div>
                <Link
                  href="#interactive-current-listings"
                  className="text-sm text-primary underline hover:opacity-80"
                >
                  Jump to listings
                </Link>
              </div>

              {topLive.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm">No live auctions right now.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check back soon or browse queued listings below.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  {topLive.map((doc) => {
                    const title = getListingTitle(doc);
                    const label = getListingLabel(doc);
                    const endLabel = formatDateLabel(getAuctionEnd(doc));

                    return (
                      <Link
                        key={doc?.$id}
                        href={listingHref(doc)}
                        className="rounded-2xl border border-border bg-background p-4 transition hover:bg-accent"
                      >
                        <p className="text-base font-extrabold">{title}</p>
                        {label ? (
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-muted-foreground">
                          {endLabel ? `Ends ${endLabel}` : "Live now"}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-primary">
                          View listing
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Coming next
                  </p>
                  <h2 className="mt-1 text-lg font-bold">Queued listings</h2>
                </div>
                <Link
                  href="/sell"
                  className="text-sm text-primary underline hover:opacity-80"
                >
                  Want to list yours?
                </Link>
              </div>

              {topSoon.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm">Nothing queued right now.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sellers can submit items for the next weekly auction window.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  {topSoon.map((doc) => {
                    const title = getListingTitle(doc);
                    const label = getListingLabel(doc);
                    const startLabel = formatDateLabel(getAuctionStart(doc));

                    return (
                      <Link
                        key={doc?.$id}
                        href={listingHref(doc)}
                        className="rounded-2xl border border-border bg-background p-4 transition hover:bg-accent"
                      >
                        <p className="text-base font-extrabold">{title}</p>
                        {label ? (
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-muted-foreground">
                          {startLabel
                            ? `Starts ${startLabel}`
                            : "Coming into the next auction window"}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-primary">
                          View listing
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Crawlable link lists */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold text-primary mb-3">Browse live auction links</h2>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live auctions right now.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {live.slice(0, 16).map((doc) => {
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

            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold text-primary mb-3">Browse queued listing links</h2>
              {soon.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing queued right now.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {soon.slice(0, 16).map((doc) => {
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

          <details className="mt-5 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold">
              Full crawlable auction links (Live: {live.length} • Coming next: {soon.length})
            </summary>

            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-primary mb-2">Live auctions</h3>
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
                <h3 className="text-sm font-bold text-primary mb-2">Coming next</h3>
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
              This block helps crawlers discover listings even if scripts are slow.
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
                  The server couldn’t reach the listings database just now. Check server logs for the exact Appwrite error.
                </p>
              </div>
            ) : null}
          </details>
        </div>
      </section>

      {/* Interactive client UI */}
      <div id="interactive-current-listings">
        <CurrentListingsClient initialLive={live} initialSoon={soon} />
      </div>
    </>
  );
}

function SnapshotCard({
  title,
  value,
  body,
}: {
  title: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}