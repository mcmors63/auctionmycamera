"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";
import Navbar from "./components/ui/Navbar";
import Footer from "./components/ui/footer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // ✅ Appwrite setup
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const account = new Account(client);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        try {
          await account.deleteSession("current");
          console.log("User logged out after 5 minutes of inactivity");
          router.push("/login");
        } catch (err) {
          console.error("Auto logout failed:", err);
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // 👂 Listen for user activity
    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer(); // start timer

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}
