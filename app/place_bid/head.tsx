// app/place_bid/head.tsx
export default function Head({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // ✅ Production canonical base for AuctionMyCamera
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

  const rawId = searchParams?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Canonical should point at the real listing page (not the bid step)
  // Assumes your listing route is /listing/[id]
  const canonical = id ? `${SITE_URL}/listing/${id}` : `${SITE_URL}/auctions`;

  return (
    <>
      <title>Place a bid | AuctionMyCamera</title>
      <meta
        name="description"
        content="Place a bid on a camera or gear listing. Secure checkout and smooth post-sale handover."
      />

      {/* ✅ Stop indexing bidding/checkout steps */}
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />

      {/* ✅ Consolidate SEO signals onto the listing page */}
      <link rel="canonical" href={canonical} />
    </>
  );
}