"use client";

import Head from "next/head";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function CanonicalTag() {
  const pathname = usePathname() || "/";

  const canonical = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");

    // Normalise trailing slash (keep "/" as "/")
    const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

    // If NEXT_PUBLIC_SITE_URL isn’t set, fall back to current origin (still better than no canonical)
    const origin =
      base || (typeof window !== "undefined" ? window.location.origin : "");

    return origin ? `${origin}${cleanPath}` : cleanPath;
  }, [pathname]);

  return (
    <Head>
      <link rel="canonical" href={canonical} />
    </Head>
  );
}
