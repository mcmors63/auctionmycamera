// app/dashboard/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Client, Account, Databases, Storage, ID, Query } from "appwrite";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

// -----------------------------
// Appwrite (browser)
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// -----------------------------
// ENV (Listings + Profiles + Transactions)
// -----------------------------
const LISTINGS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const LISTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// ✅ IMPORTANT: Dashboard must use the SAME env vars as registration.
const PROFILES_DB_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID || "").trim();
const PROFILES_COLLECTION_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || "").trim();

// Transactions are optional in AuctionMyCamera for now
const TX_DB_ID = LISTINGS_DB_ID;
const TX_COLLECTION_ID = "transactions";

// Optional admin email (so we can redirect admins cleanly)
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk").trim().toLowerCase();

// -----------------------------
// Types
// -----------------------------
type Profile = {
  $id: string;
  first_name?: string;
  surname?: string;
  house?: string;
  street?: string;
  town?: string;
  county?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  userId?: string;
};

type Listing = {
  $id: string;

  registration?: string;

  item_title?: string | null;
  gear_type?: string | null;
  era?: string | null;
  condition?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;

  reserve_price: number;
  starting_price?: number;
  buy_now?: number;

  status: string;
  seller_email?: string;
  sellerEmail?: string;

  auction_start?: string | null;
  auction_end?: string | null;

  relist_until_sold?: boolean;
  withdraw_after_current?: boolean;

  current_bid?: number;
};

type Transaction = {
  $id: string;
  listing_id?: string;
  registration?: string;

  seller_email?: string;
  buyer_email?: string;
  buyer_id?: string;

  sale_price?: number;
  commission_amount?: number;
  commission_rate?: number;
  seller_payout?: number;

  payment_status?: string; // pending | paid
  transaction_status?: string; // dispatch_pending | receipt_pending | complete

  stripe_payment_intent_id?: string;

  created_at?: string;
  updated_at?: string;

  // Delivery snapshot (from scheduler)
  delivery_first_name?: string;
  delivery_surname?: string;
  delivery_house?: string;
  delivery_street?: string;
  delivery_town?: string;
  delivery_county?: string;
  delivery_postcode?: string;
  delivery_phone?: string;

  // Seller dispatch fields
  seller_dispatch_status?: string; // pending | sent
  seller_dispatch_carrier?: string;
  seller_dispatch_tracking?: string;
  seller_dispatch_note?: string;
  seller_dispatched_at?: string;

  // Buyer receipt fields
  buyer_receipt_status?: string; // pending | confirmed
  buyer_received_at?: string;

  // Optional payout flag
  payout_status?: string;
};

// -----------------------------
// Helpers
// -----------------------------
function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(n: number) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isAwaitingStatus(s: string) {
  const x = (s || "").toLowerCase();
  return x === "pending" || x === "pending_approval" || x === "awaiting_approval";
}

function isQueuedStatus(s: string) {
  const x = (s || "").toLowerCase();
  return x === "queued" || x === "approved" || x === "approved_queued" || x === "approvedqueued";
}

function isLiveStatus(s: string) {
  const x = (s || "").toLowerCase();
  return x === "live" || x === "active";
}

function isHistoryStatus(s: string) {
  const x = (s || "").toLowerCase();
  return x === "sold" || x === "not_sold" || x === "ended" || x === "completed" || x === "complete";
}

function isFinishedTransaction(tx: Transaction) {
  const t = (tx.transaction_status || "").toLowerCase();
  return t === "complete" || t === "completed";
}

function listingTitle(l: Listing) {
  return safeStr(l.item_title) || safeStr((l as any).title) || safeStr(l.registration) || "Untitled listing";
}

function listingSubtitle(l: Listing) {
  const bits = [safeStr(l.brand), safeStr(l.model), safeStr(l.gear_type), safeStr(l.condition)]
    .filter(Boolean)
    .slice(0, 3);
  return bits.length ? bits.join(" • ") : "Camera listing";
}

function formatLondon(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
  } catch {
    return "—";
  }
}

function fmtAddressLines(tx: Transaction) {
  const name = [safeStr(tx.delivery_first_name), safeStr(tx.delivery_surname)].filter(Boolean).join(" ").trim();
  const l1 = [safeStr(tx.delivery_house), safeStr(tx.delivery_street)].filter(Boolean).join(" ").trim();
  const l2 = [safeStr(tx.delivery_town), safeStr(tx.delivery_county)].filter(Boolean).join(", ").trim();
  const pc = safeStr(tx.delivery_postcode);
  const phone = safeStr(tx.delivery_phone);

  const lines = [name, l1, l2, pc].filter(Boolean);
  return { lines, phone };
}

function txStatusLabel(tx: Transaction) {
  const p = (tx.payment_status || "").toLowerCase();
  const s = (tx.transaction_status || "").toLowerCase();

  if (p !== "paid") return "Payment pending";
  if (s === "dispatch_pending" || s === "pending" || s === "pending_documents") return "Awaiting dispatch";
  if (s === "receipt_pending" || s === "dispatch_sent") return "In transit";
  if (s === "complete" || s === "completed") return "Complete";
  return tx.transaction_status || tx.payment_status || "Pending";
}

