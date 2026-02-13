"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "amp_cookie_consent_v2";

type ConsentState = {
  essential: boolean;
  ads: boolean;
};

function saveConsent(state: ConsentState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Cookie banner storage error:", err);
  }

  // Broadcast to anything listening (e.g. GoogleAdsLoader)
  try {
    window.dispatchEvent(
      new CustomEvent<ConsentState>("amp_cookie_consent_changed", {
        detail: state,
      })
    );
  } catch (err) {
    console.error("Failed to dispatch consent event:", err);
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      // No consent stored yet → show banner
      if (!raw) {
        setVisible(true);
        return;
      }

      // Try to parse v2 format
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (
        parsed &&
        typeof parsed.essential === "boolean" &&
        typeof parsed.ads === "boolean"
      ) {
        // Valid v2 consent
        setVisible(false);
        return;
      }

      // If something older / weird is stored, show again
      setVisible(true);
    } catch (err) {
      console.error("Cookie banner storage error:", err);
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ essential: true, ads: true });
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    saveConsent({ essential: true, ads: false });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40">
      <div className="mx-auto max-w-5xl mb-4 px-4">
        <div className="bg-black text-yellow-50 border border-yellow-500/60 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-100">
            <p className="font-semibold text-yellow-300 mb-1">
              We use cookies
            </p>
            <p>
              We use essential cookies to keep you logged in and run auctions,
              plus optional analytics/ads cookies to improve performance and
              marketing. For details, see our{" "}
              <Link
                href="/cookies"
                className="underline text-yellow-300 hover:text-yellow-200"
              >
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline text-yellow-300 hover:text-yellow-200"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-3 py-2 rounded-full border border-yellow-400 text-[11px] sm:text-xs text-yellow-200 hover:bg-yellow-900/40 transition"
            >
              Essential only
            </button>

            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-4 py-2 rounded-full bg-yellow-400 text-black text-xs sm:text-sm font-semibold hover:bg-yellow-300 transition"
            >
              Accept all cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
