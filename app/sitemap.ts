// app/sitemap.ts
import type { MetadataRoute } from "next";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";

// ✅ Make new listings appear quickly in the sitemap (and therefore discoverable faster)
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

  // ✅ Always use the real domain in production
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

// -----------------------------
// Appwrite (server/admin)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// ✅ LISTINGS ONLY
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

/**
 * ✅ Listing route base.
 * Default to /listings/{id}. You can override with NEXT_PUBLIC_LISTING_URL_PATTERN.
 *
 * Accepts patterns like:
 * - /listings/{id}
 * - /listing/{id}
 */
function getListingPattern() {
  const raw = (process.env.NEXT_PUBLIC_LISTING_URL_PATTERN || "").trim();

  // Default: most common in this codebase
  if (!raw) return "/listings/{id}";

  // Must start with /listing or /listings
  if (!raw.startsWith("/listing")) return "/listings/{id}";

  return raw;
}

const LISTING_URL_PATTERN = getListingPattern();

function buildListingUrl(id: string) {
  const path = LISTING_URL_PATTERN.includes("{id}")
    ? LISTING_URL_PATTERN.replace("{id}", id)
    : `${LISTING_URL_PATTERN.replace(/\/$/, "")}/${id}`;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

// ✅ Only include statuses that are truly public/indexable (edit if your app differs)
const PUBLIC_LISTING_STATUSES = ["active", "ended", "sold"];

async function fetchListingUrls(): Promise<MetadataRoute.Sitemap> {
  // ✅ Fail loudly if env is not wired correctly (prevents silently using wrong DB)
  if (!endpoint) throw new Error("[sitemap] Missing APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!projectId) throw new Error("[sitemap] Missing APPWRITE_PROJECT_ID or NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!apiKey) throw new Error("[sitemap] Missing APPWRITE_API_KEY");
  if (!LISTINGS_DB_ID) throw new Error("[sitemap] Missing APPWRITE_LISTINGS_DATABASE_ID (or NEXT_PUBLIC_...)");
  if (!LISTINGS_COLLECTION_ID) throw new Error("[sitemap] Missing APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC_...)");

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const db = new Databases(client);

  const urls: MetadataRoute.Sitemap = [];

  // ✅ Stable pagination: order by $id and cursorAfter($id)
  let cursor: string | undefined;

  while (true) {
    const queries: string[] = [
      Query.equal("status", PUBLIC_LISTING_STATUSES),
      Query.orderAsc("$id"),
      Query.limit(100),
    ];

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await db.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, queries);

    for (const doc of page.documents as any[]) {
      const id = doc.$id as string;
      const lastModified = doc.$updatedAt ? new Date(doc.$updatedAt) : new Date();

      urls.push({
        url: buildListingUrl(id),
        lastModified,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    if (!page.documents.length || page.documents.length < 100) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ✅ Only include routes that make sense for AuctionMyCamera
  // (Do NOT include login-only URLs like /sell)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },

    {
      url: `${SITE_URL}/current-listings`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },

    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/fees`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },

    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const listingRoutes = await fetchListingUrls();
    return [...staticRoutes, ...listingRoutes];
  } catch (e) {
    console.error("[sitemap] Failed to fetch listings from Appwrite:", e);
    return staticRoutes;
  }
}