// proxy.ts
import { NextRequest, NextResponse } from "next/server";

const CANONICAL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
  /\/$/,
  ""
);
const canon = new URL(CANONICAL);

// Common tracking params that create duplicates
const TRACKING = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
]);

export default function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  // ignore next internals + API
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  let changed = false;

  // Force canonical host + protocol
  if (url.host !== canon.host || url.protocol !== canon.protocol) {
    url.host = canon.host;
    url.protocol = canon.protocol;
    changed = true;
  }

  // Normalize trailing slash (keeps "/" intact)
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
    changed = true;
  }

  // If the URL is ONLY tracking params, strip them
  const keys = Array.from(url.searchParams.keys());
  if (keys.length) {
    const hasNonTracking = keys.some((k) => !TRACKING.has(k));
    if (!hasNonTracking) {
      keys.forEach((k) => url.searchParams.delete(k));
      changed = true;
    }
  }

  if (changed) return NextResponse.redirect(url, 308);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
