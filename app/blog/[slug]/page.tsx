// app/blog/[slug]/page.tsx
import { Client, Databases, Query } from "node-appwrite";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";

export const runtime = "nodejs";

/**
 * ISR-style caching:
 * - A post page will be regenerated at most once per 5 minutes.
 */
export const revalidate = 300;

// -----------------------------
// ENV (server-safe fallbacks)
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

// ✅ Blog DB should NOT be the listings DB.
// Set APPWRITE_BLOG_DATABASE_ID to the Database ID of your “blog_posts” database in Appwrite.
const BLOG_DB_ID =
  process.env.APPWRITE_BLOG_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_BLOG_DATABASE_ID ||
  "";

// Collection inside that DB
const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

// Site URL for canonical + JSON-LD
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(
  /\/+$/,
  ""
);

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

function getDbOrThrow() {
  if (!endpoint) throw new Error("[blog] Missing APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!projectId) throw new Error("[blog] Missing APPWRITE_PROJECT_ID / NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!apiKey) throw new Error("[blog] Missing APPWRITE_API_KEY");
  if (!BLOG_DB_ID) throw new Error("[blog] Missing APPWRITE_BLOG_DATABASE_ID");
}

async function getPostBySlug(slug?: string | null): Promise<BlogPost | null> {
  if (!slug) return null;

  try {
    getDbOrThrow();

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const res = await databases.listDocuments(BLOG_DB_ID, BLOG_COLLECTION_ID, [
      Query.equal("slug", slug),
      Query.equal("status", "published"),
      Query.limit(1),
    ]);

    if (!res.documents.length) return null;
    return res.documents[0] as unknown as BlogPost;
  } catch (err) {
    console.error("[blog] Error loading post by slug:", slug, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found | AuctionMyCamera",
      description: "This blog post could not be found.",
      alternates: { canonical: `${SITE_URL}/blog` },
      robots: { index: false, follow: false },
    };
  }

  const description =
    post.excerpt ||
    (post.content ? post.content.slice(0, 155).trim() + "…" : "AuctionMyCamera blog post.");

  const canonical = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: `${post.title} | AuctionMyCamera Blog`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${post.title} | AuctionMyCamera Blog`,
      description,
      type: "article",
      url: canonical,
      siteName: "AuctionMyCamera",
      ...(post.imageUrl ? { images: [{ url: post.imageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | AuctionMyCamera Blog`,
      description,
      ...(post.imageUrl ? { images: [post.imageUrl] } : {}),
    },
  };
}

/**
 * Very small “content renderer” for Appwrite-stored text.
 * Supports:
 * - ## Heading -> <h2>
 * - ### Subheading -> <h3>
 * - - bullet -> <ul><li>
 * - blank lines separate blocks
 */
function renderContent(raw?: string) {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return null;

  const lines = text.split("\n");

  const blocks: Array<
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
  > = [];

  let paraBuf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    const t = paraBuf.join(" ").trim();
    if (t) blocks.push({ type: "p", text: t });
    paraBuf = [];
  };

  const flushList = () => {
    if (listBuf.length) blocks.push({ type: "ul", items: [...listBuf] });
    listBuf = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushPara();
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      flushPara();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      flushPara();
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("- ")) {
      flushPara();
      listBuf.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paraBuf.push(line);
  }

  flushList();
  flushPara();

  return blocks;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const dateLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const blocks = renderContent(post.content);

  const canonical = `${SITE_URL}/blog/${post.slug}`;

  // Simple Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt || undefined,
    image: post.imageUrl ? [post.imageUrl] : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    publisher: {
      "@type": "Organization",
      name: "AuctionMyCamera",
      url: `${SITE_URL}/`,
    },
  };

  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <Script
        id="ld-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8">
        {/* Back link */}
        <p className="text-xs text-muted-foreground mb-4">
          <Link href="/blog" className="underline hover:opacity-80">
            ← Back to blog
          </Link>
        </p>

        {/* Title + date */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          {post.title}
        </h1>

        {dateLabel && <p className="text-xs text-muted-foreground mt-2 mb-6">{dateLabel}</p>}

        {/* Hero image */}
        {post.imageUrl && (
          <div className="w-full h-56 mb-6 rounded-xl overflow-hidden bg-muted border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="space-y-4 text-sm leading-relaxed">
          {!blocks ? (
            <p className="text-muted-foreground">No content yet for this article.</p>
          ) : (
            blocks.map((b, idx) => {
              if (b.type === "h2") {
                return (
                  <h2 key={idx} className="pt-4 text-xl md:text-2xl font-extrabold">
                    {b.text}
                  </h2>
                );
              }

              if (b.type === "h3") {
                return (
                  <h3 key={idx} className="pt-2 text-base md:text-lg font-bold">
                    {b.text}
                  </h3>
                );
              }

              if (b.type === "ul") {
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-2">
                    {b.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              }

              return <p key={idx}>{b.text}</p>;
            })
          )}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <Link href="/blog" className="text-xs font-semibold underline hover:opacity-80">
            Browse more articles →
          </Link>
        </div>
      </div>
    </main>
  );
}