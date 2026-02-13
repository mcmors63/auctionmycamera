// app/blog/[slug]/page.tsx
import { Client, Databases, Query } from "node-appwrite";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const runtime = "nodejs";

/**
 * ISR-style caching:
 * - A post page will be regenerated at most once per 5 minutes.
 */
export const revalidate = 300;

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

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

async function getPostBySlug(slug?: string | null): Promise<BlogPost | null> {
  if (!slug) return null;

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const res = await databases.listDocuments(DB_ID, BLOG_COLLECTION_ID, [
      Query.equal("slug", slug),
      Query.equal("status", "published"),
      Query.limit(1),
    ]);

    if (!res.documents.length) return null;
    return res.documents[0] as unknown as BlogPost;
  } catch (err) {
    console.error("Error loading blog post by slug:", slug, err);
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
      title: "Post not found | Auction My Plate",
      description: "This blog post could not be found.",
      alternates: { canonical: "/blog" },
    };
  }

  const description =
    post.excerpt ||
    (post.content ? post.content.slice(0, 150).trim() + "…" : undefined);

  return {
    title: `${post.title} | Auction My Plate Blog`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | Auction My Plate Blog`,
      description,
      type: "article",
      ...(post.imageUrl ? { images: [{ url: post.imageUrl }] } : {}),
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

    // Blank line ends current paragraph/list
    if (!line) {
      flushList();
      flushPara();
      continue;
    }

    // Headings end any open paragraph/list first
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

    // Bullets
    if (line.startsWith("- ")) {
      flushPara();
      listBuf.push(line.slice(2).trim());
      continue;
    }

    // Normal paragraph line
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

  // Simple Article JSON-LD (optional but helpful)
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt || undefined,
    image: post.imageUrl ? [post.imageUrl] : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://auctionmyplate.co.uk/blog/${post.slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="max-w-3xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-700/60 p-8">
        {/* Back link */}
        <p className="text-xs text-yellow-400 mb-4">
          <Link href="/blog" className="hover:underline">
            ← Back to blog
          </Link>
        </p>

        {/* Title + date */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-400 mb-2">
          {post.title}
        </h1>

        {dateLabel && <p className="text-xs text-gray-400 mb-6">{dateLabel}</p>}

        {/* Hero image */}
        {post.imageUrl && (
          <div className="w-full h-56 mb-6 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="space-y-4 text-sm leading-relaxed">
          {!blocks ? (
            <p className="text-gray-400 text-sm">No content yet for this article.</p>
          ) : (
            blocks.map((b, idx) => {
              if (b.type === "h2") {
                return (
                  <h2
                    key={idx}
                    className="pt-4 text-xl md:text-2xl font-extrabold text-yellow-300"
                  >
                    {b.text}
                  </h2>
                );
              }

              if (b.type === "h3") {
                return (
                  <h3
                    key={idx}
                    className="pt-2 text-base md:text-lg font-bold text-yellow-200"
                  >
                    {b.text}
                  </h3>
                );
              }

              if (b.type === "ul") {
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-2 text-gray-200">
                    {b.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              }

              // paragraph
              return (
                <p key={idx} className="text-gray-200">
                  {b.text}
                </p>
              );
            })
          )}
        </div>

        {/* Optional: gentle CTA back to blog list */}
        <div className="mt-10 border-t border-yellow-700/30 pt-6">
          <Link href="/blog" className="text-xs font-semibold text-yellow-400 hover:underline">
            Browse more articles →
          </Link>
        </div>
      </div>
    </main>
  );
}
