// proxy.ts
import { NextRequest, NextResponse } from "next/server";

const CANONICAL_RAW =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").trim();

const CANONICAL = CANONICAL_RAW.replace(/\/$/, "");

// Fail-safe URL parsing (don’t crash edge if env is bad)
let CANON_HOST = "";
let CANON_PROTO = "https:";

try {
  const canon = new URL(CANONICAL);
  CANON_HOST = canon.host;
  CANON_PROTO = canon.protocol;
} catch {
  CANON_HOST = "";
}

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

  // Dev safety: don't force canonical redirects on localhost/dev hosts
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".local");

  let changed = false;

  // Force canonical host + protocol (only if configured and not localhost)
  if (!isLocalhost && CANON_HOST) {
    if (url.host !== CANON_HOST) {
      url.host = CANON_HOST;
      changed = true;
    }
    if (url.protocol !== CANON_PROTO) {
      url.protocol = CANON_PROTO;
      changed = true;
    }
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};