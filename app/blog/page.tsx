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

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

export const metadata: Metadata = {
  title: "Blog | Auction My Plate",
  description: "Guides, tips and DVLA know-how for buying and selling cherished plates.",
  alternates: { canonical: "/blog" },
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
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

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
    <main className="min-h-screen bg-black text-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-[#111111] rounded-2xl shadow-lg border border-yellow-700/60 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-yellow-400 mb-2">Blog</h1>
          <p className="text-sm text-gray-300">
            Guides, tips and DVLA know-how for buying and selling cherished plates.
          </p>
        </header>

        {posts.length === 0 && (
          <p className="text-gray-500 text-sm">
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
                className="border border-neutral-700 rounded-xl p-5 bg-neutral-900 shadow-sm hover:shadow-md hover:shadow-yellow-500/10 transition-shadow"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  {post.imageUrl && (
                    <div className="w-full md:w-40 h-28 overflow-hidden rounded-lg mb-2 md:mb-0 md:mr-4">
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
                    <h2 className="text-xl font-semibold text-yellow-300 mb-1">
                      <Link href={`/blog/${post.slug}`} className="hover:text-yellow-200">
                        {post.title}
                      </Link>
                    </h2>

                    {dateLabel && <p className="text-xs text-gray-400 mb-2">{dateLabel}</p>}

                    {preview ? <p className="text-sm text-gray-200 mb-3">{preview}</p> : null}

                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-xs font-semibold text-yellow-400 hover:underline"
                    >
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
