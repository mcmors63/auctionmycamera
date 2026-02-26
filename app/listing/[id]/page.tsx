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

/**
 * ✅ Public visibility:
 * - Keep the page accessible for legitimate “ended” states (people will have links)
 * - But only INDEX the clean statuses (live/queued/sold)
 */
function isPublicStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  return [
    "live",
    "queued",
    "sold",
    "completed",         // ended, awaiting payment capture
    "not_sold",          // ended, reserve not met / no winner
    "payment_required",  // winner exists but needs a card
    "payment_failed",    // attempted charge failed
  ].includes(s);
}

function isIndexableStatus(status?: string) {
  const s = String(status || "").toLowerCase();
  return s === "live" || s === "queued" || s === "sold";
}

function statusTitleSuffix(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "queued") return "– Coming Soon";
  if (s === "sold") return "– Sold";
  if (s === "completed") return "– Auction ended (processing)";
  if (s === "payment_required") return "– Payment required";
  if (s === "payment_failed") return "– Payment failed";
  if (s === "not_sold") return "– Auction ended";
  return "– Camera Gear Auction";
}

function statusDescriptionSuffix(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "queued") return "This item is queued for the next weekly auction.";
  if (s === "sold") return "This item has sold on AuctionMyCamera.";
  if (s === "completed") return "The auction has ended and the result is being processed.";
  if (s === "payment_required") return "The auction has ended and the winner needs to complete payment.";
  if (s === "payment_failed") return "The auction has ended but payment could not be taken automatically.";
  if (s === "not_sold") return "The auction has ended and this item did not sell.";
  return null;
}

function schemaAvailability(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "sold") return "https://schema.org/SoldOut";
  if (s === "queued") return "https://schema.org/PreOrder";
  if (s === "live") return "https://schema.org/InStock";

  // Ended states: treat as out of stock (clean + safe)
  if (["completed", "payment_required", "payment_failed", "not_sold"].includes(s)) {
    return "https://schema.org/OutOfStock";
  }

  return "https://schema.org/OutOfStock";
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

  const titleBase = `${name} ${statusTitleSuffix(status)} | AuctionMyCamera`;

  const descBits = [
    `Bid on ${name} on AuctionMyCamera.`,
    anyL.gear_type ? `Type: ${String(anyL.gear_type).replace(/_/g, " ")}.` : null,
    anyL.condition ? `Condition: ${String(anyL.condition).replace(/_/g, " ")}.` : null,
    anyL.era ? `Era: ${String(anyL.era).replace(/_/g, " ")}.` : null,
    typeof anyL.starting_price === "number" && anyL.starting_price > 0
      ? `Starting price ${money(anyL.starting_price)}.`
      : null,
    buyNow ? `Buy Now available at ${money(buyNow)}.` : null,
    statusDescriptionSuffix(status),
  ].filter(Boolean);

  const description = descBits.join(" ");

  const canonical = `${SITE_URL}/listing/${anyL.$id}`;

  const publicPage = isPublicStatus(status);
  const indexable = publicPage && isIndexableStatus(status);

  return {
    title: titleBase,
    description,
    alternates: { canonical },

    // ✅ Public page can exist, but only index clean statuses
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
    availability: schemaAvailability(status),
    url: canonical,
  };

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