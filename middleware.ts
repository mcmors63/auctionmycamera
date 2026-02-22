// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const CANONICAL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmyplate.co.uk").replace(
  /\/$/,
  ""
);

const canonical = new URL(CANONICAL);
const CANON_HOST = canonical.host;
const CANON_PROTO = canonical.protocol;

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
]);

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Don’t mess with Next internals or API routes
  if (url.pathname.startsWith("/_next")) return NextResponse.next();
  if (url.pathname.startsWith("/api")) return NextResponse.next();

  let changed = false;

  // 1) Force canonical host + protocol
  if (CANON_HOST && url.host !== CANON_HOST) {
    url.host = CANON_HOST;
    url.protocol = CANON_PROTO;
    changed = true;
  }

  // 2) Remove trailing slash (except "/")
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
    changed = true;
  }

  // 3) Strip tracking params ONLY (don’t break real query params)
  const keys = Array.from(url.searchParams.keys());
  if (keys.length) {
    const hasNonTracking = keys.some((k) => !TRACKING_PARAMS.has(k));
    if (!hasNonTracking) {
      // remove all tracking params
      keys.forEach((k) => url.searchParams.delete(k));
      changed = true;
    }
  }

  if (changed) {
    // 308 keeps method (safe); for GET it behaves like a normal redirect
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