// -----------------------------
// Component
// -----------------------------
export default function DashboardPage() {
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<
    | "profile"
    | "sell"
    | "awaiting"
    | "approvedQueued"
    | "live"
    | "sold"
    | "purchased"
    | "history"
    | "transactions"
  >("sell");

  // Auth + profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Loading + feedback
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  // Listings
  const [awaitingListings, setAwaitingListings] = useState<Listing[]>([]);
  const [queuedListings, setQueuedListings] = useState<Listing[]>([]);
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);

  // Transactions (optional)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Sell form (camera)
  const [sellForm, setSellForm] = useState({
    item_title: "",
    gear_type: "",
    brand: "",
    model: "",
    era: "",
    condition: "",
    description: "",
    reserve_price: "",
    starting_price: "",
    buy_now: "",
    owner_confirmed: false,
    agreed_terms: false,
    relist_until_sold: false,
  });

  // Photo (dashboard sell)
  const [sellPhoto, setSellPhoto] = useState<File | null>(null);
  const [sellPhotoPreview, setSellPhotoPreview] = useState<string | null>(null);

  // Fee preview
  const [commissionRate, setCommissionRate] = useState(0);
  const [commissionValue, setCommissionValue] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(0);

  const [sellError, setSellError] = useState("");
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ Dispatch form state keyed by txId (seller)
  const [dispatchForms, setDispatchForms] = useState<
    Record<string, { carrier: string; tracking: string; note: string; saving: boolean; error: string }>
  >({});

  // ✅ Withdraw state (queued listings)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const userEmail = user?.email ?? null;

  // -----------------------------
  // Honor ?tab=transactions from email links
  // -----------------------------
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const tab = (params.get("tab") || "").trim();
      const allowed = new Set([
        "profile",
        "sell",
        "awaiting",
        "approvedQueued",
        "live",
        "sold",
        "purchased",
        "history",
        "transactions",
      ]);
      if (allowed.has(tab)) setActiveTab(tab as any);
    } catch {
      // ignore
    }
  }, []);

  // -----------------------------
  // Derived transaction groups
  // -----------------------------
  const soldTransactions = useMemo(() => {
    if (!userEmail) return [];
    return transactions.filter((tx) => tx.seller_email === userEmail && isFinishedTransaction(tx));
  }, [transactions, userEmail]);

  const purchasedTransactions = useMemo(() => {
    if (!userEmail) return [];
    return transactions.filter((tx) => tx.buyer_email === userEmail && isFinishedTransaction(tx));
  }, [transactions, userEmail]);

  const activeTransactions = useMemo(() => {
    if (!userEmail) return [];
    return transactions
      .filter((tx) => tx.seller_email === userEmail || tx.buyer_email === userEmail)
      .filter((tx) => !isFinishedTransaction(tx));
  }, [transactions, userEmail]);

  const historyListings = useMemo(() => {
    return allListings.filter((l) => isHistoryStatus(l.status));
  }, [allListings]);

  // -----------------------------
  // Helper: refresh listings for current user
  // -----------------------------
  async function refreshMyListings(email: string) {
    const results: Listing[] = [];

    try {
      const r1 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("seller_email", email),
      ]);
      results.push(...((r1.documents || []) as any));
    } catch {}

    try {
      const r2 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("sellerEmail", email),
      ]);
      results.push(...((r2.documents || []) as any));
    } catch {}

    const byId = new Map<string, Listing>();
    for (const d of results) if (d?.$id && !byId.has(d.$id)) byId.set(d.$id, d);

    const docs = Array.from(byId.values());

    setAllListings(docs);
    setAwaitingListings(docs.filter((l) => isAwaitingStatus(l.status)));
    setQueuedListings(docs.filter((l) => isQueuedStatus(l.status)));
    setLiveListings(docs.filter((l) => isLiveStatus(l.status)));
  }

  // -----------------------------
  // Load dashboard (auth gated)
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setInitialLoading(true);
      setBannerError("");
      setBannerSuccess("");

      if (!PROFILES_DB_ID || !PROFILES_COLLECTION_ID) {
        setBannerError(
          "Dashboard misconfigured: missing NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID or NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID."
        );
        setInitialLoading(false);
        return;
      }

      // 1) AUTH
      let current: any;
      try {
        current = await account.get();
      } catch (err) {
        console.warn("Dashboard auth error:", err);
        router.push("/login");
        return;
      }

      if (!current?.$id) {
        router.push("/login");
        return;
      }

      const emailLower = String(current.email || "").toLowerCase();
      if (emailLower && emailLower === ADMIN_EMAIL) {
        router.push("/admin");
        return;
      }

      if (!current.emailVerification) {
        router.push("/resend-verification");
        return;
      }

      if (cancelled) return;
      setUser(current);

      // 2) PROFILE (strict env + fallback search)
      try {
        const prof = await databases.getDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, current.$id);
        if (!cancelled) setProfile(prof as any);
      } catch {
        try {
          const found: any[] = [];

          try {
            const rByUserId = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
              Query.equal("userId", current.$id),
              Query.limit(1),
            ]);
            found.push(...(rByUserId.documents || []));
          } catch {}

          if (found.length === 0) {
            try {
              const rByEmail = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
                Query.equal("email", current.email),
                Query.limit(1),
              ]);
              found.push(...(rByEmail.documents || []));
            } catch {}
          }

          if (!cancelled) setProfile(found[0] ? (found[0] as any) : null);
        } catch {
          if (!cancelled) setProfile(null);
        }
      }

      // 3) LISTINGS
      try {
        await refreshMyListings(current.email);
      } catch (e) {
        console.error("Listings load failed:", e);
        if (!cancelled) setBannerError("Failed to load your listings. Please refresh.");
      }

      // 4) TRANSACTIONS (optional, non-fatal)
      try {
        if (TX_DB_ID && TX_COLLECTION_ID) {
          const combined: Transaction[] = [];

          try {
            const txSeller = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
              Query.equal("seller_email", current.email),
            ]);
            combined.push(...((txSeller.documents || []) as any));
          } catch {}

          try {
            const txBuyer = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
              Query.equal("buyer_email", current.email),
            ]);
            combined.push(...((txBuyer.documents || []) as any));
          } catch {}

          const byId = new Map<string, Transaction>();
          combined.forEach((tx) => {
            if (tx?.$id && !byId.has(tx.$id)) byId.set(tx.$id, tx);
          });

          if (!cancelled) setTransactions(Array.from(byId.values()));
        }
      } catch {
        // ignore
      }

      if (!cancelled) setInitialLoading(false);
    };

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // -----------------------------
  // Auto logout after 10 minutes
  // -----------------------------
  useEffect(() => {
    let timeout: any;

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await account.deleteSession("current");
        } catch {}
        alert("Logged out due to inactivity.");
        router.push("/login");
      }, 10 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (timeout) clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [router]);

  // -----------------------------
  // Profile editing
  // -----------------------------
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
    setBannerError("");
    setBannerSuccess("");
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setBannerError("");
    setBannerSuccess("");

    try {
      await databases.updateDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profile.$id, {
        first_name: profile.first_name || "",
        surname: profile.surname || "",
        house: profile.house || "",
        street: profile.street || "",
        town: profile.town || "",
        county: profile.county || "",
        postcode: profile.postcode || "",
        phone: profile.phone || "",
      });
      setBannerSuccess("Profile updated.");
    } catch {
      setBannerError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // -----------------------------
  // Password change
  // -----------------------------
  const validateNewPassword = (pwd: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (!validateNewPassword(newPassword)) {
      setPasswordError("Password must be 8+ chars including letters & numbers.");
      return;
    }

    const doUpdate = async () => {
      setPasswordLoading(true);
      try {
        await account.updatePassword(newPassword, currentPassword);
        setPasswordSuccess("Password updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        setPasswordError(err?.message || "Error updating password.");
      } finally {
        setPasswordLoading(false);
      }
    };

    void doUpdate();
  };

  // -----------------------------
  // Logout
  // -----------------------------
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch {}
    router.push("/login");
  };

  // -----------------------------
  // Transaction action helper (JWT-auth)
  // -----------------------------
  async function postTxAction(path: string, body: any) {
    const jwt = await account.createJWT();
    const token = (jwt as any)?.jwt || "";

    if (!token) {
      throw new Error("Could not create auth token. Please log out and log in again.");
    }

    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body || {}),
    });

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Request failed.");
    }
    return data;
  }

  // -----------------------------
  // Listing action helper (JWT-auth)
  // -----------------------------
  async function postListingAction(path: string, body: any) {
    const jwt = await account.createJWT();
    const token = (jwt as any)?.jwt || "";

    if (!token) {
      throw new Error("Could not create auth token. Please log out and log in again.");
    }

    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body || {}),
    });

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Request failed.");
    }
    return data;
  }

  // -----------------------------
  // Delete account
  // -----------------------------
  const handleDeleteAccount = async () => {
    if (!user) return;

    const sure = window.confirm(
      "Are you sure you want to delete your account?\n\n" +
        "This will remove your login and personal details from AuctionMyCamera.\n\n" +
        "You CANNOT delete your account if:\n" +
        "• You have an active listing (awaiting approval / queued / live)\n" +
        "• You have any transactions still in progress"
    );

    if (!sure) return;

    setDeleteError("");
    setDeleteLoading(true);

    try {
      const hasActiveListing = allListings.some((l) =>
        ["pending", "pending_approval", "queued", "approved", "live", "active"].includes((l.status || "").toLowerCase())
      );

      if (hasActiveListing) {
        setDeleteError(
          "You still have an active listing (awaiting approval / queued / live). " +
            "Wait until it has finished before deleting your account."
        );
        setDeleteLoading(false);
        return;
      }

      if (activeTransactions.length > 0) {
        setDeleteError(
          "You have transactions still in progress. Once all sales and purchases are completed, you can delete your account."
        );
        setDeleteLoading(false);
        return;
      }

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.$id, email: user.email }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || (data as any).error) {
        setDeleteError((data as any).error || "Failed to delete account. Please try again.");
        setDeleteLoading(false);
        return;
      }

      alert("Your account has been deleted. Thank you for using AuctionMyCamera.");
      router.push("/");
    } catch (err: any) {
      console.error("delete-account error", err);
      setDeleteError(err?.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // -----------------------------
  // Fee preview
  // -----------------------------
  const calculateFees = (reserve: number) => {
    let commission = 0;

    if (reserve <= 4999.99) commission = 10;
    else if (reserve <= 9999.99) commission = 8;
    else if (reserve <= 24999.99) commission = 7;
    else if (reserve <= 49999.99) commission = 6;
    else commission = 5;

    const commissionAmount = (reserve * commission) / 100;
    const expected = reserve - commissionAmount;

    setCommissionRate(commission);
    setCommissionValue(isNaN(commissionAmount) ? 0 : commissionAmount);
    setExpectedReturn(isNaN(expected) ? 0 : expected);
  };

  // -----------------------------
  // Sell form handlers
  // -----------------------------
  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const { name, value, type } = target;

    let val: any;
    if (type === "checkbox") val = (target as HTMLInputElement).checked;
    else if (type === "number") val = value === "" ? "" : Number(value);
    else val = value;

    setSellForm((prev) => ({ ...prev, [name]: val }));
    setSellError("");

    if (name === "reserve_price") {
      const num = parseFloat(String(value));
      if (!isNaN(num)) calculateFees(num);
      else {
        setCommissionRate(0);
        setCommissionValue(0);
        setExpectedReturn(0);
      }
    }
  };

  // -----------------------------
  // Upload photo for dashboard sell
  // -----------------------------
  async function uploadDashboardPhotoIfProvided(): Promise<string | null> {
    if (!sellPhoto) return null;

    const bucketId = (process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "").trim();

    if (!bucketId) {
      alert("Camera image bucket not configured.");
      return null;
    }

    try {
      const file = await storage.createFile(bucketId, ID.unique(), sellPhoto);
      return file.$id;
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Failed to upload image.");
      return null;
    }
  }

  // -----------------------------
  // Create listing via /api/listings (JWT auth)
  // -----------------------------
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSellError("");

    if (!user) {
      setSellError("Your session has expired. Please log in again.");
      router.push("/login");
      return;
    }

    const title = safeStr(sellForm.item_title);
    const reserve = parseFloat(String(sellForm.reserve_price));
    const starting = sellForm.starting_price === "" ? 0 : parseFloat(String(sellForm.starting_price));
    const buyNow = sellForm.buy_now === "" ? 0 : parseFloat(String(sellForm.buy_now));

    if (!title) {
      setSellError("Item title is required.");
      return;
    }

    if (isNaN(reserve) || reserve < 10) {
      setSellError("Minimum reserve price is £10.");
      return;
    }

    if (!isNaN(starting) && starting > 0 && starting >= reserve) {
      setSellError("Starting price must be lower than the reserve price.");
      return;
    }

    if (!isNaN(buyNow) && buyNow > 0) {
      const minBuyNow = Math.max(reserve, !isNaN(starting) && starting > 0 ? starting : 0);
      if (buyNow < minBuyNow) {
        setSellError("Buy Now price cannot be lower than your reserve price or starting price.");
        return;
      }
    }

    if (!sellForm.owner_confirmed) {
      setSellError("You must confirm you own the item or have authority to sell it.");
      return;
    }

    if (!sellForm.agreed_terms) {
      setSellError("You must agree to the Terms & Conditions.");
      return;
    }

    setSellSubmitting(true);

    try {
      const jwt = await account.createJWT();
      const token = (jwt as any)?.jwt || "";

      if (!token) {
        setSellError("Could not create auth token. Please log out and log in again.");
        setSellSubmitting(false);
        return;
      }

      const uploadedImageId = await uploadDashboardPhotoIfProvided();

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_title: title,
          gear_type: safeStr(sellForm.gear_type),
          brand: safeStr(sellForm.brand),
          model: safeStr(sellForm.model),
          era: safeStr(sellForm.era),
          condition: safeStr(sellForm.condition),
          description: safeStr(sellForm.description),

          reserve_price: reserve,
          starting_price: !isNaN(starting) ? starting : 0,
          buy_now: !isNaN(buyNow) ? buyNow : 0,

          image_id: uploadedImageId,

          relist_until_sold: !!sellForm.relist_until_sold,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        setSellError(data?.error || "Failed to create listing. Please try again.");
        setSellSubmitting(false);
        return;
      }

      // Refresh listings
      try {
        await refreshMyListings(user.email);
      } catch {}

      alert("Listing submitted! Awaiting approval.");
      setSellPhoto(null);
      setSellPhotoPreview(null);
      setSellForm({
        item_title: "",
        gear_type: "",
        brand: "",
        model: "",
        era: "",
        condition: "",
        description: "",
        reserve_price: "",
        starting_price: "",
        buy_now: "",
        owner_confirmed: false,
        agreed_terms: false,
        relist_until_sold: false,
      });

      setCommissionRate(0);
      setCommissionValue(0);
      setExpectedReturn(0);
    } catch (err: any) {
      console.error("Create listing error:", err);
      setSellError(err?.message || "Failed to create listing. Please try again.");
    } finally {
      setSellSubmitting(false);
    }
  };

  // -----------------------------
  // Withdraw queued listing (server route)
  // -----------------------------
  async function withdrawQueuedListing(listingId: string) {
    if (!user?.email) return;

    const listing = queuedListings.find((x) => x.$id === listingId);
    const title = listing ? listingTitle(listing) : "this listing";

    const sure = window.confirm(
      `Withdraw "${title}" from the upcoming auction?\n\nThis will remove it from the queued auction cycle.`
    );
    if (!sure) return;

    const reason = (window.prompt("Optional reason (shown to admin only if stored):", "") || "").trim();

    try {
      setBannerError("");
      setBannerSuccess("");
      setWithdrawingId(listingId);

      await postListingAction("/api/listings/withdraw-queued", {
        listingId,
        reason,
      });

      setBannerSuccess("Withdrawn — it’s no longer queued for auction.");
      await refreshMyListings(user.email);
    } catch (e: any) {
      setBannerError(e?.message || "Failed to withdraw listing.");
    } finally {
      setWithdrawingId(null);
    }
  }

  // -----------------------------
  // Loading screen
  // -----------------------------
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <p className="text-neutral-200 text-lg">Loading your dashboard…</p>
      </div>
    );
  }

  // -----------------------------
  // UI styles (camera theme)
  // -----------------------------
  const accentText = "text-sky-300";
  const accentBorder = "border-sky-700/50";
  const accentBgSoft = "bg-sky-500/10";
  const primaryBtn = "bg-sky-600 hover:bg-sky-700 text-white";
  const dangerBtn = "bg-rose-600 hover:bg-rose-700 text-white";

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="min-h-screen bg-neutral-950 py-8 px-4 text-neutral-100">
      <div className={`max-w-6xl mx-auto bg-neutral-900/60 rounded-2xl shadow-lg p-6 border ${accentBorder}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${accentText}`}>My Dashboard</h1>
            <p className="text-sm text-neutral-300 mt-1">
              Welcome, <span className="font-semibold">{profile?.first_name || user?.name || "User"}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center self-start md:self-auto">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-rose-500/70 text-rose-200 hover:bg-rose-900/30 transition"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Banners */}
        {bannerError && (
          <div className="flex items-center gap-2 bg-rose-900/30 text-rose-200 p-3 rounded-md mb-4 border border-rose-700/70">
            <XCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerError}</span>
          </div>
        )}
        {bannerSuccess && (
          <div className="flex items-center gap-2 bg-emerald-900/25 text-emerald-200 p-3 rounded-md mb-4 border border-emerald-700/50">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerSuccess}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-2 mb-6">
          {[
            ["profile", "Personal Details"],
            ["sell", "Sell an Item"],
            ["awaiting", "Awaiting Approval"],
            ["approvedQueued", "Approved / Queued"],
            ["live", "Live Listings"],
            ["sold", "Sold"],
            ["purchased", "Purchased"],
            ["history", "History"],
            ["transactions", "Transactions"],
          ].map(([key, label]) => {
            const k = key as any;
            const active = activeTab === k;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(k)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-md border-b-4 transition ${
                  active
                    ? `border-sky-400 ${accentText} ${accentBgSoft}`
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold ${accentText}`}>Personal Details</h2>

            {!profile ? (
              <p className="text-neutral-300">
                No profile found for your account.
                <br />
                This usually means your dashboard is pointing at a different Appwrite database/collection than your
                registration.
                <br />
                Check your env vars: <strong>NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID</strong> and{" "}
                <strong>NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID</strong>.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["first_name", "First Name"],
                    ["surname", "Surname"],
                    ["house", "House"],
                    ["street", "Street"],
                    ["town", "Town / City"],
                    ["county", "County"],
                    ["postcode", "Postcode"],
                    ["phone", "Phone"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">{label}</label>
                      <input
                        type="text"
                        name={key}
                        value={(profile as any)[key] || ""}
                        onChange={handleProfileChange}
                        className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">Email (login)</label>
                    <input
                      type="email"
                      value={profile.email || user?.email || ""}
                      disabled
                      className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/60 text-neutral-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className={`mt-2 ${primaryBtn} font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50`}
                >
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>

                {/* Change Password */}
                <div className="mt-10 border-t border-neutral-800 pt-6">
                  <h3 className={`text-lg font-semibold mb-3 ${accentText}`}>Change Password</h3>

                  {passwordError && (
                    <p className="bg-rose-900/30 text-rose-200 text-sm rounded-md px-3 py-2 mb-3 border border-rose-700/70">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="bg-emerald-900/25 text-emerald-200 text-sm rounded-md px-3 py-2 mb-3 border border-emerald-700/50">
                      {passwordSuccess}
                    </p>
                  )}

                  <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Must include letters &amp; numbers, min 8 characters.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className={`${primaryBtn} font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50`}
                      >
                        {passwordLoading ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>

                  <p className="mt-3 text-sm text-neutral-300">
                    Need to update your saved card?
                    <Link href="/payment-method" className="ml-1 text-sky-300 underline hover:text-sky-200">
                      Manage Payment Method
                    </Link>
                  </p>
                </div>

                {/* Delete Account */}
                <div className="mt-10 border-t border-neutral-800 pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-rose-300">Delete Account</h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Deleting your account will permanently remove your login and personal details from AuctionMyCamera.
                    <br />
                    <strong>You cannot delete your account if:</strong>
                  </p>
                  <ul className="text-xs text-neutral-400 list-disc ml-5 mb-3">
                    <li>You have a listing awaiting approval, queued, or live.</li>
                    <li>You have any transactions still in progress.</li>
                  </ul>

                  {deleteError && (
                    <p className="bg-rose-900/30 text-rose-200 text-xs rounded-md px-3 py-2 mb-3 border border-rose-700/70">
                      {deleteError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className={`px-4 py-2 rounded-md ${dangerBtn} text-xs font-semibold disabled:opacity-50`}
                  >
                    {deleteLoading ? "Deleting…" : "Delete my account"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SELL TAB */}
        {activeTab === "sell" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className={`text-xl font-bold ${accentText}`}>Sell an Item</h2>
              <p className="text-xs text-neutral-400">
                Submit your listing for approval. Fees only apply if your item sells.
              </p>
            </div>

            {sellError && (
              <p className="bg-rose-900/30 text-rose-200 text-sm rounded-md px-3 py-2 mb-2 border border-rose-700/70">
                {sellError}
              </p>
            )}

            <form onSubmit={handleSellSubmit} className="space-y-5">
              {/* Item basics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Item title</label>
                  <input
                    name="item_title"
                    value={sellForm.item_title}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. Canon EOS R6 Mark II body"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Gear type</label>
                  <select
                    name="gear_type"
                    value={sellForm.gear_type}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select type</option>
                    <option value="camera">Camera</option>
                    <option value="lens">Lens</option>
                    <option value="film_camera">Film camera</option>
                    <option value="accessory">Accessory</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Brand (optional)</label>
                  <input
                    name="brand"
                    value={sellForm.brand}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. Canon"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Model (optional)</label>
                  <input
                    name="model"
                    value={sellForm.model}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. R6 Mark II"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Era (optional)</label>
                  <input
                    name="era"
                    value={sellForm.era}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g. Modern / Vintage / 1980s"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Condition (optional)</label>
                  <select
                    name="condition"
                    value={sellForm.condition}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select condition</option>
                    <option value="new">New</option>
                    <option value="like_new">Like new</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="spares_repairs">Spares / repairs</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Description (optional)</label>
                <textarea
                  name="description"
                  value={sellForm.description}
                  onChange={handleSellChange}
                  className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm min-h-[90px] bg-neutral-950/40 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="What’s included, condition details, any marks, shutter count, lens fungus, etc."
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-1">Photo (optional)</label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSellPhoto(file);

                    if (file) {
                      const url = URL.createObjectURL(file);
                      setSellPhotoPreview(url);
                    } else {
                      setSellPhotoPreview(null);
                    }
                  }}
                  className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100"
                />

                {sellPhotoPreview && (
                  <div className="mt-3">
                    <img
                      src={sellPhotoPreview}
                      alt="Preview"
                      className="h-40 rounded-lg border border-neutral-700 object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Reserve Price (£)</label>
                  <input
                    type="number"
                    name="reserve_price"
                    value={sellForm.reserve_price}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Starting Price (£) (optional)
                  </label>
                  <input
                    type="number"
                    name="starting_price"
                    value={sellForm.starting_price}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Buy Now Price (£) (optional)
                  </label>
                  <input
                    type="number"
                    name="buy_now"
                    value={sellForm.buy_now}
                    onChange={handleSellChange}
                    className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    min={0}
                  />
                </div>
              </div>

              {/* Fee preview */}
              <div className={`mt-4 p-4 ${accentBgSoft} border ${accentBorder} rounded-md space-y-2`}>
                <h3 className="text-sm font-semibold text-sky-200">
                  Fees &amp; Expected Return (based on your reserve)
                </h3>

                <p className="text-xs text-neutral-200">
                  <strong>Commission rate:</strong> {commissionRate}% (estimate)
                </p>
                <p className="text-xs text-neutral-200">
                  <strong>Estimated commission:</strong> £{formatMoney(commissionValue)}
                </p>
                <p className="text-xs text-neutral-200">
                  <strong>Estimated you receive:</strong> £{formatMoney(expectedReturn)} (based on reserve)
                </p>

                <p className="text-[11px] text-neutral-400">
                  This is a simple preview. Final commission is based on the final sale price.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 text-xs text-neutral-300">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="owner_confirmed"
                    checked={sellForm.owner_confirmed}
                    onChange={handleSellChange}
                    className="mt-1 accent-sky-500"
                  />
                  <span>I confirm I own this item (or have authority to sell it) and my description is accurate.</span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="agreed_terms"
                    checked={sellForm.agreed_terms}
                    onChange={handleSellChange}
                    className="mt-1 accent-sky-500"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" className="text-sky-300 underline" target="_blank" rel="noreferrer">
                      Terms &amp; Conditions
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="relist_until_sold"
                    checked={sellForm.relist_until_sold}
                    onChange={handleSellChange}
                    className="mt-1 accent-sky-500"
                  />
                  <span>
                    Relist automatically in the next weekly auction if it doesn’t sell.
                    <br />
                    <span className="text-xs text-neutral-500">
                      You can switch this off later for new listings once we add listing edit controls.
                    </span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={sellSubmitting}
                className={`mt-2 ${primaryBtn} font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50`}
              >
                {sellSubmitting ? "Submitting…" : "Submit for approval"}
              </button>
            </form>
          </div>
        )}

        {/* AWAITING TAB */}
        {activeTab === "awaiting" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Awaiting Approval</h2>
            <p className="text-sm text-neutral-300 mb-2">These listings are waiting for the admin team to review.</p>

            {awaitingListings.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">You have no listings awaiting approval.</p>
            ) : (
              <div className="grid gap-4">
                {awaitingListings.map((l) => (
                  <div key={l.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className={`text-lg font-bold ${accentText}`}>{listingTitle(l)}</h3>
                        <p className="text-xs text-neutral-400">{listingSubtitle(l)}</p>
                        <p className="text-xs text-neutral-500 mt-1">Status: Pending review</p>
                      </div>

                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-950/60 text-neutral-200 border border-neutral-800">
                        Awaiting Approval
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-neutral-200 mt-2">
                      <p>
                        <strong>Reserve:</strong> £{toNum(l.reserve_price).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Starting:</strong> £{toNum(l.starting_price, 0).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Buy Now:</strong>{" "}
                        {toNum(l.buy_now, 0) > 0 ? `£${toNum(l.buy_now).toLocaleString("en-GB")}` : "Not set"}
                      </p>
                    </div>

                    {safeStr(l.description) && (
                      <p className="mt-2 text-xs text-neutral-400">
                        <strong>Description:</strong> {safeStr(l.description)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPROVED / QUEUED TAB */}
        {activeTab === "approvedQueued" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Approved / Queued</h2>
            <p className="text-sm text-neutral-300 mb-1">
              These listings are approved and queued for the next weekly auction.
            </p>
            <p className="text-xs text-neutral-400">
              You currently have <strong>{queuedListings.length}</strong> queued.
            </p>

            {queuedListings.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center mt-4">
                You have no approved listings waiting for the next auction.
              </p>
            ) : (
              <div className="grid gap-4 mt-2">
                {queuedListings.map((l) => (
                  <div key={l.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className={`text-xl font-bold ${accentText}`}>{listingTitle(l)}</h3>
                        <p className="text-xs text-neutral-400">{listingSubtitle(l)}</p>
                        <p className="text-xs text-neutral-500 mt-1">Status: Approved / queued</p>
                      </div>

                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-sky-900/20 text-sky-200 border border-sky-700/40">
                        Queued
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-neutral-200 mb-2">
                      <p>
                        <strong>Reserve:</strong> £{toNum(l.reserve_price).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Starting:</strong> £{toNum(l.starting_price, 0).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Buy Now:</strong>{" "}
                        {toNum(l.buy_now, 0) > 0 ? `£${toNum(l.buy_now).toLocaleString("en-GB")}` : "Not set"}
                      </p>
                    </div>

                    <div className="mt-3 text-xs text-neutral-400 space-y-1">
                      <p>
                        <strong>Relist setting:</strong>{" "}
                        {l.relist_until_sold
                          ? "This item will be relisted automatically if it does not sell."
                          : "This item will not be automatically relisted."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`/listing/${l.$id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-md bg-neutral-950/60 hover:bg-neutral-950 text-neutral-100 text-sm font-semibold border border-neutral-800"
                      >
                        View public listing
                      </a>

                      <button
                        type="button"
                        onClick={() => withdrawQueuedListing(l.$id)}
                        disabled={withdrawingId === l.$id}
                        className="inline-flex items-center px-4 py-2 rounded-md bg-rose-900/30 hover:bg-rose-900/40 text-rose-200 text-sm font-semibold border border-rose-700/60 disabled:opacity-50"
                        title="Withdraw from the upcoming auction"
                      >
                        {withdrawingId === l.$id ? "Withdrawing…" : "Withdraw"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE TAB */}
        {activeTab === "live" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Live Listings</h2>
            <p className="text-sm text-neutral-300 mb-4">These listings are currently live in the auction.</p>

            {liveListings.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">You currently have no live listings.</p>
            ) : (
              <div className="grid gap-4">
                {liveListings.map((l) => (
                  <div key={l.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className={`text-xl font-bold ${accentText}`}>{listingTitle(l)}</h3>
                        <p className="text-xs text-neutral-400">{listingSubtitle(l)}</p>
                        <p className="text-xs text-neutral-500 mt-1">Status: Live</p>
                      </div>

                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-900/20 text-emerald-200 border border-emerald-700/40">
                        LIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-neutral-200 mb-2">
                      <p>
                        <strong>Current bid:</strong>{" "}
                        {typeof l.current_bid === "number"
                          ? `£${l.current_bid.toLocaleString("en-GB")}`
                          : "No bids yet"}
                      </p>
                      <p>
                        <strong>Reserve:</strong> £{toNum(l.reserve_price).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Buy Now:</strong>{" "}
                        {toNum(l.buy_now, 0) > 0 ? `£${toNum(l.buy_now).toLocaleString("en-GB")}` : "Not set"}
                      </p>
                    </div>

                    <div className="mt-3 text-xs text-neutral-400 space-y-1">
                      <p>
                        <strong>Relist setting:</strong>{" "}
                        {l.relist_until_sold
                          ? "This item will be relisted automatically if it does not sell."
                          : "This item will not be automatically relisted."}
                      </p>
                    </div>

                    <div className="mt-4">
                      <a
                        href={`/listing/${l.$id}`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 rounded-md bg-neutral-950/60 hover:bg-neutral-950 text-neutral-100 text-sm font-semibold border border-neutral-800"
                        rel="noreferrer"
                      >
                        View public listing
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SOLD TAB */}
        {activeTab === "sold" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Sold (You as Seller)</h2>
            <p className="text-sm text-neutral-300 mb-2">Completed sales where you were the seller.</p>

            {soldTransactions.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">You don&apos;t have any completed sales yet.</p>
            ) : (
              <div className="grid gap-4">
                {soldTransactions.map((tx) => (
                  <div key={tx.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`text-sm font-semibold ${accentText}`}>
                          {tx.registration || tx.listing_id || "Sale"}
                        </p>
                        <p className="text-xs text-neutral-400">Buyer: {tx.buyer_email || "Unknown"}</p>
                        <p className="text-xs text-neutral-500">Transaction ID: {tx.$id}</p>
                      </div>
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-900/20 text-emerald-200 border border-emerald-700/40">
                        COMPLETED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-neutral-200 mt-2">
                      <p>
                        <strong>Sale price:</strong> £{formatMoney(toNum(tx.sale_price, 0))}
                      </p>
                      <p>
                        <strong>Commission:</strong> £{formatMoney(toNum(tx.commission_amount, 0))}{" "}
                        <span className="text-xs text-neutral-400">({toNum(tx.commission_rate, 0)}%)</span>
                      </p>
                      <p>
                        <strong>Seller payout:</strong> £{formatMoney(toNum(tx.seller_payout, 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PURCHASED TAB */}
        {activeTab === "purchased" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Purchased (You as Buyer)</h2>
            <p className="text-sm text-neutral-300 mb-2">Completed purchases where you were the buyer.</p>

            {purchasedTransactions.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">You haven&apos;t completed any purchases yet.</p>
            ) : (
              <div className="grid gap-4">
                {purchasedTransactions.map((tx) => (
                  <div key={tx.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`text-sm font-semibold ${accentText}`}>
                          {tx.registration || tx.listing_id || "Purchase"}
                        </p>
                        <p className="text-xs text-neutral-400">Seller: {tx.seller_email || "Unknown"}</p>
                        <p className="text-xs text-neutral-500">Transaction ID: {tx.$id}</p>
                      </div>
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-900/20 text-emerald-200 border border-emerald-700/40">
                        COMPLETED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-200 mt-2">
                      <p>
                        <strong>Sale price:</strong> £{formatMoney(toNum(tx.sale_price, 0))}
                      </p>
                      <p>
                        <strong>Payment status:</strong> {tx.payment_status || "paid"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>History</h2>

            {historyListings.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">Ended, sold, and unsold auctions will appear here.</p>
            ) : (
              <div className="grid gap-5">
                {historyListings.map((l) => (
                  <div key={l.$id} className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className={`text-xl font-bold ${accentText}`}>{listingTitle(l)}</h3>
                        <p className="text-xs text-neutral-400">{listingSubtitle(l)}</p>
                      </div>

                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-950/60 text-neutral-200 border border-neutral-800">
                        {(l.status || "ENDED").toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-neutral-200">
                      <p>
                        <strong>Reserve:</strong> £{toNum(l.reserve_price, 0).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Highest bid:</strong> £{toNum(l.current_bid, 0).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Auction ended:</strong>{" "}
                        {l.auction_end ? new Date(l.auction_end).toLocaleString("en-GB") : "—"}
                      </p>
                    </div>

                    <p className="text-[11px] text-neutral-500 mt-3">
                      Relist controls will be added once the camera relist endpoint is wired up.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className={`text-xl font-bold mb-2 ${accentText}`}>Transactions</h2>
            <p className="text-sm text-neutral-300 mb-2">Active sales and purchases still in progress.</p>

            <div className="flex flex-wrap gap-3 text-xs text-neutral-200 mb-2">
              <span className="px-3 py-1 rounded-full bg-neutral-950/60 border border-neutral-800">
                As seller: <strong>{activeTransactions.filter((t) => t.seller_email === userEmail).length}</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-neutral-950/60 border border-neutral-800">
                As buyer: <strong>{activeTransactions.filter((t) => t.buyer_email === userEmail).length}</strong>
              </span>
            </div>

            {activeTransactions.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center">You don&apos;t have any active transactions right now.</p>
            ) : (
              <div className="grid gap-4">
                {activeTransactions.map((tx) => {
                  const txStatusLower = String(tx.transaction_status || "").toLowerCase();
                  const paymentLower = String(tx.payment_status || "").toLowerCase();

                  const isBuyer =
                    String(tx.buyer_email || "").toLowerCase() === String(userEmail || "").toLowerCase();
                  const isSeller =
                    String(tx.seller_email || "").toLowerCase() === String(userEmail || "").toLowerCase();

                  const isComplete = ["complete", "completed"].includes(txStatusLower);

                  const canDispatch =
                    isSeller &&
                    !isComplete &&
                    paymentLower === "paid" &&
                    ["dispatch_pending", "pending", "pending_documents", "dispatch_sent", "receipt_pending"].includes(
                      txStatusLower
                    );

                  // Buyer can only confirm after dispatch (receipt_pending / dispatch_sent)
                  const canConfirmReceived =
                    isBuyer &&
                    !isComplete &&
                    paymentLower === "paid" &&
                    ["receipt_pending", "dispatch_sent"].includes(txStatusLower);

                  const statusChip = txStatusLabel(tx);

                  const form =
                    dispatchForms[tx.$id] || { carrier: "", tracking: "", note: "", saving: false, error: "" };

                  const { lines: deliveryLines, phone: deliveryPhone } = fmtAddressLines(tx);

                  return (
                    <div key={tx.$id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className={`text-sm font-semibold ${accentText}`}>
                            {tx.registration || tx.listing_id || "Transaction"}
                          </p>
                          <p className="text-xs text-neutral-500">Transaction ID: {tx.$id}</p>
                          <p className="text-xs text-neutral-500">Role: {isSeller ? "Seller" : "Buyer"}</p>
                        </div>

                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-950/60 text-neutral-200 border border-neutral-800">
                          {statusChip.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-neutral-200 mt-2">
                        <p>
                          <strong>Sale price:</strong> £{formatMoney(toNum(tx.sale_price, 0))}
                        </p>
                        <p>
                          <strong>Commission:</strong> £{formatMoney(toNum(tx.commission_amount, 0))}
                        </p>
                        <p>
                          <strong>Payout:</strong> £{formatMoney(toNum(tx.seller_payout, 0))}
                        </p>
                      </div>

                      {/* Timeline */}
                      <div className="mt-3 text-[11px] text-neutral-400 border border-neutral-800 rounded-lg p-3 bg-neutral-950/40">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span
                            className={`px-2 py-1 rounded-md border ${
                              paymentLower === "paid"
                                ? "border-emerald-700/40 text-emerald-200"
                                : "border-neutral-700 text-neutral-300"
                            }`}
                          >
                            1) Paid
                          </span>
                          <span
                            className={`px-2 py-1 rounded-md border ${
                              txStatusLower === "receipt_pending" || txStatusLower === "dispatch_sent" || isComplete
                                ? "border-emerald-700/40 text-emerald-200"
                                : "border-neutral-700 text-neutral-300"
                            }`}
                          >
                            2) Dispatched
                          </span>
                          <span
                            className={`px-2 py-1 rounded-md border ${
                              isComplete ? "border-emerald-700/40 text-emerald-200" : "border-neutral-700 text-neutral-300"
                            }`}
                          >
                            3) Received
                          </span>
                        </div>
                      </div>

                      {/* Seller: show delivery address + dispatch form */}
                      {isSeller && paymentLower === "paid" && !isComplete && (
                        <div className="mt-4 border border-neutral-800 rounded-lg p-4 bg-neutral-950/30">
                          <h4 className="text-sm font-semibold text-neutral-100">Delivery details</h4>

                          {deliveryLines.length ? (
                            <div className="mt-2 text-sm text-neutral-200">
                              {deliveryLines.map((ln, i) => (
                                <div key={i}>{ln}</div>
                              ))}
                              {deliveryPhone && (
                                <div className="mt-1 text-xs text-neutral-400">Phone: {deliveryPhone}</div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-neutral-400">No delivery address snapshot found on this transaction yet.</p>
                          )}

                          <div className="mt-4">
                            <h5 className="text-sm font-semibold text-neutral-100">Confirm dispatch</h5>
                            <p className="text-xs text-neutral-400 mt-1">
                              Add the carrier and tracking number so the buyer can track delivery.
                            </p>

                            {form.error && (
                              <p className="mt-2 bg-rose-900/30 text-rose-200 text-xs rounded-md px-3 py-2 border border-rose-700/70">
                                {form.error}
                              </p>
                            )}

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1">Carrier</label>
                                <input
                                  value={form.carrier}
                                  onChange={(e) =>
                                    setDispatchForms((p) => ({
                                      ...p,
                                      [tx.$id]: { ...form, carrier: e.target.value, error: "" },
                                    }))
                                  }
                                  placeholder="e.g. Royal Mail"
                                  className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1">Tracking</label>
                                <input
                                  value={form.tracking}
                                  onChange={(e) =>
                                    setDispatchForms((p) => ({
                                      ...p,
                                      [tx.$id]: { ...form, tracking: e.target.value, error: "" },
                                    }))
                                  }
                                  placeholder="Tracking number"
                                  className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-neutral-400 mb-1">Note (optional)</label>
                                <input
                                  value={form.note}
                                  onChange={(e) =>
                                    setDispatchForms((p) => ({
                                      ...p,
                                      [tx.$id]: { ...form, note: e.target.value, error: "" },
                                    }))
                                  }
                                  placeholder="Any extra info"
                                  className="border border-neutral-700 rounded-md w-full px-3 py-2 text-sm bg-neutral-950/40 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={form.saving || !canDispatch}
                                onClick={async () => {
                                  try {
                                    setBannerError("");
                                    setBannerSuccess("");

                                    setDispatchForms((p) => ({
                                      ...p,
                                      [tx.$id]: { ...form, saving: true, error: "" },
                                    }));

                                    await postTxAction("/api/transactions/mark-dispatched", {
                                      txId: tx.$id,
                                      carrier: safeStr(form.carrier),
                                      tracking: safeStr(form.tracking),
                                      note: safeStr(form.note),
                                    });

                                    setBannerSuccess("Nice — marked as dispatched.");
                                    window.location.reload();
                                  } catch (e: any) {
                                    setDispatchForms((p) => ({
                                      ...p,
                                      [tx.$id]: {
                                        ...form,
                                        saving: false,
                                        error: e?.message || "Failed to confirm dispatch.",
                                      },
                                    }));
                                  }
                                }}
                                className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold disabled:opacity-50"
                              >
                                {form.saving ? "Saving…" : "Confirm dispatch"}
                              </button>

                              <span className="text-[11px] text-neutral-500">Dispatch time will be recorded automatically.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Buyer: show tracking info + confirm received */}
                      {isBuyer && paymentLower === "paid" && !isComplete && (
                        <div className="mt-4 border border-neutral-800 rounded-lg p-4 bg-neutral-950/30">
                          <h4 className="text-sm font-semibold text-neutral-100">Delivery updates</h4>

                          <div className="mt-2 text-sm text-neutral-200 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <p>
                              <strong>Carrier:</strong> {safeStr(tx.seller_dispatch_carrier) || "—"}
                            </p>
                            <p>
                              <strong>Tracking:</strong> {safeStr(tx.seller_dispatch_tracking) || "—"}
                            </p>
                            <p>
                              <strong>Dispatched:</strong>{" "}
                              {tx.seller_dispatched_at ? formatLondon(tx.seller_dispatched_at) : "—"}
                            </p>
                          </div>

                          {safeStr(tx.seller_dispatch_note) && (
                            <p className="mt-2 text-xs text-neutral-400">
                              <strong>Note:</strong> {safeStr(tx.seller_dispatch_note)}
                            </p>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canConfirmReceived}
                              onClick={async () => {
                                try {
                                  setBannerError("");
                                  setBannerSuccess("");
                                  await postTxAction("/api/transactions/confirm-received", { txId: tx.$id });
                                  setBannerSuccess("Thanks — marked as received.");
                                  window.location.reload();
                                } catch (e: any) {
                                  setBannerError(e?.message || "Failed to confirm receipt.");
                                }
                              }}
                              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              Confirm received
                            </button>

                            <span className="text-[11px] text-neutral-500">Only click this once you have the item.</span>
                          </div>
                        </div>
                      )}

                      {/* If complete, show timestamps */}
                      {isComplete && (
                        <div className="mt-4 text-xs text-neutral-400 border border-neutral-800 rounded-lg p-3 bg-neutral-950/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <strong>Dispatched:</strong>{" "}
                              {tx.seller_dispatched_at ? formatLondon(tx.seller_dispatched_at) : "—"}
                            </div>
                            <div>
                              <strong>Received:</strong> {tx.buyer_received_at ? formatLondon(tx.buyer_received_at) : "—"}
                            </div>
                            <div>
                              <strong>Payout status:</strong> {safeStr(tx.payout_status) || "—"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}