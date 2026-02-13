"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false);

  // Check login on load
  useEffect(() => {
    async function check() {
      try {
        await account.get();
        setLoggedIn(true);
      } catch {
        setLoggedIn(false);
      }
    }

    check();
  }, []);

  async function handleLogout() {
    try {
      await account.deleteSession("current");
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <header className="w-full bg-black text-white py-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-4">
        
        {/* Left side - Logo */}
        <Link href="/" className="text-2xl font-bold tracking-wider">
          AuctionMyPlate
        </Link>

        {/* Right side */}
        <nav className="flex items-center gap-6 text-lg">

          <Link href="/current-listings" className="hover:underline">
            Current Listings
          </Link>

          <Link href="/about" className="hover:underline">
            About
          </Link>

          {!loggedIn && (
            <Link
              href="/login"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700"
            >
              Login
            </Link>
          )}

          {loggedIn && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
