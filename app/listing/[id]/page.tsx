// app/listing/[id]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingDetailsClient, { type Listing } from "./ListingDetailsClient";
import { Client, Databases } from "node-appwrite";

export const runtime = "nodejs";

// ✅ ISR: stable HTML for crawlers, still updates often enough for auctions
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

  // Local/dev or preview can use explicit if set
  if (explicit) return explicit;

  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
  );
  if (onVercel && vercelUrl) return vercelUrl;

  return "http://localhost:3000";
}

const SITE_URL = getSiteUrl();

function getServerAppwriteConfig() {
  const endpointRaw =
    process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "";

  const endpoint = normalizeBaseUrl(endpointRaw);

  const projectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    "";

  const apiKey = process.env.APPWRITE_API_KEY || "";

  const databaseId =
    process.env.APPWRITE_LISTINGS_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
    "";

  const collectionId =
    process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
    "";

  return { endpoint, projectId, apiKey, databaseId, collectionId };
}

function serverDatabases() {
  const { endpoint, projectId, apiKey } = getServerAppwriteConfig();

  // Don’t crash the whole route at import time; fail when called.
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Server Appwrite config missing (endpoint/projectId/apiKey).");
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function fetchListing(id: string): Promise<Listing | null> {
  const { databaseId, collectionId, endpoint, projectId, apiKey } = getServerAppwriteConfig();

  if (!endpoint || !projectId || !apiKey || !databaseId || !collectionId) {
    // In previews/dev, missing envs should just behave like “not found”
    return null;
  }

  try {
    const db = serverDatabases();
    const doc = await db.getDocument(databaseId, collectionId, id);
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
  const anyL = l as any;
  if (typeof anyL.buy_now_price === "number") return anyL.buy_now_price;
  if (typeof anyL.buy_now === "number") return anyL.buy_now;
  return null;
}

function getListingName(l: Listing) {
  const anyL = l as any;

  const itemTitle = String(anyL.item_title || anyL.title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(anyL.brand || "").trim();
  const model = String(anyL.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const legacy = String(anyL.registration || anyL.reg_number || "").trim();
  if (legacy) return legacy;

  const gearType = String(anyL.gear_type || anyL.type || "").trim();
  if (gearType) return `${gearType} listing`;

  return "Camera gear listing";
}

function isPublicStatus(status?: string) {
  // ✅ Public statuses only (and indexable)
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
      title: "Listing not found | AuctionMyCamera",
      robots: { index: false, follow: false },
    };
  }

  const anyL = listing as any;
  const status = String(anyL.status || "");
  const name = getListingName(listing);
  const buyNow = pickBuyNow(listing);

  const titleBase =
    status === "queued"
      ? `${name} – Coming Soon | AuctionMyCamera`
      : status === "sold"
      ? `${name} – Sold | AuctionMyCamera`
      : `${name} – Camera Gear Auction | AuctionMyCamera`;

  const descBits = [
    `Bid on ${name} on AuctionMyCamera.`,
    anyL.gear_type ? `Type: ${String(anyL.gear_type).replace(/_/g, " ")}.` : null,
    anyL.condition ? `Condition: ${String(anyL.condition).replace(/_/g, " ")}.` : null,
    anyL.era ? `Era: ${String(anyL.era).replace(/_/g, " ")}.` : null,
    typeof anyL.starting_price === "number" && anyL.starting_price > 0
      ? `Starting price ${money(anyL.starting_price)}.`
      : null,
    buyNow ? `Buy Now available at ${money(buyNow)}.` : null,
    status === "queued" ? "This item is queued for the next weekly auction." : null,
    status === "sold" ? "This item has sold on AuctionMyCamera." : null,
  ].filter(Boolean);

  const description = descBits.join(" ");

  // ✅ Canonical always anchored to SITE_URL logic (prod = real domain)
  const canonical = `${SITE_URL}/listing/${anyL.$id}`;

  const indexable = isPublicStatus(status);

  return {
    title: titleBase,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: titleBase,
      description,
      url: canonical,
      siteName: "AuctionMyCamera",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleBase,
      description,
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

  const anyL = listing as any;

  // If it’s in a non-public state (pending/rejected/etc), don’t expose it
  const status = String(anyL.status || "");
  if (!isPublicStatus(status)) return notFound();

  const name = getListingName(listing);
  const buyNow = pickBuyNow(listing);
  const canonical = `${SITE_URL}/listing/${anyL.$id}`;

  const schemaPrice =
    typeof buyNow === "number"
      ? buyNow
      : typeof anyL.current_bid === "number"
      ? anyL.current_bid
      : typeof anyL.starting_price === "number"
      ? anyL.starting_price
      : null;

  const schemaDesc = String(anyL.description || "").trim() || `Camera gear listing: ${name}.`;

  const offer: any = {
    "@type": "Offer",
    priceCurrency: "GBP",
    availability:
      status === "sold"
        ? "https://schema.org/SoldOut"
        : status === "queued"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock",
    url: canonical,
  };

  // Only include price if we have one (cleaner JSON-LD)
  if (typeof schemaPrice === "number") {
    offer.price = schemaPrice;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: schemaDesc,
    sku: String(anyL.listing_id || anyL.$id),
    url: canonical,
    brand: { "@type": "Brand", name: "AuctionMyCamera" },
    offers: offer,
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