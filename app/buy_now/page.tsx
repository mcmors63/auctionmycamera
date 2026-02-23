// app/buy_now/page.tsx
import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";

export const runtime = "nodejs";

// ✅ This page is just a redirect helper — do not index it
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function BuyNowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id || typeof id !== "string") {
    // ✅ Keep existing behavior if id missing
    redirect("/current-listings");
  }

  // ✅ Permanent redirect for stability/SEO
  permanentRedirect(`/place_bid?id=${encodeURIComponent(id)}`);
}