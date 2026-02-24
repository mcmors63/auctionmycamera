// app/ClientLayout.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";
import Navbar from "./components/ui/Navbar";
import Footer from "./components/ui/footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // ✅ Create Appwrite client/account once (not on every render)
  const account = useMemo(() => {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      // Don’t throw in client runtime—just keep it safe.
      console.warn("[ClientLayout] Missing Appwrite env vars.");
      // Return a dummy account-shaped object to avoid crashes if env is missing.
      // But realistically, your env should be set.
      const dummyClient = new Client();
      return new Account(dummyClient);
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId);
    return new Account(client);
  }, []);

  // ✅ Browser-safe timer type
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const logoutAfterMs = 10 * 60 * 1000; // 10 minutes

    const clearTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    };

    const startTimer = () => {
      clearTimer();
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await account.deleteSession("current");
          console.log("[ClientLayout] User logged out after inactivity.");
          router.push("/login");
        } catch (err) {
          console.error("[ClientLayout] Auto logout failed:", err);
        }
      }, logoutAfterMs);
    };

    // 👂 Listen for user activity
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, startTimer, { passive: true }));

    startTimer(); // start timer

    return () => {
      clearTimer();
      events.forEach((event) => window.removeEventListener(event, startTimer));
    };
  }, [account, router]);

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}