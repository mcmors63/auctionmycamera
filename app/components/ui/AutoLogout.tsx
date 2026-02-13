"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

// Auto-logout after 5 minutes of inactivity
const INACTIVITY_LIMIT = 5 * 60 * 1000;

export default function AutoLogout() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ---- NEW: check if user is logged in first ----
  const initAutoLogout = async () => {
    try {
      await account.get(); 
      // User is logged in → enable auto-logout
      resetTimer();
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("scroll", resetTimer);
      window.addEventListener("click", resetTimer);
    } catch {
      // Not logged in → do NOT enable auto logout
      return;
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await account.deleteSession("current");
        router.push("/login");
      } catch (err) {
        console.error("Auto-logout failed:", err);
      }
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    initAutoLogout();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, []);

  return null; // invisible component
}
