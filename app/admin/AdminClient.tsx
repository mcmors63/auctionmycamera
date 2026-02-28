// app/admin/AdminClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Client, Account, Databases, Query } from "appwrite";
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

// ✅ Single source of truth for admin email
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

// ✅ Listings live in their own DB/Collection (LISTINGS ONLY — no legacy LISTINGS fallbacks)
const LISTINGS_DB_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID || "";
const LISTINGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID || "";

// ✅ Transactions may be a separate DB/Collection
const TRANSACTIONS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DB_ID ||
  LISTINGS_DB_ID;

const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID ||
  "transactions";

/**
 * Tabs:
 * - Listings: pending, queued, live, rejected
 * - Transactions: payments (audit), dispatch, receipt, complete
 */
type AdminTab =
  | "pending"
  | "queued"
  | "live"
  | "rejected"
  | "payments" // ✅ audit: unpaid/failed
  | "dispatch" // ✅ dispatch_pending
  | "receipt" // ✅ receipt_pending
  | "complete";

type TxFilterPayment = "all" | "paid" | "unpaid" | "failed";
type TxFilterStatus = "all" | "dispatch_pending" | "receipt_pending" | "complete" | "payment_failed";

const LISTING_TABS: { key: AdminTab; label: string }[] = [
  { key: "pending", label: "Pending Approval" },
  { key: "queued", label: "Approved / Queued" },
  { key: "live", label: "Live" },
  { key: "rejected", label: "Rejected" },
];

const TX_TABS: { key: AdminTab; label: string }[] = [
  { key: "payments", label: "Payments Audit" },
  { key: "dispatch", label: "Dispatch Pending" },
  { key: "receipt", label: "Receipt Pending" },
  { key: "complete", label: "Complete" },
];

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
  const itemTitle = String(doc?.item_title || doc?.title || "").trim();
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
  return null;
}

function txCreated(tx: any) {
  return tx?.created_at || tx?.$createdAt || null;
}
function txUpdated(tx: any) {
  return tx?.updated_at || tx?.$updatedAt || null;
}

