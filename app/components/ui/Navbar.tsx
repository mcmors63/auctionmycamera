// components/ui/Navbar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Client, Account } from "appwrite";
import { CAMERA_BRANDS, CAMERA_CATEGORY_SECTIONS } from "@/lib/camera-categories";

type User = {
  $id: string;
  email: string;
  name?: string;
};

// ----------------------------------------------------
// Appwrite client (guarded)
// ----------------------------------------------------
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const appwriteReady = !!APPWRITE_ENDPOINT && !!APPWRITE_PROJECT_ID;

const client = appwriteReady
  ? new Client().setEndpoint(APPWRITE_ENDPOINT!).setProject(APPWRITE_PROJECT_ID!)
  : null;

const account = client ? new Account(client) : null;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mobileBrowseOpen, setMobileBrowseOpen] = useState(false);

  const loadedOnceRef = useRef(false);
  const browseRef = useRef<HTMLDivElement | null>(null);

  // Load current session (refresh on route change so login/logout updates without hard refresh)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!account) {
        if (!alive) return;
        setUser(null);
        loadedOnceRef.current = true;
        setLoadingUser(false);
        return;
      }

      try {
        if (!loadedOnceRef.current) setLoadingUser(true);
        const current = await account.get();
        if (!alive) return;
        setUser(current as User);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        loadedOnceRef.current = true;
        setLoadingUser(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [pathname]);

  // Close mobile / browse menus when route changes
  useEffect(() => {
    setMobileOpen(false);
    setBrowseOpen(false);
    setMobileBrowseOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Close browse menu on outside click / Escape
  useEffect(() => {
    if (!browseOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!browseRef.current) return;
      if (!browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBrowseOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [browseOpen]);

  // Allow either admin email while you’re still copying projects around
  const adminEmails = new Set<string>([
    "admin@auctionmycamera.co.uk",
    "admin@auctionmyplate.co.uk",
  ]);

  const isAdmin = !!user?.email && adminEmails.has(user.email.toLowerCase());

  const clearAuthStorage = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("amp_user_email");
    window.localStorage.removeItem("amp_user_id");
    window.localStorage.removeItem("amc_user_email");
    window.localStorage.removeItem("amc_user_id");
  };

  const handleLogout = async () => {
    try {
      if (account) {
        await account.deleteSession("current");
      }
    } catch {
      // ignore
    }

    clearAuthStorage();

    setUser(null);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/current-listings", label: "Auctions" },
    { href: "/sell", label: "Sell" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/fees", label: "Fees" },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  const browseActive = pathname?.startsWith("/current-listings");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="AuctionMyCamera home"
          >
            {/* keep your existing logo/icon bits EXACTLY as they were, inside here */}
            <span className="leading-tight">
              {/* keep your existing site name text spans here */}
            </span>
          </Link>

          <Link
            href="/our-marketplace-network"
            className="mt-1 inline-flex w-fit items-center rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Learn about our specialist marketplace network"
          >
            Part of the Specialist Auction Network
          </Link>
        </div>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden lg:flex items-center gap-1">
          <div
            ref={browseRef}
            className="relative"
            onMouseEnter={() => setBrowseOpen(true)}
            onMouseLeave={() => setBrowseOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={browseOpen}
              onClick={() => setBrowseOpen((v) => !v)}
              className={[
                "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                "text-muted-foreground hover:text-foreground hover:bg-accent",
                browseActive ? "text-foreground bg-accent" : "",
              ].join(" ")}
            >
              Browse Gear
              <span className="text-xs">{browseOpen ? "▴" : "▾"}</span>
              {browseActive ? (
                <span className="absolute left-3 right-3 -bottom-[7px] h-[2px] rounded-full bg-primary" />
              ) : null}
            </button>

            {browseOpen && (
              <div className="absolute left-0 top-full mt-3 w-[min(92vw,1000px)] rounded-2xl border border-border bg-background p-5 shadow-2xl">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-9">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {CAMERA_CATEGORY_SECTIONS.map((section) => (
                        <div key={section.key} className="space-y-2">
                          <Link
                            href={section.href}
                            className="block text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {section.label}
                          </Link>

                          <div className="space-y-1">
                            {section.options.map((option) => (
                              <Link
                                key={option.value}
                                href={option.href}
                                className="block rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                              >
                                {option.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-3 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Popular brands</p>

                      <div className="grid grid-cols-2 gap-1">
                        {CAMERA_BRANDS.map((brand) => (
                          <Link
                            key={brand.value}
                            href={brand.href}
                            className="rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          >
                            {brand.label}
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-border pt-3 mt-3 space-y-2">
                        <Link
                          href="/current-listings"
                          className="block rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent"
                        >
                          Browse all auctions
                        </Link>
                        <Link
                          href="/dashboard"
                          className="block rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent"
                        >
                          Sell an item
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  active ? "text-foreground bg-accent" : "",
                ].join(" ")}
              >
                {link.label}
                {active ? (
                  <span className="absolute left-3 right-3 -bottom-[7px] h-[2px] rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden md:flex items-center gap-2">
          {loadingUser ? null : user ? (
            <>
              <Link
                href={isAdmin ? "/admin" : "/dashboard"}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {isAdmin ? "Admin" : "Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <span className="text-lg leading-none">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div id="mobile-nav" className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
            <div className="rounded-xl border border-border bg-card/40 p-2">
              <button
                type="button"
                onClick={() => setMobileBrowseOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-accent"
                aria-expanded={mobileBrowseOpen}
              >
                <span>Browse Gear</span>
                <span className="text-xs">{mobileBrowseOpen ? "▴" : "▾"}</span>
              </button>

              {mobileBrowseOpen && (
                <div className="space-y-4 px-1 pb-2 pt-2">
                  {CAMERA_CATEGORY_SECTIONS.map((section) => (
                    <div key={section.key} className="rounded-lg border border-border bg-background/70 p-3">
                      <Link
                        href={section.href}
                        className="block text-sm font-semibold text-foreground"
                      >
                        {section.label}
                      </Link>

                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {section.options.map((option) => (
                          <Link
                            key={option.value}
                            href={option.href}
                            className="rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          >
                            {option.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border border-border bg-background/70 p-3">
                    <p className="text-sm font-semibold text-foreground">Popular brands</p>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {CAMERA_BRANDS.map((brand) => (
                        <Link
                          key={brand.value}
                          href={brand.href}
                          className="rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          {brand.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col space-y-2 border-t border-border pt-4">
              {loadingUser ? null : user ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2 text-center text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {isAdmin ? "Admin" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="w-full rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full rounded-lg border border-border bg-card px-4 py-2 text-center text-sm font-semibold transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}