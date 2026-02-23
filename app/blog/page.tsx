// app/blog/page.tsx
import { Client, Databases, Query } from "node-appwrite";
import Link from "next/link";
import type { Metadata } from "next";

export const runtime = "nodejs";

/**
 * ISR-style caching:
 * - Blog index will be regenerated at most once per 5 minutes.
 * - Good for SEO + speed, and avoids hammering Appwrite.
 */
export const revalidate = 300;

function normalizeBaseUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

// ✅ Canonical base (must match site)
const SITE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk"
);

// ✅ Appwrite server-safe env (allow NEXT_PUBLIC fallback but prefer server vars)
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

// DB / Collection (keep your existing behavior)
const DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

// ✅ Absolute canonical for SEO clarity
const blogCanonical = SITE_URL ? `${SITE_URL}/blog` : "/blog";

export const metadata: Metadata = {
  title: "Blog | AuctionMyCamera",
  description:
    "Guides, tips and practical advice for buying and selling camera gear — lenses, bodies, accessories and more.",
  alternates: { canonical: blogCanonical },
  openGraph: {
    title: "Blog | AuctionMyCamera",
    description:
      "Guides, tips and practical advice for buying and selling camera gear — lenses, bodies, accessories and more.",
    url: blogCanonical,
    type: "website",
  },
};

type BlogPost = {
  $id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  status?: string;
  publishedAt?: string;
  imageUrl?: string;
};

async function getPosts(): Promise<BlogPost[]> {
  // Fail-safe: don't hard-crash render if env missing
  if (!endpoint || !projectId || !apiKey || !DB_ID || !BLOG_COLLECTION_ID) {
    console.error("[blog] Missing Appwrite env vars for blog index rendering.");
    return [];
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new Databases(client);

  const res = await databases.listDocuments(DB_ID, BLOG_COLLECTION_ID, [
    Query.equal("status", "published"),
    Query.orderDesc("publishedAt"),
    Query.limit(50),
  ]);

  return res.documents as unknown as BlogPost[];
}

export default async function BlogIndexPage() {
  let posts: BlogPost[] = [];

  try {
    posts = await getPosts();
  } catch (err) {
    console.error("Failed to load blog posts:", err);
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-2">
            Blog
          </h1>
          <p className="text-sm text-neutral-700">
            Guides, tips and practical advice for buying and selling camera gear.
          </p>
        </header>

        {posts.length === 0 && (
          <p className="text-neutral-600 text-sm">
            No posts yet. Once you publish an article in Appwrite, it will appear here.
          </p>
        )}

        <div className="space-y-6">
          {posts.map((post) => {
            const dateLabel = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null;

            const preview =
              post.excerpt ||
              (post.content ? post.content.slice(0, 160).trim() + "…" : "");

            return (
              <article
                key={post.$id}
                className="border border-neutral-200 rounded-xl p-5 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  {post.imageUrl && (
                    <div className="w-full md:w-40 h-28 overflow-hidden rounded-lg mb-2 md:mb-0 md:mr-4 bg-neutral-100 border border-neutral-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                      <Link href={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </h2>

                    {dateLabel && <p className="text-xs text-neutral-500 mb-2">{dateLabel}</p>}

                    {preview ? <p className="text-sm text-neutral-800 mb-3">{preview}</p> : null}

                    <Link href={`/blog/${post.slug}`} className="text-xs font-semibold hover:underline">
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}