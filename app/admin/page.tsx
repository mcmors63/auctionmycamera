// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
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

// Use known-good IDs with env fallbacks
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID || "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID || "plates";

// HARD-CODED: your Transactions table ID really is "transactions"
const TRANSACTIONS_COLLECTION_ID = "transactions";

type AdminTab =
  | "pending"
  | "queued"
  | "live"
  | "rejected"
  | "soldPending"
  | "complete";

// Public listing statuses – these match isIndexableStatus() on /listing/[id]
const PUBLIC_LISTING_STATUSES = new Set(["queued", "live", "sold"]);

// -----------------------------
// DVLA fee model (NEW + legacy exceptions)
// -----------------------------
const DVLA_FEE_GBP = 80;

const LEGACY_BUYER_PAYS_DVLA_IDS = new Set<string>([
  "696ea3d0001a45280a16",
  "697bccfd001325add473",
]);

function isLegacyBuyerPaysDvlaTx(tx: any) {
  const id = String(tx?.listing_id || tx?.plate_id || "").trim();
  return !!id && LEGACY_BUYER_PAYS_DVLA_IDS.has(id);
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("pending");

  const [plates, setPlates] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedPlate, setSelectedPlate] = useState<any>(null);

  // ------------------------------------------------------
  // VERIFY ADMIN LOGIN
  // ------------------------------------------------------
  useEffect(() => {
    const verify = async () => {
      try {
        const user = await account.get();

        if (
          user.email === "admin@auctionmyplate.co.uk" &&
          typeof window !== "undefined" &&
          localStorage.getItem("adminLoggedIn") === "true"
        ) {
          setAuthorized(true);
        } else {
          router.push("/admin-login");
        }
      } catch {
        router.push("/admin-login");
      }
    };

    verify();
  }, [router]);

  // ------------------------------------------------------
  // LOAD LISTINGS / TRANSACTIONS
  // ------------------------------------------------------
  useEffect(() => {
    if (!authorized) return;

    const load = async () => {
      setLoading(true);
      setMessage("");

      try {
        if (activeTab === "soldPending" || activeTab === "complete") {
          // Transactions view
          const txStatus = activeTab === "soldPending" ? "pending" : "complete";

          const res = await databases.listDocuments(
            DB_ID,
            TRANSACTIONS_COLLECTION_ID,
            [Query.equal("transaction_status", txStatus)]
          );

          setTransactions(res.documents);
          setPlates([]);
        } else {
          // Listings view
          const res = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
            Query.equal("status", activeTab),
          ]);

          setPlates(res.documents);
          setTransactions([]);
        }
      } catch (err) {
        console.error("Failed to load admin data:", err);
        setMessage("Failed to load data from Appwrite.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authorized, activeTab]);

  // ------------------------------------------------------
  // APPROVE LISTING (server-only)
  // ------------------------------------------------------
  const approvePlate = async () => {
    if (!selectedPlate) return;

    try {
      // 1) Call the API to do all approval logic (status, prices, facts, auction window)
      const res = await fetch("/api/approve-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedPlate.$id,
          sellerEmail: selectedPlate.seller_email,
          interesting_fact: selectedPlate.interesting_fact || "",
          starting_price: Number(selectedPlate.starting_price) || 0,
          reserve_price: Number(selectedPlate.reserve_price) || 0,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("approve-listing: failed to parse JSON", e);
      }

      if (!res.ok || data?.error) {
        console.error("approve-listing error:", {
          status: res.status,
          statusText: res.statusText,
          data,
        });
        throw new Error(data?.error || "Failed to approve plate.");
      }

      // 2) UI feedback
      setMessage(`Plate ${selectedPlate.registration} approved & queued`);
      setSelectedPlate(null);

      // 3) Switch to queued so you can immediately see it moved
      // (Your existing useEffect will reload the list for the new tab)
      setActiveTab("queued");
    } catch (err) {
      console.error(err);
      alert("Failed to approve plate.");
    }
  };

  // ------------------------------------------------------
  // REJECT LISTING (server API, defensive JSON handling)
  // ------------------------------------------------------
  const rejectPlate = async (plate: any) => {
    if (!plate) return;

    if (!window.confirm(`Are you sure you want to reject ${plate.registration}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/reject-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateId: plate.$id,
          registration: plate.registration,
          sellerEmail: plate.seller_email,
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
        throw new Error(
          `Server returned an unexpected response while rejecting listing (HTTP ${res.status}).`
        );
      }

      if (!res.ok || data?.error) {
        console.error("Reject API error payload:", data);
        throw new Error(data?.error || "Failed to reject plate.");
      }

      setMessage(`Plate ${plate.registration} rejected.`);
      setSelectedPlate(null);

      const updated = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
        Query.equal("status", activeTab),
      ]);
      setPlates(updated.documents);
    } catch (err: any) {
      console.error("rejectPlate error:", err);
      alert(err.message || "Failed to reject plate.");
    }
  };

  // ------------------------------------------------------
  // DELETE LISTING
  // ------------------------------------------------------
  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    try {
      await databases.deleteDocument(DB_ID, PLATES_COLLECTION_ID, id);

      const updated = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
        Query.equal("status", activeTab),
      ]);

      setPlates(updated.documents);
      setMessage("Listing deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete listing.");
    }
  };

  // ------------------------------------------------------
  // MARK LISTING SOLD -> creates Transaction row (calls API)
  // ------------------------------------------------------
  const markListingSold = async (listing: any) => {
    const salePriceStr = window.prompt(
      `Enter final sale price for ${listing.registration}:`,
      listing.current_bid?.toString() || ""
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
          plateId: listing.$id,
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
        console.error("mark-sold error:", {
          status: res.status,
          statusText: res.statusText,
          data,
        });
        alert(
          (data && data.error) ||
            `Failed to mark as sold (HTTP ${res.status}). Check server logs.`
        );
        return;
      }

      setMessage(
        `Listing ${listing.registration} marked as sold and transaction created.`
      );

      const updated = await databases.listDocuments(DB_ID, PLATES_COLLECTION_ID, [
        Query.equal("status", "live"),
      ]);
      setPlates(updated.documents);
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
    await account.deleteSession("current");
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminLoggedIn");
    }
    router.push("/admin-login");
  };

  // ------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------
  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `£${value.toLocaleString("en-GB")}`;
  };

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  return (
    <div className="min-h-screen bg-yellow-50 py-10 px-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl p-8 shadow-lg">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          {/* Left: title + DVLA guide link */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-yellow-700">Admin Dashboard</h1>

            <Link
              href="/admin/dvla-transfer-guide"
              className="inline-flex items-center text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
            >
              DVLA Transfer Guide
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          </div>

          {/* Right: logout */}
          <button className="text-red-600 font-semibold" onClick={logout}>
            Logout
          </button>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-6 border-b pb-3">
          {["pending", "queued", "live", "rejected", "soldPending", "complete"].map(
            (t) => (
              <button
                key={t}
                className={`pb-2 font-semibold ${
                  activeTab === t
                    ? "border-b-4 border-yellow-500 text-yellow-700"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab(t as AdminTab)}
              >
                {t === "queued"
                  ? "Approved / Queued"
                  : t === "soldPending"
                  ? "Sold / Pending"
                  : t === "complete"
                  ? "Complete"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            )
          )}

          <a
            href="/admin/auction-manager"
            className="ml-auto pb-2 font-semibold text-gray-600 hover:text-yellow-700"
          >
            Auction Manager
          </a>
        </div>

        {message && (
          <p className="bg-green-100 text-green-700 p-3 rounded-md my-4 font-semibold">
            {message}
          </p>
        )}

        {loading && (
          <p className="text-center text-gray-600 mt-10 text-lg">Loading…</p>
        )}

        {/* LISTINGS VIEW (Pending / Queued / Live / Rejected) */}
        {!loading &&
          activeTab !== "soldPending" &&
          activeTab !== "complete" &&
          plates.map((p) => (
            <div
              key={p.$id}
              className="border rounded-xl p-5 bg-gray-50 shadow-sm mt-5"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 text-sm text-gray-800">
                  <h2 className="text-2xl font-bold text-yellow-700 mb-1">
                    {p.registration}
                  </h2>

                  <p>
                    <strong>Plate Type:</strong> {p.plate_type || "—"}
                  </p>

                  {p.expiry_date && (
                    <p>
                      <strong>Retention Expiry:</strong>{" "}
                      {formatDateTime(p.expiry_date)}
                    </p>
                  )}

                  <p>
                    <strong>Reserve:</strong>{" "}
                    {formatMoney(
                      typeof p.reserve_price === "number" ? p.reserve_price : 0
                    )}
                  </p>

                  <p>
                    <strong>Starting Price:</strong>{" "}
                    {formatMoney(
                      typeof p.starting_price === "number" ? p.starting_price : 0
                    )}
                  </p>

                  <p>
                    <strong>Buy Now:</strong>{" "}
                    {typeof p.buy_now === "number" ? formatMoney(p.buy_now) : "—"}
                  </p>

                  <p>
                    <strong>Relist until sold:</strong>{" "}
                    {p.relist_until_sold ? "Yes" : "No"}
                  </p>

                  <p>
                    <strong>Seller Email:</strong> {p.seller_email || "—"}
                  </p>

                  {p.description && (
                    <p className="mt-1">
                      <strong>Description:</strong> {p.description}
                    </p>
                  )}

                  <div className="mt-2 text-xs text-gray-700 space-y-1">
                    <p>
                      <strong>Listing fee:</strong>{" "}
                      {formatMoney(
                        typeof p.listing_fee === "number" ? p.listing_fee : 0
                      )}
                    </p>
                    <p>
                      <strong>Commission rate:</strong>{" "}
                      {typeof p.commission_rate === "number"
                        ? `${p.commission_rate}%`
                        : "—"}
                    </p>
                    <p>
                      <strong>Estimated seller return:</strong>{" "}
                      {formatMoney(
                        typeof p.expected_return === "number"
                          ? p.expected_return
                          : 0
                      )}
                    </p>
                  </div>

                  <p className="mt-2">
                    <strong>Status:</strong>{" "}
                    {p.status === "queued" ? (
                      <span className="text-blue-700 font-bold">
                        Approved / Queued
                      </span>
                    ) : (
                      p.status
                    )}
                  </p>

                  <div className="mt-2">
                    <AdminAuctionTimer
                      start={p.auction_start}
                      end={p.auction_end}
                      status={p.status}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => deleteListing(p.$id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold"
                  >
                    Delete
                  </button>

                  {/* Only show public "View Full Listing" if status is public */}
                  {PUBLIC_LISTING_STATUSES.has(p.status) && (
                    <a
                      href={`/listing/${p.$id}`}
                      target="_blank"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700"
                    >
                      View Full Listing
                    </a>
                  )}

                  {activeTab === "live" && (
                    <button
                      onClick={() => markListingSold(p)}
                      className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-emerald-700"
                    >
                      Mark as Sold
                    </button>
                  )}

                  {activeTab === "pending" && (
                    <div className="flex flex-col gap-2 mt-2 w-full">
                      <button
                        onClick={() => setSelectedPlate(p)}
                        className="bg-green-600 text-white py-2 px-4 rounded-md font-semibold w-full"
                      >
                        Review & Approve
                      </button>

                      <button
                        onClick={() => rejectPlate(p)}
                        className="bg-red-500 text-white py-2 px-4 rounded-md font-semibold w-full"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        {/* TRANSACTIONS VIEW (Sold / Pending + Complete) */}
        {!loading && activeTab === "soldPending" && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Sold / Pending (Paperwork &amp; Payment)
            </h2>

            {transactions.length === 0 ? (
              <p className="text-sm text-gray-600">
                No sold plates waiting for paperwork or payment.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-xs md:text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-2 px-2">Reg</th>
                      <th className="py-2 px-2">Listing ID</th>
                      <th className="py-2 px-2">Seller Email</th>
                      <th className="py-2 px-2">Buyer Email</th>
                      <th className="py-2 px-2">Sale Price</th>
                      <th className="py-2 px-2">Commission</th>
                      <th className="py-2 px-2">Seller Payout</th>
                      <th className="py-2 px-2">DVLA Fee</th>
                      <th className="py-2 px-2">Payment Status</th>
                      <th className="py-2 px-2">Transaction Status</th>
                      <th className="py-2 px-2">Created</th>
                      <th className="py-2 px-2">Updated</th>
                      <th className="py-2 px-2 text-center">Docs</th>
                      <th className="py-2 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => {
                      const buyerDocsUploaded = tx.buyerDocsUploaded;
                      const sellerDocsUploaded = tx.sellerDocsUploaded;

                      const buyerDocCount = Array.isArray(tx.buyerDocFiles)
                        ? tx.buyerDocFiles.length
                        : 0;

                      const sellerDocCount = Array.isArray(tx.sellerDocFiles)
                        ? tx.sellerDocFiles.length
                        : 0;

                      return (
                        <tr key={tx.$id} className="hover:bg-yellow-50">
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.registration || "-"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.listing_id || "-"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.seller_email}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.buyer_email || "-"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            £{(tx.sale_price ?? 0).toLocaleString("en-GB")}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            £{(tx.commission_amount ?? 0).toLocaleString("en-GB")} (
                            {tx.commission_rate ?? 0}
                            %)
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap font-semibold">
                            £{(tx.seller_payout ?? 0).toLocaleString("en-GB")}
                          </td>

                          {/* DVLA fee + payer label */}
                          <td className="py-2 px-2 whitespace-nowrap">
                            £{((tx.dvla_fee ?? DVLA_FEE_GBP) as number).toLocaleString(
                              "en-GB"
                            )}{" "}
                            <span className="text-[11px] text-gray-500">
                              ({isLegacyBuyerPaysDvlaTx(tx)
                                ? "paid by buyer (legacy)"
                                : "paid by seller"})
                            </span>
                          </td>

                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.payment_status || "pending"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.transaction_status || "pending"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleString("en-GB")
                              : "-"}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            {tx.updated_at
                              ? new Date(tx.updated_at).toLocaleString("en-GB")
                              : "-"}
                          </td>

                          <td className="py-2 px-2 text-center text-xs">
                            {!buyerDocsUploaded && !sellerDocsUploaded && (
                              <span className="text-[11px] text-gray-500">
                                None
                              </span>
                            )}

                            {buyerDocsUploaded && (
                              <div className="text-[11px]">
                                <span className="inline-block rounded bg-green-100 text-green-800 px-1 mr-1">
                                  Buyer
                                </span>
                                {buyerDocCount} file
                                {buyerDocCount === 1 ? "" : "s"}
                              </div>
                            )}

                            {sellerDocsUploaded && (
                              <div className="text-[11px]">
                                <span className="inline-block rounded bg-blue-100 text-blue-800 px-1 mr-1">
                                  Seller
                                </span>
                                {sellerDocCount} file
                                {sellerDocCount === 1 ? "" : "s"}
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-2 text-center space-x-2 whitespace-nowrap">
                            <a
                              href={`/admin/transaction/${tx.$id}`}
                              className="text-xs text-blue-600 underline"
                            >
                              View
                            </a>
                            <button
                              type="button"
                              className="text-xs text-red-600 underline"
                              onClick={async () => {
                                const reasonInput = window.prompt(
                                  "Reason for deleting / archiving this transaction? (This will be stored for record keeping.)",
                                  ""
                                );

                                if (reasonInput === null) return;

                                const reason = reasonInput.trim();
                                if (!reason) {
                                  alert(
                                    "Please enter a reason, or press Cancel to abort."
                                  );
                                  return;
                                }

                                try {
                                  const res = await fetch(
                                    "/api/admin/delete-transaction",
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        txId: tx.$id,
                                        reason,
                                      }),
                                    }
                                  );

                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok || data.error) {
                                    console.error("Delete transaction failed:", data);
                                    alert(
                                      data.error ||
                                        "Failed to delete (archive) transaction."
                                    );
                                    return;
                                  }

                                  setTransactions((prev) =>
                                    prev.filter((row) => row.$id !== tx.$id)
                                  );

                                  alert("Transaction archived as deleted.");
                                } catch (err) {
                                  console.error("Delete transaction failed:", err);
                                  alert("Failed to delete transaction.");
                                }
                              }}
                            >
                              Delete
                            </button>
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

        {/* COMPLETE TAB */}
        {!loading && activeTab === "complete" && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-2 text-yellow-700">
              Completed Transactions
            </h2>

            {transactions.length === 0 ? (
              <p className="text-sm text-gray-600">
                No completed transactions yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-xs md:text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-2 px-2">Reg</th>
                      <th className="py-2 px-2">Listing ID</th>
                      <th className="py-2 px-2">Seller Email</th>
                      <th className="py-2 px-2">Buyer Email</th>
                      <th className="py-2 px-2">Sale Price</th>
                      <th className="py-2 px-2">Commission</th>
                      <th className="py-2 px-2">Seller Payout</th>
                      <th className="py-2 px-2">DVLA Fee</th>
                      <th className="py-2 px-2">Payment Status</th>
                      <th className="py-2 px-2">Transaction Status</th>
                      <th className="py-2 px-2">Created</th>
                      <th className="py-2 px-2">Updated</th>
                      <th className="py-2 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.$id} className="hover:bg-yellow-50">
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.registration || "-"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.listing_id || "-"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.seller_email}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.buyer_email || "-"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          £{(tx.sale_price ?? 0).toLocaleString("en-GB")}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          £{(tx.commission_amount ?? 0).toLocaleString("en-GB")} (
                          {tx.commission_rate ?? 0}%)
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap font-semibold">
                          £{(tx.seller_payout ?? 0).toLocaleString("en-GB")}
                        </td>

                        {/* DVLA fee + payer label */}
                        <td className="py-2 px-2 whitespace-nowrap">
                          £{((tx.dvla_fee ?? DVLA_FEE_GBP) as number).toLocaleString(
                            "en-GB"
                          )}{" "}
                          <span className="text-[11px] text-gray-500">
                            ({isLegacyBuyerPaysDvlaTx(tx)
                              ? "paid by buyer (legacy)"
                              : "paid by seller"})
                          </span>
                        </td>

                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.payment_status || "pending"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.transaction_status || "pending"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleString("en-GB")
                            : "-"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {tx.updated_at
                            ? new Date(tx.updated_at).toLocaleString("en-GB")
                            : "-"}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <a
                            href={`/admin/transaction/${tx.$id}`}
                            className="text-xs text-blue-600 underline"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REVIEW MODAL */}
        {selectedPlate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg relative">
              <button
                onClick={() => setSelectedPlate(null)}
                className="absolute right-3 top-3 text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-yellow-700 mb-3">
                {selectedPlate.registration}
              </h2>

              <p className="text-sm mb-2">
                <strong>Plate Type:</strong> {selectedPlate.plate_type}
              </p>

              {/* USER DESCRIPTION (read-only – what seller entered) */}
              <label className="block mt-2 font-semibold text-sm">
                Seller description (read-only)
              </label>
              <div className="border rounded-md p-2 text-sm bg-gray-50 whitespace-pre-line max-h-32 overflow-y-auto">
                {selectedPlate.description || "No description provided by seller."}
              </div>

              {/* RESERVE */}
              <label className="block mt-3 font-semibold text-sm">
                Reserve Price (£)
              </label>
              <input
                type="number"
                className="border w-full p-2 rounded-md text-sm"
                value={selectedPlate.reserve_price}
                onChange={(e) =>
                  setSelectedPlate({
                    ...selectedPlate,
                    reserve_price: e.target.value,
                  })
                }
              />

              {/* STARTING PRICE */}
              <label className="block mt-3 font-semibold text-sm">
                Starting Price (£)
              </label>
              <input
                type="number"
                className="border w-full p-2 rounded-md text-sm"
                value={selectedPlate.starting_price || 0}
                onChange={(e) =>
                  setSelectedPlate({
                    ...selectedPlate,
                    starting_price: e.target.value,
                  })
                }
              />

              {/* HISTORY / INTERESTING FACT – THIS IS WHAT SHOWS ON THE LISTING PAGE */}
              <label className="block mt-4 font-semibold text-sm">
                Plate history &amp; interesting facts
              </label>
              <textarea
                className="border w-full p-2 rounded-md text-sm"
                rows={4}
                value={selectedPlate.interesting_fact || ""}
                onChange={(e) =>
                  setSelectedPlate({
                    ...selectedPlate,
                    interesting_fact: e.target.value,
                  })
                }
              />

              <div className="mt-6 flex justify-between">
                <button
                  onClick={approvePlate}
                  className="bg-green-600 text-white py-2 px-4 rounded-md font-semibold"
                >
                  Approve
                </button>

                <button
                  onClick={() => rejectPlate(selectedPlate)}
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
