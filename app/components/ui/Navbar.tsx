// components/ui/Navbar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

type User = {
  $id: string;
  email: string;
  name?: string;
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadedOnceRef = useRef(false);

  // Load current session (refresh on route change so login/logout updates without hard refresh)
  useEffect(() => {
    let alive = true;

    const load = async () => {
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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
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

  // Allow either admin email while you’re still copying projects around
  const adminEmails = new Set<string>([
    "admin@auctionmycamera.co.uk",
    "admin@auctionmyplate.co.uk",
  ]);

  const isAdmin = !!user?.email && adminEmails.has(user.email.toLowerCase());

  const clearAuthStorage = () => {
    if (typeof window === "undefined") return;
    // clear both old + new keys to avoid “ghost login” when cloning projects
    window.localStorage.removeItem("amp_user_email");
    window.localStorage.removeItem("amp_user_id");
    window.localStorage.removeItem("amc_user_email");
    window.localStorage.removeItem("amc_user_id");
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
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
    // ✅ Blog removed for now
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="AuctionMyCamera home"
        >
          {/* Simple “lens” mark */}
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <span className="relative h-4 w-4 rounded-full bg-primary/30">
              <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-primary/70" />
            </span>
          </span>

          <span className="leading-tight">
            <span className="block text-[15px] md:text-base font-extrabold tracking-tight text-foreground">
              AuctionMy<span className="text-primary">Camera</span>
            </span>
            <span className="block text-[11px] md:text-xs text-muted-foreground">
              Auctions for cameras & gear
            </span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden lg:flex items-center gap-1">
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
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {isAdmin ? "Admin" : "Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
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
        <div id="mobile-nav" className="lg:hidden border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
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

            <div className="border-t border-border pt-4 flex flex-col space-y-2">
              {loadingUser ? null : user ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {isAdmin ? "Admin" : "Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-ring"
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
