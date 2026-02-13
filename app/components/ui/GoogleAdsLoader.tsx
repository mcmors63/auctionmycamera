"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    _ampAdsLoaded?: boolean;
  }
}

// ✅ Your real Google Ads ID
const GOOGLE_ADS_ID = "AW-17787420130";

// ✅ Shared consent key (must match CookieBanner)
const CONSENT_STORAGE_KEY = "amp_cookie_consent_v2";

type ConsentState = {
  essential: boolean;
  ads: boolean;
};

function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConsentState;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.essential === "boolean" &&
      typeof parsed.ads === "boolean"
    ) {
      return parsed;
    }
  } catch (err) {
    console.error("[GoogleAdsLoader] Failed to parse consent:", err);
  }

  return null;
}

function loadGoogleAds() {
  if (typeof window === "undefined") return;
  if (!GOOGLE_ADS_ID) {
    console.warn(
      "[GoogleAdsLoader] GOOGLE_ADS_ID not set. Ads script will not load."
    );
    return;
  }

  // Prevent loading twice
  if (window._ampAdsLoaded) return;
  window._ampAdsLoaded = true;

  // 1) External gtag script
  const existingScript = document.querySelector(
    `script[src*="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}"]`
  );
  if (!existingScript) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(s);
  }

  // 2) Init dataLayer + gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(this: any, ...args: any[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GOOGLE_ADS_ID);
}

export default function GoogleAdsLoader() {
  useEffect(() => {
    // 1) On mount, check existing consent
    const consent = readConsent();
    if (consent?.ads) {
      loadGoogleAds();
    }

    // 2) Listen for consent changes from CookieBanner
    const onConsentChange = (event: Event) => {
      try {
        const custom = event as CustomEvent<ConsentState>;
        if (custom.detail?.ads) {
          loadGoogleAds();
        }
      } catch (err) {
        console.error("[GoogleAdsLoader] consent change handling error:", err);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("amp_cookie_consent_changed", onConsentChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "amp_cookie_consent_changed",
          onConsentChange
        );
      }
    };
  }, []);

  // Nothing visual to render
  return null;
}
