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

// -----------------------------
// ENV (Listings + Profiles + Transactions)
// -----------------------------
const LISTINGS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const LISTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// IMPORTANT: profiles should NOT silently point at listings unless you truly store profiles there.
// We keep your fallback, but the real fix is setting NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID correctly.
const PROFILES_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PROFILES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || "profiles";

// Transactions are optional in AuctionMyCamera for now
const TX_DB_ID = LISTINGS_DB_ID;
const TX_COLLECTION_ID = "transactions";

// Optional admin email (so we can redirect admins cleanly)
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

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
  userId?: string; // optional, but we’ll use it if your schema has it
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

  sale_price?: number;
  commission_amount?: number;
  commission_rate?: number;
  seller_payout?: number;

  payment_status?: string;
  transaction_status?: string;

  documents?: any[];
  created_at?: string;
  updated_at?: string;

  seller_docs_requested?: boolean;
  seller_docs_received?: boolean;
  buyer_info_requested?: boolean;
  buyer_info_received?: boolean;
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
  return x === "queued" || x === "approved" || x === "approved_queued";
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
  const p = (tx.payment_status || "").toLowerCase();
  return t === "complete" || t === "completed" || p === "paid";
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

function splitName(full: string) {
  const cleaned = safeStr(full);
  if (!cleaned) return { first: "", last: "" };
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

async function loadOrCreateProfileForUser(current: any): Promise<Profile | null> {
  const userId = String(current?.$id || "");
  const email = String(current?.email || "");
  if (!userId) return null;

  // 1) Fast path: doc id == userId
  try {
    const prof = await databases.getDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, userId);
    return prof as any;
  } catch {
    // fallthrough
  }

  // 2) Fallback: find by userId/email (works if your profile doc uses ID.unique())
  try {
    const queries = [
      Query.limit(1),
      // If your schema has userId, this will hit
      Query.equal("userId", userId),
    ];

    let found = null as any;

    try {
      const byUserId = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, queries);
      found = (byUserId.documents?.[0] as any) || null;
    } catch {
      // ignore if attribute doesn't exist
    }

    if (!found && email) {
      try {
        const byEmail = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
          Query.equal("email", email),
          Query.limit(1),
        ]);
        found = (byEmail.documents?.[0] as any) || null;
      } catch {
        // ignore
      }
    }

    if (found) return found as Profile;
  } catch {
    // ignore
  }

  // 3) Still nothing: create a profile doc with ID = userId so future loads always work
  // This requires your profiles collection permissions to allow the logged-in user to create/update their own doc.
  try {
    const { first, last } = splitName(String(current?.name || ""));
    const created = await databases.createDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, ID.custom(userId), {
      email: email || "",
      userId,
      first_name: first,
      surname: last,
      house: "",
      street: "",
      town: "",
      county: "",
      postcode: "",
      phone: "",
    });
    return created as any;
  } catch (e) {
    console.warn("Profile create failed (check collection permissions/schema):", e);
    return null;
  }
}

// -----------------------------
// Component
// -----------------------------
export default function DashboardPage() {
  const router = useRouter();

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

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  const [awaitingListings, setAwaitingListings] = useState<Listing[]>([]);
  const [queuedListings, setQueuedListings] = useState<Listing[]>([]);
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  const [sellPhoto, setSellPhoto] = useState<File | null>(null);
  const [sellPhotoPreview, setSellPhotoPreview] = useState<string | null>(null);

  const [commissionRate, setCommissionRate] = useState(0);
  const [commissionValue, setCommissionValue] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(0);

  const [sellError, setSellError] = useState("");
  const [sellSubmitting, setSellSubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userEmail = user?.email ?? null;

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
  // Load dashboard (auth gated)
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setInitialLoading(true);
      setBannerError("");
      setBannerSuccess("");

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

      // 2) PROFILE (robust)
      try {
        const prof = await loadOrCreateProfileForUser(current);
        if (!cancelled) setProfile(prof);
      } catch {
        if (!cancelled) setProfile(null);
      }

      // 3) LISTINGS
      try {
        const results: Listing[] = [];

        try {
          const r1 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            Query.equal("seller_email", current.email),
          ]);
          results.push(...((r1.documents || []) as any));
        } catch {}

        try {
          const r2 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            Query.equal("sellerEmail", current.email),
          ]);
          results.push(...((r2.documents || []) as any));
        } catch {}

        const byId = new Map<string, Listing>();
        for (const d of results) if (d?.$id && !byId.has(d.$id)) byId.set(d.$id, d);

        const docs = Array.from(byId.values());

        if (!cancelled) {
          setAllListings(docs);
          setAwaitingListings(docs.filter((l) => isAwaitingStatus(l.status)));
          setQueuedListings(docs.filter((l) => isQueuedStatus(l.status)));
          setLiveListings(docs.filter((l) => isLiveStatus(l.status)));
        }
      } catch (e) {
        console.error("Listings load failed:", e);
        if (!cancelled) setBannerError("Failed to load your listings. Please refresh.");
      }

      // 4) TRANSACTIONS (optional)
      try {
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
  // Auto logout after 5 minutes
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
      }, 5 * 60 * 1000);
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
        email: profile.email || user?.email || "",
        userId: (profile as any).userId || user?.$id || "",
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
  const storage = new Storage(client);

  async function uploadDashboardPhotoIfProvided(): Promise<string | null> {
    if (!sellPhoto) return null;

    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "";

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
        const results: Listing[] = [];
        try {
          const r1 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            Query.equal("seller_email", user.email),
          ]);
          results.push(...((r1.documents || []) as any));
        } catch {}
        try {
          const r2 = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            Query.equal("sellerEmail", user.email),
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
          <button
            onClick={handleLogout}
            className={`self-start md:self-auto px-4 py-2 text-sm font-semibold rounded-md border border-rose-500/70 text-rose-200 hover:bg-rose-900/30 transition`}
          >
            Logout
          </button>
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
                No profile found (or profile permissions prevented creation). First fix your Appwrite env vars and ensure
                the profiles collection allows logged-in users to read/write their own profile.
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
                      <p className="text-xs text-neutral-500 mt-1">Must include letters &amp; numbers, min 8 characters.</p>
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

        {/* Everything else unchanged (sell/awaiting/queued/live/sold/purchased/history/transactions) */}
        {/* ... your remaining tab JSX is exactly the same as you posted ... */}
        {/* To keep this message readable, I didn’t re-paste the unchanged sections again. */}
      </div>
    </div>
  );
}