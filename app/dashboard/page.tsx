// app/dashboard/page.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, Account, Databases, ID, Query } from "appwrite";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import NumberPlate from "@/components/ui/NumberPlate";
import AdminAuctionTimer from "@/components/ui/AdminAuctionTimer";
import SellerDocumentsUploader from "@/components/ui/SellerDocumentsUploader";
import { getAuctionWindow } from "@/lib/getAuctionWindow";
import Link from "next/link";
import TransferTimelines from "./TransferTimelines";
import { formatDvlaRegistration } from "@/lib/formatDvlaRegistration";

// -----------------------------
// Appwrite setup
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ---------------------------------------
// ENV CONSTANTS (plates + transactions)
// ---------------------------------------
const PLATES_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63"; // fallback

const PLATES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Transactions use the SAME database as plates
const TX_DB_ID = PLATES_DB_ID;

// IMPORTANT: hard-code to the actual collection id you see in Appwrite
const TX_COLLECTION_ID = "transactions";

// Helpful debug to see what the browser actually has
if (typeof window !== "undefined") {
  console.log("ENV CHECK (dashboard)", {
    PLATES_DB_ID,
    PLATES_COLLECTION_ID,
    TX_DB_ID,
    TX_COLLECTION_ID,
  });
}

// -----------------------------
// DVLA fee model (NEW + legacy exceptions)
// -----------------------------
const DVLA_TRANSFER_FEE = 80;

// Only these legacy listings keep the old rule (buyer pays the £80)
const LEGACY_BUYER_PAYS_DVLA_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

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
};

type Plate = {
  $id: string;
  registration: string;
  plate_type: string;
  expiry_date?: string | null;
  description?: string;
  reserve_price: number;
  starting_price?: number;
  buy_now?: number;
  listing_fee?: number;
  commission_rate?: number;
  expected_return?: number;
  owner_confirmed?: boolean;
  agreed_terms?: boolean;
  status: string;
  seller_email: string;
  auction_end?: string;
  auction_start?: string;
  current_bid?: number;
  relist_until_sold?: boolean;
  withdraw_after_current?: boolean;
};

type Transaction = {
  $id: string;
  registration?: string;
  listing_id?: string;
  seller_email?: string;
  buyer_email?: string;
  sale_price?: number;
  commission_amount?: number;
  commission_rate?: number;
  dvla_fee?: number;
  seller_payout?: number;
  payment_status?: string; // "pending" | "paid"
  transaction_status?: string; // "pending" | "complete" | "awaiting_documents"
  documents?: any[];
  created_at?: string;
  updated_at?: string;

  // Seller flags (match admin transaction page)
  seller_docs_requested?: boolean;
  seller_docs_received?: boolean;
  seller_payment_transferred?: boolean;
  seller_process_complete?: boolean;

  // Buyer flags (match admin transaction page)
  buyer_info_requested?: boolean;
  buyer_info_received?: boolean;
  buyer_tax_mot_validated?: boolean;
  buyer_payment_taken?: boolean;
  buyer_transfer_complete?: boolean;
};

