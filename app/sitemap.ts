// app/sitemap.ts
import type { MetadataRoute } from "next";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const revalidate = 300;

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

// -----------------------------
// ENV
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

// Listings
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// Blog
const BLOG_DB_ID =
  process.env.APPWRITE_BLOG_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BLOG_DATABASE_ID ||
  "";

const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

const PUBLIC_LISTING_STATUSES = ["active", "ended", "sold"];

// -----------------------------
// Fetch Listings
// -----------------------------
async function fetchListingUrls(db: Databases): Promise<MetadataRoute.Sitemap> {
  if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) return [];

  const urls: MetadataRoute.Sitemap = [];
  let cursor: string | undefined;

  while (true) {
    const queries: string[] = [
      Query.equal("status", PUBLIC_LISTING_STATUSES),
      Query.orderAsc("$id"),
      Query.limit(100),
    ];

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await db.listDocuments(
      LISTINGS_DB_ID,
      LISTINGS_COLLECTION_ID,
      queries
    );

    for (const doc of page.documents as any[]) {
      urls.push({
        url: `${SITE_URL}/listing/${doc.$id}`,
        lastModified: new Date(doc.$updatedAt),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    if (page.documents.length < 100) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return urls;
}

// -----------------------------
// Fetch Blog Posts
// -----------------------------
async function fetchBlogUrls(db: Databases): Promise<MetadataRoute.Sitemap> {
  if (!BLOG_DB_ID || !BLOG_COLLECTION_ID) return [];

  const urls: MetadataRoute.Sitemap = [];
  let cursor: string | undefined;

  while (true) {
    const queries: string[] = [
      Query.equal("status", "published"),
      Query.orderAsc("$id"),
      Query.limit(100),
    ];

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await db.listDocuments(
      BLOG_DB_ID,
      BLOG_COLLECTION_ID,
      queries
    );

    for (const doc of page.documents as any[]) {
      urls.push({
        url: `${SITE_URL}/blog/${doc.slug}`,
        lastModified: doc.$updatedAt
          ? new Date(doc.$updatedAt)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    if (page.documents.length < 100) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return urls;
}

// -----------------------------
// Main Sitemap
// -----------------------------
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/current-listings`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/fees`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!endpoint || !projectId || !apiKey) {
    return staticRoutes;
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(client);

    const listingRoutes = await fetchListingUrls(db);
    const blogRoutes = await fetchBlogUrls(db);

    return [...staticRoutes, ...listingRoutes, ...blogRoutes];
  } catch (err) {
    console.error("[sitemap] Error building sitemap:", err);
    return staticRoutes;
  }
}