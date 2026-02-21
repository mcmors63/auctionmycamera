// app/place_bid/head.tsx
export default function Head({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const PROD_SITE_URL = "https://auctionmycamera.co.uk";

  function normalizeBaseUrl(input: string) {
    const trimmed = (input || "").trim();
    if (!trimmed) return "";
    return trimmed.replace(/\/+$/, "");
  }

  function getSiteUrl() {
    // Prefer explicit site URL when set (works for prod + preview reliably)
    const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
    if (explicit) return explicit;

    // Vercel preview fallback
    const vercelUrl = normalizeBaseUrl(
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
    );
    if (vercelUrl) return vercelUrl;

    // Final fallback
    if (process.env.NODE_ENV === "production") return PROD_SITE_URL;
    return "http://localhost:3000";
  }

  const SITE_URL = getSiteUrl();

  const rawId = searchParams?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const canonical = id ? `${SITE_URL}/listing/${id}` : `${SITE_URL}/auctions`;

  return (
    <>
      <title>Place a bid | AuctionMyCamera</title>
      <meta
        name="description"
        content="Place a bid on a camera or gear listing. Secure checkout and smooth post-sale handover."
      />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
      <link rel="canonical" href={canonical} />
    </>
  );
}