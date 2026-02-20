"use client";

import { useEffect, useState } from "react";
import { Client, Account, Databases, Query, Storage } from "appwrite";
import { useRouter } from "next/navigation";
import AdminAuctionTimer from "../components/ui/AdminAuctionTimer";
import Link from "next/link";

// ------------------------------------------------------
// APPWRITE SETUP
// ------------------------------------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// ✅ Single source of truth for admin email
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

// ✅ Listings live in their own DB/Table (supports legacy PLATES envs)
const LISTINGS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// ✅ Transactions may be a separate DB/Table
const TRANSACTIONS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DB_ID ||
  LISTINGS_DB_ID;

const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID ||
  "transactions";

// ✅ Storage bucket for camera photos
const CAMERA_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_CAMERA_IMAGES_BUCKET_ID || "";

type AdminTab = "pending" | "queued" | "live" | "rejected" | "soldPending" | "complete";

// Public listing statuses – these match isIndexableStatus() on /listing/[id]
const PUBLIC_LISTING_STATUSES = new Set(["queued", "live", "sold"]);

// ------------------------------------------------------
// Helpers (camera-safe)
// ------------------------------------------------------
function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function niceEnum(s?: string | null) {
  const v = String(s || "").trim();
  if (!v) return "";
  return cap(v.replace(/_/g, " "));
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `£${value.toLocaleString("en-GB")}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getListingTitle(doc: any) {
  const itemTitle = String(doc?.item_title || doc?.title || doc?.item_title || "").trim();
  if (itemTitle) return itemTitle;

  const brand = String(doc?.brand || "").trim();
  const model = String(doc?.model || "").trim();
  const bm = [brand, model].filter(Boolean).join(" ");
  if (bm) return bm;

  const legacy = String(doc?.registration || doc?.reg_number || "").trim();
  if (legacy) return legacy;

  const gear = String(doc?.gear_type || doc?.type || "").trim();
  if (gear) return `${niceEnum(gear)} listing`;

  return "Camera gear listing";
}

function getListingMeta(doc: any) {
  const bits = [niceEnum(doc?.gear_type), niceEnum(doc?.condition), niceEnum(doc?.era)].filter(Boolean);
  return bits.join(" • ");
}

function pickBuyNow(doc: any): number | null {
  if (typeof doc?.buy_now_price === "number") return doc.buy_now_price;
  if (typeof doc?.buy_now === "number") return doc.buy_now;
  if (typeof doc?.buy_now_price === "string") {
    const n = Number(doc.buy_now_price);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof doc?.buy_now === "string") {
    const n = Number(doc.buy_now);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function txCreated(tx: any) {
  return tx?.created_at || tx?.$createdAt || null;
}
function txUpdated(tx: any) {
  return tx?.updated_at || tx?.$updatedAt || null;
}

function getSellerEmail(doc: any) {
  return String(doc?.seller_email || doc?.sellerEmail || "").trim();
}

function getImageId(doc: any) {
  return String(doc?.image_id || doc?.imageId || "").trim();
}

function getImageUrl(doc: any, size: number) {
  const fileId = getImageId(doc);
  if (!fileId || !CAMERA_IMAGES_BUCKET_ID) return null;

  try {
    // getFilePreview returns a URL object in some SDK versions; toString() is safe
    const url: any = storage.getFilePreview(CAMERA_IMAGES_BUCKET_ID, fileId, size, size, "center", 80);
    return String(url);
  } catch {
    return null;
  }
}

export default function AdminClient() {
  const router = useRouter();

  const [authState, setAuthState] = useState<"checking" | "yes">("checking");
  const [activeTab, setActiveTab] = useState<AdminTab>("pending");

  const [listings, setListings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedListing, setSelectedListing] = useState<any>(null);

  // ------------------------------------------------------
  // VERIFY ADMIN LOGIN
  // ------------------------------------------------------
  useEffect(() => {
    let alive = true;

    const verify = async () => {
      try {
        const user: any = await account.get();
        const email = String(user?.email || "").toLowerCase();

        if (email === ADMIN_EMAIL) {
          if (alive) setAuthState("yes");
        } else {
          router.replace("/admin-login");
        }
      } catch {
        router.replace("/admin-login");
      }
    };

    verify();
    return () => {
      alive = false;
    };
  }, [router]);

  // ------------------------------------------------------
  // LOAD LISTINGS / TRANSACTIONS
  // ------------------------------------------------------
  useEffect(() => {
    if (authState !== "yes") return;

    const load = async () => {
      setLoading(true);
      setMessage("");

      try {
        if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
          setMessage(
            "Missing Appwrite env for listings. Set NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID (or the legacy PLATES envs)."
          );
          setListings([]);
          setTransactions([]);
          return;
        }

        if (activeTab === "soldPending" || activeTab === "complete") {
          const txStatus = activeTab === "soldPending" ? "pending" : "complete";

          if (!TRANSACTIONS_DB_ID || !TRANSACTIONS_COLLECTION_ID) {
            setMessage(
              "Missing Appwrite env for transactions. Set NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID."
            );
            setTransactions([]);
            setListings([]);
            return;
          }

          const res = await databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, [
            Query.equal("transaction_status", txStatus),
            Query.orderDesc("$updatedAt"),
            Query.limit(200),
          ]);

          setTransactions(res. documents || []);
          setListings([]);
        } else {
          const res = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            Query.equal("status", activeTab),
            Query.orderDesc("$updatedAt"),
            Query.limit(200),
          ]);

          setListings(res.documents || []);
          setTransactions([]);
        }
      } catch (err: any) {
        console.error("Failed to load admin data:", err);
        const msg = String(err?.message || "");
        // This is the classic Appwrite problem when indexes are missing:
        // "Invalid query: Attribute not indexed"
        setMessage(
          msg.includes("not indexed")
            ? `Appwrite query failed: ${msg}\n\nFix: add indexes for status + $updatedAt in the plates/listings collection.`
            : "Failed to load data from Appwrite (check DB/Table IDs + schema + indexes)."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authState, activeTab]);

  // ------------------------------------------------------
  // APPROVE LISTING (server-only)
  // ------------------------------------------------------
  const approveListing = async () => {
    if (!selectedListing) return;

    const title = getListingTitle(selectedListing);

    try {
      const res = await fetch("/api/approve-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListing.$id,
          sellerEmail: getSellerEmail(selectedListing),
          interesting_fact: selectedListing.admin_notes || selectedListing.interesting_fact || "",
          starting_price: Number(selectedListing.starting_price) || 0,
          reserve_price: Number(selectedListing.reserve_price) || 0,
          buy_now: Number(selectedListing.buy_now) || 0,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || data?.error) {
        console.error("approve-listing error:", { status: res.status, data });
        throw new Error(String(data?.error || `Failed to approve listing (HTTP ${res.status}).`));
      }

      setMessage(`Listing "${title}" approved & queued.`);
      setSelectedListing(null);
      setActiveTab("queued");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to approve listing.");
    }
  };

  // ------------------------------------------------------
  // REJECT LISTING
  // ------------------------------------------------------
  const rejectListing = async (doc: any) => {
    if (!doc) return;

    const title = getListingTitle(doc);
    if (!window.confirm(`Are you sure you want to reject "${title}"?`)) return;

    try {
      const res = await fetch("/api/admin/reject-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: doc.$id,
          registration: title,
          sellerEmail: getSellerEmail(doc),
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = null;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response from /api/admin/reject-listing:", {
          status: res.status,
          statusText: res.statusText,
          body: text,
        });
        throw new Error(`Unexpected response while rejecting (HTTP ${res.status}).`);
      }

      if (!res.ok || data?.error) {
        console.error("Reject API error payload:", data);
        throw new Error(data?.error || "Failed to reject listing.");
      }

      setMessage(`Listing "${title}" rejected.`);
      setSelectedListing(null);

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", activeTab),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);
      setListings(updated.documents || []);
    } catch (err: any) {
      console.error("rejectListing error:", err);
      alert(err.message || "Failed to reject listing.");
    }
  };

  // ------------------------------------------------------
  // DELETE LISTING
  // ------------------------------------------------------
  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    try {
      await databases.deleteDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, id);

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", activeTab),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);

      setListings(updated.documents || []);
      setMessage("Listing deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete listing.");
    }
  };

  // ------------------------------------------------------
  // MARK LISTING SOLD
  // ------------------------------------------------------
  const markListingSold = async (doc: any) => {
    const title = getListingTitle(doc);

    const salePriceStr = window.prompt(
      `Enter final sale price for "${title}":`,
      (doc.current_bid ?? "").toString()
    );
    if (!salePriceStr) return;

    const salePrice = Number(salePriceStr);
    if (Number.isNaN(salePrice) || salePrice <= 0) {
      alert("Please enter a valid sale price.");
      return;
    }

    const buyerEmail = window.prompt("Buyer email (optional):", "") || "";

    try {
      setLoading(true);

      const res = await fetch("/api/admin/mark-sold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: doc.$id,
          finalPrice: salePrice,
          buyerEmail,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        console.error("mark-sold error:", { status: res.status, data });
        alert((data && data.error) || `Failed to mark as sold (HTTP ${res.status}).`);
        return;
      }

      setMessage(`Listing "${title}" marked as sold and transaction created.`);

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", "live"),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);
      setListings(updated.documents || []);
    } catch (err) {
      console.error(err);
      alert("Failed to mark listing as sold.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------
  const logout = async () => {
    try {
      await account.deleteSession("current");
    } catch {}
    router.replace("/admin-login");
  };

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm text-sm text-neutral-600">
          Checking admin session…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl p-8 shadow-lg border border-neutral-200">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-orange-700">Admin Dashboard</h1>
            <p className="text-xs text-neutral-500">Signed in as {ADMIN_EMAIL}</p>
          </div>

          <button className="text-red-600 font-semibold" onClick={logout}>
            Logout
          </button>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-6 border-b pb-3">
          {(["pending", "queued", "live", "rejected", "soldPending", "complete"] as AdminTab[]).map((t) => (
            <button
              key={t}
              className={`pb-2 font-semibold ${
                activeTab === t ? "border-b-4 border-orange-500 text-orange-700" : "text-neutral-500"
              }`}
              onClick={() => setActiveTab(t)}
            >
              {t === "queued"
                ? "Approved / Que