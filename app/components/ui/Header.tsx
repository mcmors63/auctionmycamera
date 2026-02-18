"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Client, Account } from "appwrite";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "AuctionMyCamera";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function Header() {
  const pathname = usePathname();

  const [status, setStatus] = useState<"checking" | "authed" | "guest">(
    "checking"
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { href: "/current-listings", label: "Current Listings" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        await account.get();
        if (!alive) return;
        setStatus("authed");
      } catch {
        if (!alive) return;
        setStatus("guest");
      }
    }

    check();

    return () => {
      alive = false;
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await account.deleteSession("current");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-black/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Left - Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 font-extrabold tracking-tight text-white"
            aria-label={`${SITE_NAME} home`}
          >
            <span className="text-xl sm:text-2xl">{SITE_NAME}</span>
            <span className="hidden sm:inline text-xs text-white/50 font-semibold tracking-wider">
              UK AUCTIONS
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "px-3 py-2 rounded-lg text-sm font-semibold transition",
                  isActive(item.href)
                    ? "text-white bg-white/10"
                    : "text-white/80 hover:text-white hover:bg-white/10",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Auth actions (avoid flicker while checking) */}
            {status === "guest" && (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-black transition"
                >
                  Register
                </Link>
              </div>
            )}

            {status === "authed" && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition"
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4">
            <div className="rounded-2xl border border-white/10 bg-black/70 overflow-hidden">
              <div className="p-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block px-3 py-2 rounded-lg text-sm font-semibold transition",
                      isActive(item.href)
                        ? "text-white bg-white/10"
                        : "text-white/80 hover:text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-white/10 p-2">
                {status === "checking" && (
                  <div className="px-3 py-2 text-sm text-white/60">
                    Checking account…
                  </div>
                )}

                {status === "guest" && (
                  <div className="flex gap-2 p-2">
                    <Link
                      href="/login"
                      className="flex-1 text-center px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 text-center px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-black transition"
                    >
                      Register
                    </Link>
                  </div>
                )}

                {status === "authed" && (
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