// -----------------------------
// Component
// -----------------------------
export default function DashboardPage() {
  const router = useRouter();

  const isLegacyBuyerPaysDvla = (tx: Transaction) => {
  const id = String((tx.listing_id as any) || (tx as any).plate_id || "").trim();
  return !!id && LEGACY_BUYER_PAYS_DVLA_IDS.has(id);
};

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

  // Plate groups
  const [awaitingPlates, setAwaitingPlates] = useState<Plate[]>([]);
  const [approvedPlates, setApprovedPlates] = useState<Plate[]>([]);
  const [livePlates, setLivePlates] = useState<Plate[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Sell form
  const [sellForm, setSellForm] = useState({
    registration: "",
    plate_type: "",
    expiry_date: "",
    description: "",
    reserve_price: "",
    starting_price: "",
    buy_now: "",
    owner_confirmed: false,
    agreed_terms: false,
    keepListingUntilSold: false,
  });

  // Registration preview (kept for potential future use)
  const rawReg = (sellForm.registration || "").toUpperCase();
  const previewReg = rawReg.trim() || "YOUR REG";

  const [listingFee, setListingFee] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(0);

  // Extra values for fee explanation
  const [exampleSalePrice, setExampleSalePrice] = useState(0);
  const [commissionValue, setCommissionValue] = useState(0);

  const [sellError, setSellError] = useState("");
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Terms
  const [showTerms, setShowTerms] = useState(false);

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

  // --------------------------------------------------------
  // LOAD EVERYTHING (auth-only redirect, no loop)
  // --------------------------------------------------------
  useEffect(() => {
    const loadAll = async () => {
      // 1) AUTH CHECK
      let current: any;
      try {
        current = await account.get();
      } catch (err) {
        console.warn("Auth error in dashboard (probably just logged out):", err);
        router.push("/login-or-register");
        return;
      }

      // admin goes to admin panel
      if (current.email === "admin@auctionmyplate.co.uk") {
        router.push("/admin");
        return;
      }

      if (!current.emailVerification) {
        router.push("/resend-verification");
        return;
      }

      setUser(current);

      // 2) DATA LOAD
      try {
        // PROFILE
        const profRes = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
          [Query.equal("email", current.email)]
        );
        if (profRes.documents.length > 0) {
          setProfile(profRes.documents[0] as Profile);
        }

        // PLATES
        const platesRes = await databases.listDocuments(
          PLATES_DB_ID,
          PLATES_COLLECTION_ID,
          [Query.equal("seller_email", current.email)]
        );

        const docs = (platesRes.documents ?? []) as unknown as Plate[];

        setAwaitingPlates(docs.filter((p) => p.status === "pending"));
        setApprovedPlates(docs.filter((p) => p.status === "queued"));
        setLivePlates(docs.filter((p) => p.status === "live"));
        setPlates(docs);

        // TRANSACTIONS (non-fatal)
        try {
          if (!TX_DB_ID || !TX_COLLECTION_ID) {
            console.warn("Transactions env vars missing", {
              TX_DB_ID,
              TX_COLLECTION_ID,
            });
          } else {
            const txRes = await databases.listDocuments(
              TX_DB_ID,
              TX_COLLECTION_ID,
              [Query.equal("seller_email", current.email)]
            );

            const txBuyerRes = await databases.listDocuments(
              TX_DB_ID,
              TX_COLLECTION_ID,
              [Query.equal("buyer_email", current.email)]
            );

            const combined = [
              ...(txRes.documents as Transaction[]),
              ...(txBuyerRes.documents as Transaction[]),
            ];

            const byId = new Map<string, Transaction>();
            combined.forEach((tx) => {
              if (tx.$id && !byId.has(tx.$id)) {
                byId.set(tx.$id, tx);
              }
            });

            setTransactions(Array.from(byId.values()));
          }
        } catch (txErr) {
          console.error("Transactions load error (non-fatal):", txErr);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
        setBannerError(
          "We couldn't load all your dashboard data. Please refresh the page or try again later."
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadAll();
  }, [router]);

  // --------------------------------------------------------
  // AUTO LOGOUT AFTER 5 MINUTES
  // --------------------------------------------------------
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          await account.deleteSession("current");
        } catch {
          // ignore
        }
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

  // --------------------------------------------------------
  // PROFILE CHANGE HANDLER
  // --------------------------------------------------------
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
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!,
        profile.$id,
        {
          first_name: profile.first_name || "",
          surname: profile.surname || "",
          house: profile.house || "",
          street: profile.street || "",
          town: profile.town || "",
          county: profile.county || "",
          postcode: profile.postcode || "",
          phone: profile.phone || "",
        }
      );
      setBannerSuccess("Profile updated!");
    } catch {
      setBannerError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // --------------------------------------------------------
  // PASSWORD HANDLING
  // --------------------------------------------------------
  const validateNewPassword = (pwd: string) =>
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);

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
      setPasswordError("Password must be 8+ chars incl. letters & numbers.");
      return;
    }

    const doUpdate = async () => {
      setPasswordLoading(true);
      try {
        await account.updatePassword(newPassword, currentPassword);
        setPasswordSuccess("Password updated!");
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

  // --------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore
    }
    router.push("/login-or-register");
  };

  // --------------------------------------------------------
  // DELETE ACCOUNT
  // --------------------------------------------------------
  const userEmail = user?.email ?? null;

  // Derived transactions & helpers need to exist before delete handler uses them
  const isFinishedTransaction = (tx: Transaction) => {
    const tStatus = (tx.transaction_status || "").toLowerCase();
    const pStatus = (tx.payment_status || "").toLowerCase();
    return (
      tStatus === "complete" ||
      tStatus === "completed" ||
      pStatus === "paid"
    );
  };

  const soldTransactions = userEmail
    ? transactions.filter(
        (tx) => tx.seller_email === userEmail && isFinishedTransaction(tx)
      )
    : [];

  const purchasedTransactions = userEmail
    ? transactions.filter(
        (tx) => tx.buyer_email === userEmail && isFinishedTransaction(tx)
      )
    : [];

  const activeTransactions = userEmail
    ? transactions
        .filter(
          (tx) => tx.seller_email === userEmail || tx.buyer_email === userEmail
        )
        .filter((tx) => !isFinishedTransaction(tx))
    : [];

  const historyPlates = plates.filter(
    (p) =>
      p.status === "sold" || p.status === "not_sold" || p.status === "completed"
  );

  const queuedPlates = plates.filter((p) => p.status === "queued");

  const handleDeleteAccount = async () => {
    if (!user) return;

    const sure = window.confirm(
      "Are you sure you want to delete your account?\n\n" +
        "This will remove your login and personal details from AuctionMyPlate.\n\n" +
        "You CANNOT delete your account if:\n" +
        "• You have a plate in a pending, queued or live auction\n" +
        "• You have any transactions still in progress"
    );

    if (!sure) return;

    setDeleteError("");
    setDeleteLoading(true);

    try {
      const hasActivePlate = plates.some((p) =>
        ["pending", "queued", "live"].includes(
          (p.status || "").toString().toLowerCase()
        )
      );

      if (hasActivePlate) {
        setDeleteError(
          "You still have a plate in an active auction (pending, queued or live). " +
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
        body: JSON.stringify({
          userId: user.$id,
          email: user.email,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || (data as any).error) {
        setDeleteError(
          (data as any).error || "Failed to delete account. Please try again."
        );
        setDeleteLoading(false);
        return;
      }

      alert("Your account has been deleted. Thank you for using AuctionMyPlate.");
      router.push("/");
    } catch (err: any) {
      console.error("delete-account error", err);
      setDeleteError(err?.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // --------------------------------------------------------
  // FEE CALCULATOR (Seller-side: includes £80 DVLA fee deduction)
  // --------------------------------------------------------
  const calculateFees = (reserve: number) => {
    let fee = 0;
    let commission = 0;

    if (reserve <= 4999.99) {
      fee = 0;
      commission = 10;
    } else if (reserve <= 9999.99) {
      commission = 8;
    } else if (reserve <= 24999.99) {
      commission = 7;
    } else if (reserve <= 49999.99) {
      commission = 6;
    } else {
      commission = 5;
    }

    const commissionAmount = (reserve * commission) / 100;

    // New default model: seller covers DVLA assignment fee (deducted from payout)
    const expected = reserve - commissionAmount - fee - DVLA_TRANSFER_FEE;

    setListingFee(fee);
    setCommissionRate(commission);
    setExampleSalePrice(isNaN(reserve) ? 0 : reserve);
    setCommissionValue(isNaN(commissionAmount) ? 0 : commissionAmount);
    setExpectedReturn(isNaN(expected) ? 0 : expected);
  };

  // --------------------------------------------------------
  // SELL FORM HANDLING
  // --------------------------------------------------------
  const handleSellChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const { name, value, type } = target;

    let val: any;

    if (type === "checkbox") {
      val = (target as HTMLInputElement).checked;
    } else if (type === "number") {
      val = value === "" ? "" : Number(value);
    } else {
      val = value;
    }

    if (name === "registration") {
      val = formatDvlaRegistration(value);
    }

    setSellForm((prev) => ({
      ...prev,
      [name]: val,
    }));
    setSellError("");

    if (name === "reserve_price") {
      const num = parseFloat(value);
      if (!isNaN(num)) calculateFees(num);
    }
  };

  const validateRetentionDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    return d > today;
  };

  // --------------------------------------------------------
  // SELL SUBMIT
  // --------------------------------------------------------
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSellError("");

    if (!user) {
      setSellError("Your session has expired. Please log in again.");
      router.push("/login");
      return;
    }

    if (!sellForm.registration.trim()) {
      setSellError("Registration is required.");
      return;
    }
    if (!sellForm.plate_type) {
      setSellError("Please select a plate type.");
      return;
    }
    if (
      sellForm.plate_type === "retention" &&
      (!sellForm.expiry_date || !validateRetentionDate(sellForm.expiry_date))
    ) {
      setSellError("Retention expiry date must be a valid future date.");
      return;
    }
    if (!sellForm.owner_confirmed) {
      setSellError("You must confirm you are the legal owner.");
      return;
    }
    if (!sellForm.agreed_terms) {
      setSellError("You must agree to the Terms & Conditions.");
      return;
    }

    const reserve = parseFloat(sellForm.reserve_price as any);
    const starting = sellForm.starting_price
      ? parseFloat(sellForm.starting_price as any)
      : 0;
    const buyNow = sellForm.buy_now ? parseFloat(sellForm.buy_now as any) : 0;

    if (isNaN(reserve) || reserve < 300) {
      setSellError("Minimum reserve price is £300.");
      return;
    }

    if (!isNaN(starting) && starting > 0 && starting >= reserve) {
      setSellError("Starting price must be lower than the reserve price.");
      return;
    }

    if (!isNaN(buyNow) && buyNow > 0) {
      const minBuyNow = Math.max(
        reserve,
        !isNaN(starting) && starting > 0 ? starting : 0
      );
      if (buyNow < minBuyNow) {
        setSellError(
          "Buy Now price cannot be lower than your reserve price or starting price."
        );
        return;
      }
    }

    setSellSubmitting(true);

    try {
      const normalizedReg = sellForm.registration.replace(/\s+/g, "").toUpperCase();

      const existingRes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
        [Query.equal("seller_email", user.email), Query.equal("registration", normalizedReg)]
      );

      const hasActiveDuplicate = existingRes.documents.some(
        (doc: any) => doc.status === "pending" || doc.status === "queued" || doc.status === "live"
      );

      if (hasActiveDuplicate) {
        setSellError(
          "You already have an active listing for this registration. Please wait for the current listing to complete."
        );
        setSellSubmitting(false);
        return;
      }

      const created = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
        ID.unique(),
        {
          registration: normalizedReg,
          plate_type: sellForm.plate_type,
          expiry_date: sellForm.expiry_date || null,
          description: sellForm.description || "",
          reserve_price: reserve,
          starting_price: !isNaN(starting) ? starting : 0,
          buy_now: !isNaN(buyNow) ? buyNow : 0,
          listing_fee: listingFee,
          commission_rate: commissionRate,
          expected_return: Math.round(Number(expectedReturn)),
          owner_confirmed: sellForm.owner_confirmed,
          agreed_terms: sellForm.agreed_terms,
          relist_until_sold: sellForm.keepListingUntilSold,
          withdraw_after_current: false,
          status: "pending",
          seller_email: user.email,
          created_at: new Date().toISOString(),
        }
      );

      try {
        const notifyRes = await fetch("/api/admin/new-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plateId: created.$id,
            registration: normalizedReg,
            sellerEmail: user.email,
            reserve_price: reserve,
            starting_price: !isNaN(starting) ? starting : 0,
            buy_now: !isNaN(buyNow) ? buyNow : 0,
          }),
        });

        if (!notifyRes.ok) {
          const text = await notifyRes.text();
          console.error(
            "❌ /api/admin/new-listing failed:",
            notifyRes.status,
            notifyRes.statusText,
            text
          );
        } else {
          console.log("✅ /api/admin/new-listing succeeded");
        }
      } catch (notifyErr) {
        console.error("Failed to notify admin about new listing:", notifyErr);
      }

      const platesRes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!,
        [Query.equal("seller_email", user.email)]
      );

      const docs = platesRes.documents as unknown as Plate[];
      setAwaitingPlates(docs.filter((p) => p.status === "pending"));
      setApprovedPlates(docs.filter((p) => p.status === "queued"));
      setLivePlates(docs.filter((p) => p.status === "live"));
      setPlates(docs);

      alert("Listing submitted! Awaiting approval.");

      setSellForm({
        registration: "",
        plate_type: "",
        expiry_date: "",
        description: "",
        reserve_price: "",
        starting_price: "",
        buy_now: "",
        keepListingUntilSold: false,
        owner_confirmed: false,
        agreed_terms: false,
      });

      setListingFee(0);
      setCommissionRate(0);
      setExpectedReturn(0);
    } catch (err: any) {
      console.error("Create listing error:", err);
      setSellError("Failed to create listing. Please try again.");
    } finally {
      setSellSubmitting(false);
    }
  };

  // --------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-gray-200 text-lg">Loading your dashboard…</p>
      </div>
    );
  }

  // --------------------------------------------------------
  // RENDER START
  // --------------------------------------------------------
  return (
    <div className="min-h-screen bg-black py-8 px-4 text-gray-100">
      <div className="max-w-6xl mx-auto bg-[#111111] rounded-2xl shadow-lg p-6 border border-yellow-700/60">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">
              My Dashboard
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Welcome,{" "}
              <span className="font-semibold">
                {profile?.first_name || user?.name || "Seller"}
              </span>
              .
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start md:self-auto px-4 py-2 text-sm font-semibold rounded-md border border-red-500 text-red-300 hover:bg-red-900/40 transition"
          >
            Logout
          </button>
        </div>

        {/* Banners */}
        {bannerError && (
          <div className="flex items-center gap-2 bg-red-900/30 text-red-200 p-3 rounded-md mb-4 border border-red-700/70">
            <XCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerError}</span>
          </div>
        )}
        {bannerSuccess && (
          <div className="flex items-center gap-2 bg-emerald-900/30 text-emerald-200 p-3 rounded-md mb-4 border border-emerald-700/70">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm">{bannerSuccess}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2 mb-6">
          {[
            ["profile", "Personal Details"],
            ["sell", "Sell a Plate"],
            ["awaiting", "Awaiting Approval"],
            ["approvedQueued", "Approved / Queued"],
            ["live", "Live Listings"],
            ["sold", "Sold"],
            ["purchased", "Purchased"],
            ["history", "History"],
            ["transactions", "Transactions"],
          ].map(([key, label]) => {
            const k = key as
              | "profile"
              | "sell"
              | "awaiting"
              | "approvedQueued"
              | "live"
              | "sold"
              | "purchased"
              | "history"
              | "transactions";
            const active = activeTab === k;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(k)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-md border-b-4 transition ${
                  active
                    ? "border-yellow-400 text-yellow-300 bg-yellow-500/10"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900"
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
            <h2 className="text-xl font-bold text-yellow-300">
              Personal Details
            </h2>

            {!profile ? (
              <p className="text-gray-300">
                No profile found. Please contact support.
              </p>
            ) : (
              <>
                {/* Personal info fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["first_name", "First Name"],
                    ["surname", "Surname"],
                    ["house", "House"],
                    ["street", "Street"],
                    ["town", "Town"],
                    ["county", "County"],
                    ["postcode", "Postcode"],
                    ["phone", "Phone"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        name={key}
                        value={(profile as any)[key] || ""}
                        onChange={handleProfileChange}
                        className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Email (login)
                    </label>
                    <input
                      type="email"
                      value={profile.email || user?.email || ""}
                      disabled
                      className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/60 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>

                {/* Change Password */}
                <div className="mt-10 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-300">
                    Change Password
                  </h3>

                  {passwordError && (
                    <p className="bg-red-900/30 text-red-200 text-sm rounded-md px-3 py-2 mb-3 border border-red-700/70">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="bg-emerald-900/30 text-emerald-200 text-sm rounded-md px-3 py-2 mb-3 border border-emerald-700/70">
                      {passwordSuccess}
                    </p>
                  )}

                  <form
                    onSubmit={handlePasswordChange}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Must include letters &amp; numbers, min 8 characters.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
                      >
                        {passwordLoading ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>

                  {/* Payment method link */}
                  <p className="mt-3 text-sm text-gray-300">
                    Need to update your saved card?
                    <Link
                      href="/payment-method"
                      className="ml-1 text-yellow-400 underline hover:text-yellow-300"
                    >
                      Manage Payment Method
                    </Link>
                  </p>
                </div>

                {/* Supporting Documents */}
                <div className="mt-10 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-300">
                    Supporting Documents
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    This section is only completed when documents are requested
                    by Admin after you have sold or purchased a numberplate.
                  </p>
                  <SellerDocumentsUploader
                    sellerId={profile.$id}
                    transactionId={null}
                  />
                </div>

                {/* Delete Account */}
                <div className="mt-10 border-t border-gray-800 pt-6">
                  <h3 className="text-lg font-semibold mb-3 text-red-400">
                    Delete Account
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Deleting your account will permanently remove your login and
                    personal details from AuctionMyPlate.
                    <br />
                    <strong>You cannot delete your account if:</strong>
                  </p>
                  <ul className="text-xs text-gray-400 list-disc ml-5 mb-3">
                    <li>
                      You have a plate in a pending, queued or live auction.
                    </li>
                    <li>You have any transactions still in progress.</li>
                  </ul>

                  {deleteError && (
                    <p className="bg-red-900/30 text-red-200 text-xs rounded-md px-3 py-2 mb-3 border border-red-700/70">
                      {deleteError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
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
              <h2 className="text-xl font-bold text-yellow-300">
                Sell my Plate
              </h2>
              <p className="text-xs text-gray-400">
                Listing is free. Fees only apply if your plate sells.
              </p>
            </div>

            {sellError && (
              <p className="bg-red-900/30 text-red-200 text-sm rounded-md px-3 py-2 mb-2 border border-red-700/70">
                {sellError}
              </p>
            )}

            <form onSubmit={handleSellSubmit} className="space-y-5">
              {/* REGISTRATION + PLATE PREVIEW */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Registration
                </label>

                <input
                  name="registration"
                  value={sellForm.registration}
                  onChange={handleSellChange}
                  className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g. AB12 CDE"
                />

                <div className="flex justify-center pt-5 pb-3">
                  <NumberPlate
                    reg={sellForm.registration}
                    size="large"
                    variant="rear"
                    showBlueBand={true}
                  />
                </div>
              </div>

              {/* PLATE TYPE */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Plate Type
                </label>
                <select
                  name="plate_type"
                  value={sellForm.plate_type}
                  onChange={handleSellChange}
                  className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select type</option>
                  <option value="certificate">Certificate (V750 / V778)</option>
                  <option value="vehicle">On a vehicle</option>
                  <option value="retention">Retention document</option>
                </select>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={sellForm.description}
                  onChange={handleSellChange}
                  className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm min-h-[80px] bg-black/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Tell buyers why this plate is special."
                />
              </div>

              {/* RESERVE / BUY NOW FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Reserve Price (£)
                  </label>
                  <input
                    type="number"
                    name="reserve_price"
                    value={sellForm.reserve_price}
                    onChange={handleSellChange}
                    className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Buy Now Price (£) (optional)
                  </label>
                  <input
                    type="number"
                    name="buy_now"
                    value={sellForm.buy_now}
                    onChange={handleSellChange}
                    className="border border-gray-700 rounded-md w-full px-3 py-2 text-sm bg-black/40 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    min={0}
                  />
                </div>
              </div>

              {/* FEES & EXPECTED RETURN */}
              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/60 rounded-md space-y-2">
                <h3 className="text-sm font-semibold text-yellow-200">
                  Fees &amp; Expected Return (based on your reserve)
                </h3>

                <p className="text-xs text-gray-200">
                  1) <strong>Final Sale Price</strong> (£
                  {exampleSalePrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  ) – this is based on your reserve and may change if your plate
                  sells at a higher price (
                  <Link href="/fees" className="text-yellow-300 underline">
                    please refer to fees
                  </Link>
                  ).
                </p>

                <p className="text-xs text-gray-200">
                  2) <strong>Sold Commission</strong> (£
                  {commissionValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  ) – deducted from the final hammer price.
                </p>

                <p className="text-xs text-gray-200">
                  3) <strong>DVLA assignment fee</strong> (£
                  {DVLA_TRANSFER_FEE.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  ) – deducted from your payout when a sale completes.
                </p>

                <p className="text-xs text-gray-200">
                  4) <strong>Estimated amount you will receive</strong> (£
                  {expectedReturn.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  ) – based on the reserve price and includes commission and the
                  DVLA fee deduction. This may change if the plate sells for
                  more. This is paid when the transfer has been fully completed.
                </p>
              </div>

              {/* NOTE */}
              <p className="text-xs text-gray-400">
                Note: We’ll review your plate before it enters an auction. We
                may contact you if we need supporting documents or to suggest a
                different reserve price based on market demand.
              </p>

              {/* CHECKBOXES */}
              <div className="space-y-2 text-xs text-gray-300">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="owner_confirmed"
                    checked={sellForm.owner_confirmed}
                    onChange={handleSellChange}
                    className="mt-1 accent-yellow-500"
                  />
                  <span>
                    I confirm I am the legal owner or have authority to sell
                    this registration.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="agreed_terms"
                    checked={sellForm.agreed_terms}
                    onChange={handleSellChange}
                    className="mt-1 accent-yellow-500"
                  />
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      className="text-yellow-300 underline"
                      onClick={() => setShowTerms(true)}
                    >
                      Terms &amp; Conditions
                    </button>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="keepListingUntilSold"
                    checked={sellForm.keepListingUntilSold}
                    onChange={handleSellChange}
                    className="mt-1 accent-yellow-500"
                  />
                  <span>
                    Keep listing this plate in each weekly auction until it
                    sells.
                    <br />
                    <span className="text-xs text-gray-500">
                      If it doesn’t sell, it will automatically enter the next
                      auction unless you request to withdraw it from your
                      dashboard.
                    </span>
                  </span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={sellSubmitting}
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-md text-sm disabled:opacity-50"
              >
                {sellSubmitting ? "Submitting…" : "Create Listing"}
              </button>
            </form>
          </div>
        )}

        {/* AWAITING TAB */}
        {activeTab === "awaiting" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Awaiting Approval
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              These listings have been submitted and are waiting for the admin
              team to review and approve them.
            </p>

            {awaitingPlates.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                You have no listings awaiting approval.
              </p>
            ) : (
              <div className="grid gap-4">
                {awaitingPlates.map((p) => (
                  <div
                    key={p.$id}
                    className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-yellow-300">
                          {p.registration}
                        </h3>
                        <p className="text-xs text-gray-400">
                          Status:{" "}
                          <span className="font-semibold text-orange-300">
                            Pending review
                          </span>
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-yellow-900/40 text-yellow-200">
                        Awaiting Approval
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-200 mt-2">
                      <p>
                        <strong>Reserve:</strong>{" "}
                        £{p.reserve_price.toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Starting:</strong> £
                        {(p.starting_price ?? 0).toLocaleString("en-GB")}
                      </p>
                      <p>
                        <strong>Buy Now:</strong>{" "}
                        {p.buy_now
                          ? `£${p.buy_now.toLocaleString("en-GB")}`
                          : "Not set"}
                      </p>
                    </div>

                    {p.description && (
                      <p className="mt-2 text-xs text-gray-400">
                        <strong>Your description:</strong> {p.description}
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
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Approved / Queued Listings
            </h2>

            <p className="text-sm text-gray-300 mb-1">
              These plates have been approved by admin and will enter the next
              weekly auction.
            </p>
            <p className="text-xs text-gray-400">
              You currently have{" "}
              <strong>{queuedPlates.length}</strong> plate
              {queuedPlates.length === 1 ? "" : "s"} queued.
            </p>

            {queuedPlates.length === 0 ? (
              <p className="text-gray-400 text-sm text-center mt-4">
                You have no approved listings waiting for the next auction.
              </p>
            ) : (
              <div className="grid gap-4 mt-2">
                {queuedPlates.map((p) => {
                  const now = new Date();
                  const { nextStart, nextEnd } = getAuctionWindow(now);

                  const start = p.auction_start ? new Date(p.auction_start) : nextStart;
                  const end = p.auction_end ? new Date(p.auction_end) : nextEnd;

                  const canWithdraw = !!(start && now < start);

                  return (
                    <div
                      key={p.$id}
                      className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-yellow-300">
                            {p.registration}
                          </h3>
                          <p className="text-xs text-gray-400">
                            Status:{" "}
                            <span className="font-semibold text-blue-300">
                              Approved / queued for next auction
                            </span>
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-900/40 text-blue-200">
                          Approved / Queued
                        </span>
                      </div>

                      <div className="flex justify-center mb-3">
                        <NumberPlate
                          reg={p.registration}
                          size="large"
                          variant="rear"
                          showBlueBand={true}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-200 mb-2">
                        <p>
                          <strong>Reserve:</strong>{" "}
                          £{p.reserve_price.toLocaleString("en-GB")}
                        </p>
                        <p>
                          <strong>Starting price:</strong>{" "}
                          £{(p.starting_price ?? 0).toLocaleString("en-GB")}
                        </p>
                        <p>
                          <strong>Buy Now:</strong>{" "}
                          {p.buy_now
                            ? `£${p.buy_now.toLocaleString("en-GB")}`
                            : "Not set"}
                        </p>
                      </div>

                      <div className="mt-2 text-sm text-gray-200">
                        <strong>Auction Window: </strong>
                        {start
                          ? start.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}{" "}
                        –{" "}
                        {end
                          ? end.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}
                      </div>

                      <div className="mt-2">
                        <AdminAuctionTimer
                          start={p.auction_start}
                          end={p.auction_end}
                          status="queued"
                        />
                      </div>

                      <div className="mt-3 text-xs text-gray-400 space-y-1">
                        <p>
                          <strong>Relist setting:</strong>{" "}
                          {p.relist_until_sold
                            ? "This plate will be relisted in the next weekly auction if it does not sell."
                            : "This plate will not be automatically relisted after the auction."}
                        </p>
                      </div>

                      {canWithdraw && (
                        <button
                          type="button"
                          className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Are you sure you want to withdraw this plate from the upcoming auction?"
                              )
                            ) {
                              return;
                            }

                            try {
                              const res = await fetch("/api/withdraw-listing", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ listingId: p.$id }),
                              });

                              const data = await res
                                .json()
                                .catch(() => ({ error: "Invalid response" }));

                              if (!res.ok || data.error) {
                                alert(
                                  data.error ||
                                    "Failed to withdraw listing. Please try again."
                                );
                                return;
                              }

                              window.location.reload();
                            } catch (err) {
                              console.error("withdraw-listing error", err);
                              alert("Something went wrong withdrawing listing.");
                            }
                          }}
                        >
                          Withdraw from upcoming auction
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LIVE TAB */}
        {activeTab === "live" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Live Listings
            </h2>

            <p className="text-sm text-gray-300 mb-4">
              These plates are currently in the live weekly auction. You can
              request that a plate is withdrawn after this auction finishes. If{" "}
              <strong>“keep listing until sold”</strong> was selected, the plate
              will normally roll into the next auction automatically unless you
              request withdrawal.
            </p>

            {livePlates.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                You currently have no plates in a live auction.
              </p>
            ) : (
              <div className="grid gap-4">
                {livePlates.map((p) => {
                  const start = p.auction_start ? new Date(p.auction_start) : null;
                  const end = p.auction_end ? new Date(p.auction_end) : null;

                  return (
                    <div
                      key={p.$id}
                      className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-yellow-300">
                            {p.registration}
                          </h3>
                          <p className="text-xs text-gray-400">
                            Status:{" "}
                            <span className="font-semibold text-green-300">
                              Live in auction
                            </span>
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-900/40 text-green-200">
                          LIVE
                        </span>
                      </div>

                      <div className="flex justify-center mb-3">
                        <NumberPlate
                          reg={p.registration}
                          size="large"
                          variant="rear"
                          showBlueBand={true}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-200 mb-2">
                        <p>
                          <strong>Current Bid:</strong>{" "}
                          {typeof p.current_bid === "number"
                            ? `£${p.current_bid.toLocaleString("en-GB")}`
                            : "No bids yet"}
                        </p>
                        <p>
                          <strong>Reserve:</strong>{" "}
                          £{p.reserve_price.toLocaleString("en-GB")}
                        </p>
                        <p>
                          <strong>Buy Now:</strong>{" "}
                          {p.buy_now ? `£${p.buy_now.toLocaleString("en-GB")}` : "Not set"}
                        </p>
                      </div>

                      <div className="mt-2 text-sm text-gray-200">
                        <strong>Auction Window: </strong>
                        {start
                          ? start.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}{" "}
                        –{" "}
                        {end
                          ? end.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "TBC"}
                      </div>

                      <div className="mt-2">
                        <AdminAuctionTimer
                          start={p.auction_start}
                          end={p.auction_end}
                          status="live"
                        />
                      </div>

                      <div className="mt-3 text-xs text-gray-400 space-y-1">
                        <p>
                          <strong>Relist setting:</strong>{" "}
                          {p.relist_until_sold
                            ? "This plate will be relisted in the next weekly auction if it does not sell."
                            : "This plate will not be automatically relisted after this auction."}
                        </p>
                        {p.withdraw_after_current && (
                          <p className="text-orange-300 font-semibold">
                            Withdrawal requested – this plate will be removed
                            after the current auction finishes and will not be
                            entered into the next auction.
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        <a
                          href={`/listing/${p.$id}`}
                          target="_blank"
                          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                          View public listing
                        </a>

                        {!p.withdraw_after_current && (
                          <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Are you sure you want to withdraw this plate AFTER the current auction ends?\n\nIt will remain in the auction until this week's auction has finished, but will not be entered into the next auction."
                                )
                              ) {
                                return;
                              }

                              try {
                                const res = await fetch("/api/dashboard/request-withdraw", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ plateId: p.$id }),
                                });

                                const data = await res
                                  .json()
                                  .catch(() => ({ error: "Invalid response" }));

                                if (!res.ok || data.error) {
                                  alert(
                                    data.error ||
                                      "Failed to request withdrawal. Please try again."
                                  );
                                  return;
                                }

                                setLivePlates((prev) =>
                                  prev.map((plate) =>
                                    plate.$id === p.$id
                                      ? { ...plate, withdraw_after_current: true }
                                      : plate
                                  )
                                );

                                alert(
                                  "Withdrawal requested. This plate will be removed after the current auction ends."
                                );
                              } catch (err) {
                                console.error("request-withdraw error", err);
                                alert("Failed to request withdrawal.");
                              }
                            }}
                          >
                            Withdraw after this auction
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SOLD TAB */}
        {activeTab === "sold" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Sold Plates (You as Seller)
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              Completed sales where you were the seller. These should line up
              with what admin sees in the Transactions screen.
            </p>

            {soldTransactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                You don&apos;t have any completed sales yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {soldTransactions.map((tx) => {
                  const regText =
                    (tx as any).registration ||
                    (tx as any).plate_registration ||
                    (tx as any).plate_id ||
                    "UNKNOWN";

                  const created =
                    tx.created_at && !isNaN(new Date(tx.created_at).getTime())
                      ? new Date(tx.created_at).toLocaleString("en-GB")
                      : null;

                  const updated =
                    tx.updated_at && !isNaN(new Date(tx.updated_at).getTime())
                      ? new Date(tx.updated_at).toLocaleString("en-GB")
                      : null;

                  return (
                    <div
                      key={tx.$id}
                      className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-4">
                          <NumberPlate
                            reg={regText}
                            size="card"
                            variant="rear"
                            showBlueBand={true}
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-100">
                              {regText}
                            </p>
                            <p className="text-xs text-gray-400">
                              Buyer: {tx.buyer_email || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Transaction ID: {tx.$id}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-900/40 text-green-200">
                          COMPLETED
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-200 mt-2">
                        <p>
                          <strong>Sale price:</strong> £
                          {(tx.sale_price ?? 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>Commission:</strong> £
                          {(tx.commission_amount ?? 0).toFixed(2)} (
                          {tx.commission_rate ?? 0}%)
                        </p>
                        <p>
                          <strong>Seller payout:</strong> £
                          {(tx.seller_payout ?? 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>DVLA fee:</strong> £{(tx.dvla_fee ?? 0).toFixed(2)}{" "}
                          <span className="text-xs text-gray-400">
                            ({isLegacyBuyerPaysDvla(tx) ? "paid by buyer (legacy listing)" : "paid by seller"})
                          </span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400 mt-3">
                        <p>
                          <strong>Created:</strong> {created || "Not recorded"}
                        </p>
                        <p>
                          <strong>Last updated:</strong> {updated || "Not recorded"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PURCHASED TAB */}
        {activeTab === "purchased" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Purchased Plates (You as Buyer)
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              Completed purchases where you were the buyer.
            </p>

            {purchasedTransactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                You haven&apos;t completed any purchases yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {purchasedTransactions.map((tx) => {
                  const regText =
                    (tx as any).registration ||
                    (tx as any).plate_registration ||
                    (tx as any).plate_id ||
                    "UNKNOWN";

                  const created =
                    tx.created_at && !isNaN(new Date(tx.created_at).getTime())
                      ? new Date(tx.created_at).toLocaleString("en-GB")
                      : null;

                  const updated =
                    tx.updated_at && !isNaN(new Date(tx.updated_at).getTime())
                      ? new Date(tx.updated_at).toLocaleString("en-GB")
                      : null;

                  const salePrice = tx.sale_price ?? 0;
                  const dvlaFee = tx.dvla_fee ?? 0;
                  const buyerPaysDvla = isLegacyBuyerPaysDvla(tx);
                  const totalPaid = salePrice + (buyerPaysDvla ? dvlaFee : 0);

                  return (
                    <div
                      key={tx.$id}
                      className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-4">
                          <NumberPlate
                            reg={regText}
                            size="card"
                            variant="rear"
                            showBlueBand={true}
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-100">
                              {regText}
                            </p>
                            <p className="text-xs text-gray-400">
                              Seller: {tx.seller_email || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Transaction ID: {tx.$id}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-900/40 text-green-200">
                          COMPLETED
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-200 mt-2">
                        <p>
                          <strong>Sale price:</strong> £{salePrice.toFixed(2)}
                        </p>
                        <p>
                          <strong>Commission:</strong> £
                          {(tx.commission_amount ?? 0).toFixed(2)} (
                          {tx.commission_rate ?? 0}%)
                        </p>
                        <p>
                          <strong>DVLA fee:</strong> £{dvlaFee.toFixed(2)}{" "}
                          <span className="text-xs text-gray-400">
                            ({buyerPaysDvla ? "paid by buyer (legacy listing)" : "paid by seller"})
                          </span>
                        </p>
                        <p>
                          <strong>Total paid (approx):</strong> £{totalPaid.toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400 mt-3">
                        <p>
                          <strong>Created:</strong> {created || "Not recorded"}
                        </p>
                        <p>
                          <strong>Last updated:</strong> {updated || "Not recorded"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">History</h2>

            {historyPlates.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                Sold, unsold and completed auctions will appear here.
              </p>
            ) : (
              <div className="grid gap-5">
                {historyPlates.map((plate) => (
                  <div
                    key={plate.$id}
                    className="border border-gray-800 rounded-xl p-5 bg-[#181818] shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-bold text-yellow-300">
                        {plate.registration}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-md text-xs font-semibold ${
                          plate.status === "sold"
                            ? "bg-green-900/40 text-green-200"
                            : plate.status === "not_sold"
                            ? "bg-red-900/40 text-red-200"
                            : "bg-gray-800 text-gray-200"
                        }`}
                      >
                        {plate.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-200">
                      <p>
                        <strong>Reserve:</strong> £{plate.reserve_price}
                      </p>
                      <p>
                        <strong>Highest Bid:</strong> £{plate.current_bid || 0}
                      </p>
                      <p>
                        <strong>Auction Ended:</strong>{" "}
                        {plate.auction_end
                          ? new Date(plate.auction_end).toLocaleString("en-GB")
                          : "—"}
                      </p>
                    </div>

                    {plate.status === "not_sold" && (
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          btn.disabled = true;
                          btn.textContent = "Relisting...";

                          try {
                            const res = await fetch("/api/relist-plate", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                listingId: plate.$id,
                                seller_email: plate.seller_email,
                                registration: plate.registration,
                              }),
                            });

                            if (res.ok) {
                              setPlates((prev) =>
                                prev.map((p) =>
                                  p.$id === plate.$id ? { ...p, status: "queued" } : p
                                )
                              );
                              btn.outerHTML =
                                '<div class="mt-3 text-green-200 font-semibold bg-green-900/40 px-3 py-2 rounded-md text-center">Relisted</div>';
                            } else {
                              btn.textContent = "Retry Relist";
                              btn.disabled = false;
                              alert("Failed to relist. Try again.");
                            }
                          } catch (err) {
                            console.error(err);
                            btn.textContent = "Retry Relist";
                            btn.disabled = false;
                            alert("Something went wrong.");
                          }
                        }}
                        className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded-md text-sm transition"
                      >
                        Relist
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-yellow-300">
              Transactions &amp; Documents
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              Active sales and purchases where payment and DVLA transfer are
              still in progress. You&apos;ll see document upload options here
              when admin has requested information from you.
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-gray-200 mb-2">
              <span className="px-3 py-1 rounded-full bg-yellow-900/30 border border-yellow-700/60">
                As seller:{" "}
                <strong>
                  {activeTransactions.filter((t) => t.seller_email === userEmail).length}
                </strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-yellow-900/30 border border-yellow-700/60">
                As buyer:{" "}
                <strong>
                  {activeTransactions.filter((t) => t.buyer_email === userEmail).length}
                </strong>
              </span>
            </div>

            {activeTransactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">
                You don&apos;t have any active transactions right now.
              </p>
            ) : (
              <div className="grid gap-4">
                {activeTransactions.map((tx) => {
                  const created =
                    tx.created_at && !isNaN(new Date(tx.created_at).getTime())
                      ? new Date(tx.created_at).toLocaleString("en-GB")
                      : null;

                  const updated =
                    tx.updated_at && !isNaN(new Date(tx.updated_at).getTime())
                      ? new Date(tx.updated_at).toLocaleString("en-GB")
                      : null;

                  const statusLabel = tx.transaction_status || tx.payment_status || "pending";

                  const statusClasses =
                    statusLabel === "completed" ||
                    statusLabel === "complete" ||
                    statusLabel === "paid"
                      ? "bg-green-900/40 text-green-200"
                      : statusLabel === "processing"
                      ? "bg-yellow-900/40 text-yellow-200"
                      : "bg-gray-800 text-gray-200";

                  const regText =
                    (tx as any).registration ||
                    (tx as any).plate_registration ||
                    (tx as any).plate_id ||
                    "UNKNOWN";

                  const listingOrPlateId =
                    (tx as any).plate_id || (tx as any).listing_id || "N/A";

                  const isSeller = tx.seller_email === user?.email;
                  const isBuyer = tx.buyer_email === user?.email;

                  const needsSellerDocs =
                    isSeller && !!tx.seller_docs_requested && !tx.seller_docs_received;

                  const needsBuyerDocs =
                    isBuyer && !!tx.buyer_info_requested && !tx.buyer_info_received;

                  const showUploader = !!profile && (needsSellerDocs || needsBuyerDocs);

                  const salePrice = tx.sale_price ?? 0;
                  const dvlaFee = tx.dvla_fee ?? 0;
                  const sellerPayout = tx.seller_payout ?? 0;
                  const commissionAmount = tx.commission_amount ?? 0;
                  const txCommissionRate = tx.commission_rate ?? 0;

                  const buyerPaysDvla = isLegacyBuyerPaysDvla(tx);
                  const totalPaid = salePrice + (buyerPaysDvla ? dvlaFee : 0);

                  return (
                    <div
                      key={tx.$id}
                      className="border border-gray-800 rounded-xl p-4 bg-[#181818] shadow-sm"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-4">
                          <NumberPlate
                            reg={regText}
                            size="card"
                            variant="rear"
                            showBlueBand={true}
                          />

                          <div>
                            <p className="text-sm font-semibold text-gray-100">
                              {regText}
                            </p>
                            <p className="text-xs text-gray-500">
                              Listing / Plate ID: {listingOrPlateId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Transaction ID: {tx.$id}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Role:{" "}
                              {isSeller
                                ? "Seller (you are being paid)"
                                : "Buyer (you are receiving the plate)"}
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-md text-xs font-semibold ${statusClasses}`}>
                          {statusLabel.toUpperCase()}
                        </span>
                      </div>

                      {/* Summary box */}
                      <div className="bg-yellow-900/20 border border-yellow-700/60 rounded-lg px-3 py-2 text-xs text-gray-200 mt-2 space-y-1">
                        <p>
                          <strong>Sale price:</strong> £{salePrice.toFixed(2)}
                        </p>
                        <p>
                          <strong>DVLA fee:</strong> £{dvlaFee.toFixed(2)}{" "}
                          <span className="text-xs text-gray-400">
                            ({buyerPaysDvla ? "paid by buyer (legacy listing)" : "paid by seller"})
                          </span>
                        </p>

                        {isSeller && (
                          <>
                            <p>
                              <strong>Commission:</strong> £
                              {commissionAmount.toFixed(2)} ({txCommissionRate}%)
                            </p>
                            <p>
                              <strong>Estimated payout to you:</strong> £
                              {sellerPayout.toFixed(2)}
                            </p>
                          </>
                        )}

                        {isBuyer && (
                          <p>
                            <strong>Total paid (approx):</strong> £{totalPaid.toFixed(2)}
                          </p>
                        )}

                        <p>
                          <strong>Payment status:</strong> {tx.payment_status || "pending"}
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400 mt-3">
                        <p>
                          <strong>Created:</strong> {created || "Not recorded"}
                        </p>
                        <p>
                          <strong>Last updated:</strong> {updated || "Not recorded"}
                        </p>
                      </div>

                      {/* Documents uploader */}
                      {showUploader && (
                        <div className="mt-4 border-t border-gray-800 pt-3">
                          <p className="text-xs text-gray-400 mb-2">
                            {isSeller && needsSellerDocs
                              ? "We’re waiting for your seller documents to progress this sale. Please upload your DVLA paperwork (V5C, retention certificate, etc.) below."
                              : isBuyer && needsBuyerDocs
                              ? "We’re waiting for your buyer details to progress this purchase. Please upload the requested documents below."
                              : "You can upload any requested documents for this transaction below."}
                          </p>
                          <SellerDocumentsUploader
                            sellerId={profile!.$id}
                            transactionId={tx.$id}
                            existingDocuments={(tx as any).documents || []}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TERMS & CONDITIONS MODAL */}
        {showTerms && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#111111] text-gray-100 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden relative border border-yellow-700/60">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-yellow-300">
                    Terms &amp; Conditions
                  </h2>
                  <p className="text-xs text-gray-500">
                    Effective Date: February 2025
                  </p>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-200 text-xl"
                  onClick={() => setShowTerms(false)}
                  aria-label="Close terms"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm leading-relaxed text-gray-100 space-y-6">
                <p>
                  These Terms and Conditions govern your use of
                  AuctionMyPlate.co.uk (“we”, “us”, “our”). By accessing or
                  using the platform, you agree to these Terms.
                </p>

                <p>
                  AuctionMyPlate.co.uk is{" "}
                  <strong>
                    not affiliated, authorised, endorsed or associated
                  </strong>{" "}
                  with the Driver and Vehicle Licensing Agency (DVLA) or any UK
                  government organisation.
                </p>

                <h3 className="font-semibold text-lg">1. Eligibility</h3>
                <ul className="list-disc ml-5 space-y-1">
                  <li>You must be at least 18 years old.</li>
                  <li>You must provide accurate information.</li>
                  <li>You must be legally capable of selling the registration.</li>
                  <li>
                    Fraud or identity deception results in immediate account
                    suspension.
                  </li>
                </ul>

                <h3 className="font-semibold text-lg">2. User Accounts</h3>
                <p>
                  You are responsible for keeping your login details secure. We
                  may suspend or terminate accounts that breach our rules or
                  appear fraudulent. Multiple accounts without permission are
                  not allowed.
                </p>

                <h3 className="font-semibold text-lg">
                  3. Listings &amp; Plate Ownership
                </h3>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    You must be the legal owner or have written permission to
                    sell.
                  </li>
                  <li>You must hold correct documentation (V5C, V750, V778).</li>
                  <li>
                    You must not misrepresent the registration or its
                    eligibility.
                  </li>
                  <li>
                    We reserve the right to remove or suspend any listing at our
                    discretion.
                  </li>
                </ul>

                <h3 className="font-semibold text-lg">4. Auction Format</h3>
                <p>
                  Weekly auctions run{" "}
                  <strong>Monday 01:00 – Sunday 23:00</strong> with a{" "}
                  <strong>5-minute soft close</strong>. All bids placed are
                  legally binding. Bidders must ensure they have sufficient
                  funds. Reserve prices are hidden. If the reserve is met, the
                  plate will sell.
                </p>

                <h3 className="font-semibold text-lg">5. Buy Now</h3>
                <p>
                  Selecting Buy Now ends the auction immediately. The sale
                  becomes legally binding and the buyer must complete payment
                  promptly.
                </p>

                <h3 className="font-semibold text-lg">6. Reserve Prices</h3>
                <p>
                  The seller may set a reserve. If the reserve is not met, the
                  seller is not obliged to complete the sale. If the reserve{" "}
                  <strong>is</strong> met, both parties must complete the
                  transaction.
                </p>

                <h3 className="font-semibold text-lg">7. Fees</h3>

                <h4 className="font-semibold">7.1 Listing Fees</h4>
                <p>
                  Listing may be free during introductory periods. Future fees
                  may apply to sellers and/or buyers.
                </p>

                <h4 className="font-semibold">7.2 Commission</h4>
                <p>
                  Commission is deducted automatically when a plate sells. No
                  commission is charged if it does not sell.
                </p>

                <h4 className="font-semibold">7.3 DVLA Assignment Fee (£80.00)</h4>
                <p>
                  A <strong>£80.00 DVLA assignment fee</strong> applies to the
                  transfer process. By default, this is deducted from the{" "}
                  <strong>seller payout</strong> when a sale completes. In
                  limited legacy cases it may be charged to the buyer where the
                  listing clearly states “Buyer pays DVLA fee”.
                </p>

                <h4 className="font-semibold">7.4 Refunds</h4>
                <p>Fees are non-refundable unless required by law.</p>

                <h3 className="font-semibold text-lg">8. Transfer of Registration</h3>
                <p>
                  <strong>Seller responsibilities:</strong>
                </p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Provide accurate information and valid documents.</li>
                  <li>
                    Cooperate promptly in completing the registration transfer.
                  </li>
                </ul>

                <p>
                  <strong>Buyer responsibilities:</strong>
                </p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Ensure their vehicle is eligible for the registration.</li>
                  <li>Submit any requested information promptly.</li>
                  <li>Cooperate with the transfer process.</li>
                </ul>

                <p>
                  We are not responsible for DVLA delays, rejections, lost post,
                  or mistakes made by buyers or sellers.
                </p>

                <h3 className="font-semibold text-lg">9. Legal Display of Plates</h3>
                <p>
                  All plates must be displayed in accordance with DVLA
                  regulations. Illegal spacing or styling may result in fines,
                  MOT failure, or police action. We are not responsible for how
                  users choose to display their registrations.
                </p>

                <h3 className="font-semibold text-lg">10. Prohibited Use</h3>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Fraudulent listings or shill bidding.</li>
                  <li>Illegal spacing or misrepresentation.</li>
                  <li>Harassment or abusive behaviour.</li>
                  <li>Using fake identities or payment methods.</li>
                  <li>Manipulating auction outcomes.</li>
                </ul>

                <h3 className="font-semibold text-lg">11. Liability</h3>
                <p>
                  We are not liable for losses, disputes, DVLA issues, platform
                  downtime, inaccurate listings, or the behaviour of other users.
                  We act solely as a marketplace.
                </p>

                <h3 className="font-semibold text-lg">12. Non-Payment by Buyer</h3>
                <p>
                  If a buyer fails to complete the transaction, we may cancel
                  the sale, suspend the account, and allow the seller to relist
                  the registration.
                </p>

                <h3 className="font-semibold text-lg">13. Suspension &amp; Removal</h3>
                <p>
                  We may remove listings or suspend accounts at our discretion
                  in cases of fraud, suspicious activity, abusive behaviour, or
                  breaches of these Terms.
                </p>

                <h3 className="font-semibold text-lg">14. Changes to Terms</h3>
                <p>
                  We may update these Terms at any time. Continued use of the
                  platform constitutes acceptance of the updated Terms.
                </p>

                <h3 className="font-semibold text-lg">15. Contact</h3>
                <p>
                  For support: <strong>support@auctionmyplate.co.uk</strong>
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-black border-t border-gray-800 flex justify-end">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-4 py-2 rounded-md bg-yellow-500 text-black text-sm font-semibold hover:bg-yellow-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
