// app/components/ui/Navbar.tsx
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

  const isAdmin = user?.email?.toLowerCase() === "admin@auctionmyplate.co.uk";

  const clearAuthStorage = () => {
    if (typeof window === "undefined") return;
    // These keys were causing “ghost login” behaviour elsewhere.
    window.localStorage.removeItem("amp_user_email");
    window.localStorage.removeItem("amp_user_id");
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
    { href: "/sell-my-plate", label: "Sell" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/fees", label: "Fees" },
    { href: "/faq", label: "FAQ" },
    { href: "/dvla", label: "DVLA" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#07080a]/92 backdrop-blur border-b border-white/10">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg md:text-xl font-extrabold tracking-tight text-zinc-100">
            AuctionMy<span className="text-amber-300">Plate.co.uk</span>
          </span>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-amber-200"
                  : "text-zinc-200 hover:text-amber-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden md:flex items-center gap-3">
          {loadingUser ? null : user ? (
            <>
              <Link
                href={isAdmin ? "/admin" : "/dashboard"}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 transition"
              >
                {isAdmin ? "Admin" : "My Dashboard"}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 text-zinc-100 hover:bg-white/15 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-300 text-black hover:bg-amber-200 transition"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="lg:hidden flex items-center justify-center w-10 h-10 border border-white/15 rounded-lg text-zinc-100 bg-white/5 hover:bg-white/10 transition"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div id="mobile-nav" className="lg:hidden border-t border-white/10 bg-[#07080a]/98">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium py-1 ${
                    isActive(link.href)
                      ? "text-amber-200"
                      : "text-zinc-200 hover:text-amber-200"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 flex flex-col space-y-2">
              {loadingUser ? null : user ? (
                <>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 transition"
                  >
                    {isAdmin ? "Admin" : "My Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 text-zinc-100 hover:bg-white/15 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="w-full text-center px-4 py-2 text-sm font-semibold rounded-lg bg-amber-300 text-black hover:bg-amber-200 transition"
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