function safeNumber(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function trimReason(s: string) {
  const v = String(s || "").trim();
  if (!v) return "";
  return v.length > 800 ? v.slice(0, 800) + "…" : v;
}

function txItemLabel(tx: any) {
  return (
    tx?.item_title ||
    tx?.title ||
    [tx?.brand, tx?.model].filter(Boolean).join(" ") ||
    tx?.registration ||
    "—"
  );
}

function badgeClass(kind: "ok" | "warn" | "bad" | "neutral") {
  if (kind === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (kind === "warn") return "bg-amber-100 text-amber-900 border-amber-200";
  if (kind === "bad") return "bg-red-100 text-red-800 border-red-200";
  return "bg-neutral-100 text-neutral-800 border-neutral-200";
}

function paymentBadgeKind(paymentStatus: string) {
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "paid") return "ok";
  if (s === "unpaid") return "warn";
  if (s === "failed") return "bad";
  return "neutral";
}

function txStatusBadgeKind(txStatus: string) {
  const s = String(txStatus || "").toLowerCase();
  if (s === "complete") return "ok";
  if (s === "dispatch_pending" || s === "receipt_pending") return "warn";
  if (s === "payment_failed") return "bad";
  return "neutral";
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

  // ✅ Audit filters (client-side, so no schema/index assumptions needed)
  const [txPaymentFilter, setTxPaymentFilter] = useState<TxFilterPayment>("all");
  const [txStatusFilter, setTxStatusFilter] = useState<TxFilterStatus>("all");
  const [txSearch, setTxSearch] = useState("");

  const isTxTab = useMemo(() => {
    return activeTab === "payments" || activeTab === "dispatch" || activeTab === "receipt" || activeTab === "complete";
  }, [activeTab]);

  // ------------------------------------------------------
  // VERIFY ADMIN LOGIN
  // ------------------------------------------------------
  useEffect(() => {
    let alive = true;

    const verify = async () => {
      try {
        const user: any = await account.get();
        const email = String(user?.email || "").trim().toLowerCase();

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
        // ✅ LISTINGS env must exist — do not silently fall back
        if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
          setMessage(
            "Missing Appwrite env for listings. Set NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID in Vercel."
          );
          setListings([]);
          setTransactions([]);
          return;
        }

        // Transactions tabs
        if (isTxTab) {
          if (!TRANSACTIONS_DB_ID || !TRANSACTIONS_COLLECTION_ID) {
            setMessage(
              "Missing Appwrite env for transactions. Set NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID."
            );
            setTransactions([]);
            setListings([]);
            return;
          }

          // ✅ Use REAL transaction_status values from your scheduler
          const txQueries: string[] = [Query.orderDesc("$updatedAt"), Query.limit(250)];

          if (activeTab === "dispatch") txQueries.push(Query.equal("transaction_status", "dispatch_pending"));
          if (activeTab === "receipt") txQueries.push(Query.equal("transaction_status", "receipt_pending"));
          if (activeTab === "complete") txQueries.push(Query.equal("transaction_status", "complete"));

          /**
           * payments tab = audit the “action required” cases
           * - payment_status = unpaid
           * - OR transaction_status = payment_failed
           *
           * Appwrite doesn’t support OR well in a single query,
           * so we do two small queries and merge unique.
           */
          if (activeTab === "payments") {
            const [unpaidRes, failedRes] = await Promise.all([
              databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, [
                Query.equal("payment_status", "unpaid"),
                Query.orderDesc("$updatedAt"),
                Query.limit(250),
              ]),
              databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, [
                Query.equal("transaction_status", "payment_failed"),
                Query.orderDesc("$updatedAt"),
                Query.limit(250),
              ]),
            ]);

            const byId = new Map<string, any>();
            for (const d of unpaidRes.documents) byId.set(d.$id, d);
            for (const d of failedRes.documents) byId.set(d.$id, d);

            setTransactions(Array.from(byId.values()));
            setListings([]);
            return;
          }

          const res = await databases.listDocuments(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, txQueries);
          setTransactions(res.documents);
          setListings([]);
          return;
        }

        // Listing tabs
        const statusFilter = activeTab === "pending" ? "pending_approval" : activeTab;

        const res = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
          Query.equal("status", statusFilter),
          Query.orderDesc("$updatedAt"),
          Query.limit(200),
        ]);

        setListings(res.documents);
        setTransactions([]);
      } catch (err) {
        console.error("Failed to load admin data:", err);
        setMessage("Failed to load data from Appwrite (check DB/Collection IDs + permissions + schema).");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authState, activeTab, isTxTab]);

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
          // server will fetch truth anyway; keep for backwards compatibility
          sellerEmail: selectedListing.seller_email || selectedListing.sellerEmail,
          interesting_fact: selectedListing.admin_notes || selectedListing.interesting_fact || "",
          starting_price: Number(selectedListing.starting_price) || 0,
          reserve_price: Number(selectedListing.reserve_price) || 0,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("approve-listing: failed to parse JSON", e);
      }

      if (!res.ok || data?.error) {
        console.error("approve-listing error:", { status: res.status, statusText: res.statusText, data });
        throw new Error(data?.error || "Failed to approve listing.");
      }

      setMessage(`Listing "${title}" approved & queued.`);
      setSelectedListing(null);
      setActiveTab("queued");
    } catch (err) {
      console.error(err);
      alert("Failed to approve listing.");
    }
  };

  // ------------------------------------------------------
  // REJECT LISTING (now with reason)
  // ------------------------------------------------------
  const rejectListing = async (doc: any) => {
    if (!doc) return;

    const title = getListingTitle(doc);

    const reasonInput = window.prompt(
      `Reject "${title}" — add a short reason for the seller (recommended):`,
      ""
    );

    // If they hit cancel, abort. If they submit empty, we still allow reject.
    if (reasonInput === null) return;

    const reason = trimReason(reasonInput);

    try {
      const res = await fetch("/api/admin/reject-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: doc.$id,
          reason,
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

      setMessage(`Listing "${title}" rejected.${reason ? " (Reason sent)" : ""}`);
      setSelectedListing(null);

      const statusFilter = activeTab === "pending" ? "pending_approval" : activeTab;

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", statusFilter),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);
      setListings(updated.documents);
    } catch (err: any) {
      console.error("rejectListing error:", err);
      alert(err.message || "Failed to reject listing.");
    }
  };

  // ------------------------------------------------------
  // DELETE LISTING (server-only)
  // ------------------------------------------------------
  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;

    try {
      setLoading(true);

      const res = await fetch("/api/admin/delete-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("delete-listing: failed to parse JSON", e);
      }

      if (!res.ok || data?.error) {
        console.error("delete-listing error:", { status: res.status, statusText: res.statusText, data });
        throw new Error(data?.error || "Failed to delete listing.");
      }

      const statusFilter = activeTab === "pending" ? "pending_approval" : activeTab;

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", statusFilter),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);

      setListings(updated.documents);
      setMessage("Listing deleted.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete listing.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------
  // MARK LISTING SOLD
  // (This looks like legacy/manual tooling; leaving as-is for now.)
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

      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("mark-sold: failed to parse JSON", e);
      }

      if (!res.ok) {
        console.error("mark-sold error:", { status: res.status, statusText: res.statusText, data });
        alert((data && data.error) || `Failed to mark as sold (HTTP ${res.status}).`);
        return;
      }

      setMessage(`Listing "${title}" marked as sold and transaction created.`);

      const updated = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("status", "live"),
        Query.orderDesc("$updatedAt"),
        Query.limit(200),
      ]);
      setListings(updated.documents);
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
  // Derived: filtered transactions (client-side)
  // ------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    let rows = [...transactions];

    // ✅ HARD RULE: admin dashboard lists must exclude archived transactions
    // We do this client-side to avoid schema/index surprises.
    rows = rows.filter((tx) => {
      const v = (tx as any)?.archived;
      return !(v === true || String(v).toLowerCase() === "true");
    });

    const p = txPaymentFilter;
    if (p !== "all") {
      rows = rows.filter((tx) => {
        const paymentStatus = String(tx.payment_status || "").toLowerCase();
        const txStatus = String(tx.transaction_status || "").toLowerCase();

        if (p === "paid") return paymentStatus === "paid";
        if (p === "unpaid") return paymentStatus === "unpaid";
        if (p === "failed") return paymentStatus === "failed" || txStatus === "payment_failed";
        return true;
      });
    }

    const s = txStatusFilter;
    if (s !== "all") {
      rows = rows.filter((tx) => String(tx.transaction_status || "").toLowerCase() === s);
    }

    const q = txSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((tx) => {
        const hay = [
          txItemLabel(tx),
          tx.listing_id || tx.plate_id,
          tx.seller_email,
          tx.buyer_email,
          tx.stripe_payment_intent_id,
          tx.payment_failure_reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // newest first
    rows.sort((a, b) => {
      const at = Date.parse(txUpdated(a) || txCreated(a) || a.$createdAt || "");
      const bt = Date.parse(txUpdated(b) || txCreated(b) || b.$createdAt || "");
      return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
    });

    return rows;
  }, [transactions, txPaymentFilter, txStatusFilter, txSearch]);

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
      <div className="max-w-6xl mx-auto bg-white rounded-2xl p-8 shadow-lg border border-neutral-200">
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
        <div className="flex flex-wrap gap-3 border-b pb-3 items-end">
          <div className="flex flex-wrap gap-3">
            {LISTING_TABS.map((t) => (
              <button
                key={t.key}
                className={`pb-2 font-semibold ${
                  activeTab === t.key ? "border-b-4 border-orange-500 text-orange-700" : "text-neutral-500"
                }`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mx-2 hidden md:block text-neutral-300">|</div>

          <div className="flex flex-wrap gap-3">
            {TX_TABS.map((t) => (
              <button
                key={t.key}
                className={`pb-2 font-semibold ${
                  activeTab === t.key ? "border-b-4 border-orange-500 text-orange-700" : "text-neutral-500"
                }`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Link href="/admin/auction-manager" className="ml-auto pb-2 font-semibold text-neutral-600 hover:text-orange-700">
            Auction Manager
          </Link>
        </div>

        {message && <p className="bg-green-100 text-green-700 p-3 rounded-md my-4 font-semibold">{message}</p>}

        {loading && <p className="text-center text-neutral-600 mt-10 text-lg">Loading…</p>}

        {/* LISTINGS VIEW */}
        {!loading && !isTxTab && (
          <>
            {listings.length === 0 ? (
              <p className="text-sm text-neutral-600 mt-6">No listings in this tab.</p>
            ) : (
              listings.map((doc) => {
                const title = getListingTitle(doc);
                const meta = getListingMeta(doc);
                const buyNow = pickBuyNow(doc);

                const extra =
                  String(doc?.gear_type || "").toLowerCase() === "camera" && typeof doc?.shutter_count === "number"
                    ? `Shutter count: ${doc.shutter_count.toLocaleString("en-GB")}`
                    : String(doc?.gear_type || "").toLowerCase() === "lens"
                    ? [doc?.lens_mount ? `Mount: ${doc.lens_mount}` : "", doc?.focal_length || "", doc?.max_aperture || ""]
                        .filter(Boolean)
                        .join(" • ")
                    : "";

                const listingIdDisplay =
                  String(doc?.listing_id || "").trim() || `AMC-${String(doc.$id).slice(-6).toUpperCase()}`;

                return (
                  <div key={doc.$id} className="border rounded-xl p-5 bg-neutral-50 shadow-sm mt-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 text-sm text-neutral-800">
                        <h2 className="text-2xl font-bold text-orange-700 mb-1">{title}</h2>

                        {meta ? <p className="text-xs text-neutral-600 font-semibold">{meta}</p> : null}
                        {extra ? <p className="text-xs text-neutral-600">{extra}</p> : null}

                        <p className="mt-2">
                          <strong>Listing ID:</strong> {listingIdDisplay}
                        </p>

                        <p>
                          <strong>Seller Email:</strong> {doc.seller_email || doc.sellerEmail || "—"}
                        </p>

                        <p>
                          <strong>Reserve:</strong> {formatMoney(typeof doc.reserve_price === "number" ? doc.reserve_price : 0)}
                        </p>

                        <p>
                          <strong>Starting price:</strong> {formatMoney(typeof doc.starting_price === "number" ? doc.starting_price : 0)}
                        </p>

                        <p>
                          <strong>Buy Now:</strong> {typeof buyNow === "number" ? formatMoney(buyNow) : "—"}
                        </p>

                        <p className="mt-2">
                          <strong>Status:</strong>{" "}
                          {doc.status === "queued" ? (
                            <span className="text-blue-700 font-bold">Approved / Queued</span>
                          ) : (
                            doc.status || "—"
                          )}
                        </p>

                        {doc.description ? (
                          <p className="mt-2">
                            <strong>Description:</strong> {doc.description}
                          </p>
                        ) : null}

                        <div className="mt-2">
                          <AdminAuctionTimer start={doc.auction_start} end={doc.auction_end} status={doc.status} />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <button
                          onClick={() => deleteListing(doc.$id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold"
                        >
                          Delete
                        </button>

                        {PUBLIC_LISTING_STATUSES.has(String(doc.status || "")) && (
                          <a
                            href={`/listing/${doc.$id}`}
                            target="_blank"
                            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700"
                            rel="noreferrer"
                          >
                            View Full Listing
                          </a>
                        )}

                        {activeTab === "live" && (
                          <button
                            onClick={() => markListingSold(doc)}
                            className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-emerald-700"
                          >
                            Mark as Sold
                          </button>
                        )}

                        {activeTab === "pending" && (
                          <div className="flex flex-col gap-2 mt-2 w-full">
                            <button
                              onClick={() => setSelectedListing(doc)}
                              className="bg-green-600 text-white py-2 px-4 rounded-md font-semibold w-full"
                            >
                              Review & Approve
                            </button>

                            <button
                              onClick={() => rejectListing(doc)}
                              className="bg-red-500 text-white py-2 px-4 rounded-md font-semibold w-full"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* TRANSACTIONS VIEW */}
        {!loading && isTxTab && (
          <div className="mt-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-orange-700">
                  {activeTab === "payments"
                    ? "Payments Audit (Action required)"
                    : activeTab === "dispatch"
                    ? "Dispatch Pending"
                    : activeTab === "receipt"
                    ? "Receipt Pending"
                    : "Completed Transactions"}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  These rows come from the Transactions collection (payment + fulfilment audit trail).
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  placeholder="Search email, listing id, PaymentIntent…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />

                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={txPaymentFilter}
                  onChange={(e) => setTxPaymentFilter(e.target.value as TxFilterPayment)}
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value as TxFilterStatus)}
                >
                  <option value="all">All statuses</option>
                  <option value="dispatch_pending">Dispatch pending</option>
                  <option value="receipt_pending">Receipt pending</option>
                  <option value="complete">Complete</option>
                  <option value="payment_failed">Payment failed</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-neutral-600">
                {activeTab === "payments"
                  ? "No payment issues found."
                  : activeTab === "dispatch"
                  ? "No dispatch-pending transactions."
                  : activeTab === "receipt"
                  ? "No receipt-pending transactions."
                  : "No completed transactions yet."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-xs md:text-sm">
                  <thead className="bg-neutral-100 text-neutral-700">
                    <tr>
                      <th className="py-2 px-2">Item</th>
                      <th className="py-2 px-2">Listing</th>
                      <th className="py-2 px-2">Seller</th>
                      <th className="py-2 px-2">Buyer</th>
                      <th className="py-2 px-2">Sale</th>
                      <th className="py-2 px-2">Commission</th>
                      <th className="py-2 px-2">Payout</th>
                      <th className="py-2 px-2">Payment</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">PaymentIntent</th>
                      <th className="py-2 px-2">Updated</th>
                      <th className="py-2 px-2 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-200">
                    {filteredTransactions.map((tx) => {
                      const salePrice = safeNumber(tx.sale_price) ?? 0;
                      const commissionAmount = safeNumber(tx.commission_amount) ?? 0;
                      const commissionRate = safeNumber(tx.commission_rate) ?? 0;
                      const sellerPayout = safeNumber(tx.seller_payout) ?? 0;

                      const paymentStatus = String(tx.payment_status || "—");
                      const txStatus = String(tx.transaction_status || "—");
                      const pi = String(tx.stripe_payment_intent_id || "").trim();

                      return (
                        <tr key={tx.$id} className="hover:bg-neutral-50">
                          <td className="py-2 px-2 whitespace-nowrap">{txItemLabel(tx)}</td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.listing_id || tx.plate_id || "-"}
                            {tx.listing_id ? (
                              <a
                                href={`/listing/${tx.listing_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-xs text-blue-600 underline"
                              >
                                View listing
                              </a>
                            ) : null}
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap">{tx.seller_email || "-"}</td>
                          <td className="py-2 px-2 whitespace-nowrap">{tx.buyer_email || "-"}</td>

                          <td className="py-2 px-2 whitespace-nowrap">£{salePrice.toLocaleString("en-GB")}</td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            £{commissionAmount.toLocaleString("en-GB")} ({commissionRate}%)
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap font-semibold">£{sellerPayout.toLocaleString("en-GB")}</td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs ${badgeClass(
                                paymentBadgeKind(paymentStatus) as any
                              )}`}
                            >
                              {paymentStatus}
                            </span>
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs ${badgeClass(
                                txStatusBadgeKind(txStatus) as any
                              )}`}
                            >
                              {txStatus}
                            </span>
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            {pi ? (
                              <span title={pi} className="font-mono text-[11px] md:text-xs">
                                {pi.length > 18 ? `${pi.slice(0, 10)}…${pi.slice(-6)}` : pi}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap">{formatDateTime(txUpdated(tx) || txCreated(tx))}</td>

                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <a href={`/admin/transaction/${tx.$id}`} className="text-xs text-blue-600 underline">
                              View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REVIEW MODAL */}
        {selectedListing && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg relative">
              <button
                onClick={() => setSelectedListing(null)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-black text-xl"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-orange-700 mb-1">{getListingTitle(selectedListing)}</h2>
              <p className="text-xs text-neutral-600 font-semibold mb-3">{getListingMeta(selectedListing)}</p>

              <label className="block mt-2 font-semibold text-sm">Seller description (read-only)</label>
              <div className="border rounded-md p-2 text-sm bg-neutral-50 whitespace-pre-line max-h-32 overflow-y-auto">
                {selectedListing.description || "No description provided by seller."}
              </div>

              <label className="block mt-3 font-semibold text-sm">Reserve Price (£)</label>
              <input
                type="number"
                className="border w-full p-2 rounded-md text-sm"
                value={Number(selectedListing.reserve_price ?? 0)}
                onChange={(e) =>
                  setSelectedListing({
                    ...selectedListing,
                    reserve_price: Number(e.target.value || 0),
                  })
                }
              />

              <label className="block mt-3 font-semibold text-sm">Starting Price (£)</label>
              <input
                type="number"
                className="border w-full p-2 rounded-md text-sm"
                value={Number(selectedListing.starting_price ?? 0)}
                onChange={(e) =>
                  setSelectedListing({
                    ...selectedListing,
                    starting_price: Number(e.target.value || 0),
                  })
                }
              />

              <label className="block mt-4 font-semibold text-sm">Admin notes (optional)</label>
              <textarea
                className="border w-full p-2 rounded-md text-sm"
                rows={4}
                value={selectedListing.admin_notes || selectedListing.interesting_fact || ""}
                onChange={(e) => setSelectedListing({ ...selectedListing, admin_notes: e.target.value })}
              />

              <div className="mt-6 flex justify-between">
                <button onClick={approveListing} className="bg-green-600 text-white py-2 px-4 rounded-md font-semibold">
                  Approve
                </button>

                <button
                  onClick={() => rejectListing(selectedListing)}
                  className="bg-red-600 text-white py-2 px-4 rounded-md font-semibold"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}