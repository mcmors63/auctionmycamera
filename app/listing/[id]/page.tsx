// app/listing/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingDetailsClient, { type Listing } from "./ListingDetailsClient";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";

// ✅ ISR: stable HTML for crawlers, still updates often enough for auctions
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

const endpointRaw = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const endpoint = endpointRaw.replace(/\/+$/, "");
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

function serverDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const db = serverDatabases();
    const doc = await db.getDocument(DATABASE_ID, LISTINGS_COLLECTION_ID, id);
    return doc as unknown as Listing;
  } catch {
    return null;
  }
}

function money(n?: number | null) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return `£${n.toLocaleString("en-GB")}`;
}

function pickBuyNow(l: Listing): number | null {
  if (typeof l.buy_now_price === "number") return l.buy_now_price;
  if (typeof (l as any).buy_now === "number") return (l as any).buy_now;
  return null;
}

function isIndexableStatus(status?: string) {
  // ✅ Keep queued indexable for exact-reg searches; sold is optional but you currently treat it as public
  return status === "live" || status === "queued" || status === "sold";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);

  if (!listing) {
    return {
      title: "Listing not found | AuctionMyPlate",
      robots: { index: false, follow: false },
    };
  }

  const reg = (listing.registration || "Private number plate").trim();
  const status = listing.status || "";
  const buyNow = pickBuyNow(listing);

  const titleBase =
    status === "queued"
      ? `${reg} – Coming Soon | AuctionMyPlate`
      : status === "sold"
      ? `${reg} – Sold | AuctionMyPlate`
      : `${reg} – Private Number Plate Auction | AuctionMyPlate`;

  const descBits = [
    `Bid on ${reg} on AuctionMyPlate.`,
    listing.plate_type ? `Type: ${listing.plate_type}.` : null,
    typeof listing.starting_price === "number" && listing.starting_price > 0
      ? `Starting price ${money(listing.starting_price)}.`
      : null,
    buyNow ? `Buy Now available at ${money(buyNow)}.` : null,
    status === "queued" ? "This plate is queued for the next weekly auction." : null,
    status === "sold" ? "This plate has sold on AuctionMyPlate." : null,
  ].filter(Boolean);

  const description = descBits.join(" ");

  // ✅ Canonical always anchored to SITE_URL logic (prod = real domain)
  const canonical = `${SITE_URL}/listing/${listing.$id}`;

  // Robots: don’t index non-public statuses
  const indexable = isIndexableStatus(status);

  return {
    title: titleBase,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: titleBase,
      description,
      url: canonical,
      siteName: "AuctionMyPlate",
      type: "website",
    },
  };
}

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListing(id);

  if (!listing) return notFound();

  // If it’s in a non-public state (pending/rejected/etc), don’t expose it
  const status = listing.status || "";
  if (!isIndexableStatus(status)) {
    return notFound();
  }

  // Lightweight JSON-LD (helps Google understand what this page is)
  const reg = (listing.registration || "Private number plate").trim();
  const buyNow = pickBuyNow(listing);
  const canonical = `${SITE_URL}/listing/${listing.$id}`;

  // Choose a sensible price for schema (avoid undefined when possible)
  const schemaPrice =
    typeof buyNow === "number"
      ? buyNow
      : typeof listing.starting_price === "number"
      ? listing.starting_price
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: reg,
    description: listing.description || listing.interesting_fact || `Private number plate ${reg}.`,
    sku: (listing as any).listing_id || listing.$id,
    url: canonical,
    brand: { "@type": "Brand", name: "AuctionMyPlate" },
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: schemaPrice,
      availability:
        status === "sold"
          ? "https://schema.org/SoldOut"
          : status === "queued"
          ? "https://schema.org/PreOrder"
          : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetailsClient initial={listing} />
    </>
  );
}
