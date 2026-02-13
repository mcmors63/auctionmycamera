// app/robots.ts
import type { MetadataRoute } from "next";

const PROD_SITE_URL = "https://auctionmyplate.co.uk";

function isProdEnv() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

export default function robots(): MetadataRoute.Robots {
  const IS_PROD = isProdEnv();

  if (!IS_PROD) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${PROD_SITE_URL}/sitemap.xml`,
  };
}
