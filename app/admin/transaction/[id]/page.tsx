// app/admin/transaction/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Client, Account, Databases, Query } from "appwrite";

// -----------------------------
// Appwrite client
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID || "plates";

const TX_COLLECTION_ID = "transactions";

// -----------------------------
// Types
// -----------------------------
type TxDoc = {
  $id: string;
  registration?: string;
  listing_id?: string;
  sale_price?: number;
  seller_payout?: number;
  seller_email?: string;
  buyer_email?: string;
  payment_status?: string;
  transaction_status?: string;

  seller_docs_requested?: boolean;
  seller_docs_received?: boolean;
  seller_payment_transferred?: boolean;
  seller_process_complete?: boolean;

  buyer_info_requested?: boolean;
  buyer_info_received?: boolean;
  buyer_tax_mot_validated?: boolean;
  buyer_payment_taken?: boolean;
  buyer_transfer_complete?: boolean;

  documents?: any[];

  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export default function AdminTransactionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [authorized, setAuthorized] = useState(false);
  const [tx, setTx] = useState<TxDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>("");

  // Local checkbox state
  const [sellerFlags, setSellerFlags] = useState({
    seller_docs_requested: false,
    seller_docs_received: false,
    seller_payment_transferred: false,
    seller_process_complete: false,
  });

  const [buyerFlags, setBuyerFlags] = useState({
    buyer_info_requested: false,
    buyer_info_received: false,
    buyer_tax_mot_validated: false,
    buyer_payment_taken: false,
    buyer_transfer_complete: false,
  });

  // This will hold the plate document ID to use in /place_bid?id=...
  const [publicListingId, setPublicListingId] = useState<string | null>(null);

  // -----------------------------
  // Verify admin
  // -----------------------------
  useEffect(() => {
    const verify = async () => {
      try {
        const user = await account.get();
        if (
          user.email === "admin@auctionmyplate.co.uk" &&
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

  // -----------------------------
  // Load transaction + resolve plate ID
  // -----------------------------
  useEffect(() => {
    if (!authorized || !id) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const doc: any = await databases.getDocument(
          DB_ID,
          TX_COLLECTION_ID,
          id
        );

        setTx(doc);

        setSellerFlags({
          seller_docs_requested: !!doc.seller_docs_requested,
          seller_docs_received: !!doc.seller_docs_received,
          seller_payment_transferred: !!doc.seller_payment_transferred,
          seller_process_complete: !!doc.seller_process_complete,
        });

        setBuyerFlags({
          buyer_info_requested: !!doc.buyer_info_requested,
          buyer_info_received: !!doc.buyer_info_received,
          buyer_tax_mot_validated: !!doc.buyer_tax_mot_validated,
          buyer_payment_taken: !!doc.buyer_payment_taken,
          buyer_transfer_complete: !!doc.buyer_transfer_complete,
        });

        // 🔍 Find the plate document for this transaction using listing_id
        if (doc.listing_id) {
          try {
            const platesRes = await databases.listDocuments(
              DB_ID,
              PLATES_COLLECTION_ID,
              [Query.equal("listing_id", doc.listing_id)]
            );

            if (platesRes.documents.length > 0) {
              // Use this in /place_bid?id=...
              setPublicListingId(platesRes.documents[0].$id);
            } else {
              console.warn(
                "No plate found for transaction listing_id",
                doc.listing_id
              );
            }
          } catch (lookupErr) {
            console.error(
              "Failed to resolve plate for transaction:",
              lookupErr
            );
          }
        }
      } catch (err) {
        console.error("Failed to load transaction:", err);
        setError("Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authorized, id]);

  const formatMoney = (value?: number) =>
    value == null ? "-" : `£${value.toLocaleString("en-GB")}`;

  if (!authorized) return null;

  // Business rules:
  // Payment to seller CANNOT be made until:
  // - seller_docs_received
  // - buyer_info_received
  // - buyer_tax_mot_validated
  // - buyer_payment_taken
  // - buyer_transfer_complete
  const canPaySeller =
    sellerFlags.seller_docs_received &&
    buyerFlags.buyer_info_received &&
    buyerFlags.buyer_tax_mot_validated &&
    buyerFlags.buyer_payment_taken &&
    buyerFlags.buyer_transfer_complete;

  const canMarkSellerComplete =
    canPaySeller && sellerFlags.seller_payment_transferred;

  const handleSave = async () => {
    if (!tx) return;

    setSaving(true);
    setError("");

    try {
      const payment_status =
        canPaySeller && sellerFlags.seller_payment_transferred
          ? "paid"
          : "pending";

      const transaction_status =
        canMarkSellerComplete && sellerFlags.seller_process_complete
          ? "complete"
          : "pending";

      const updateData = {
        ...sellerFlags,
        ...buyerFlags,
        payment_status,
        transaction_status,
        updated_at: new Date().toISOString(),
      };

      const updated: any = await databases.updateDocument(
        DB_ID,
        TX_COLLECTION_ID,
        tx.$id,
        updateData
      );

      setTx(updated);
      alert("Transaction updated.");
    } catch (err) {
      console.error("Failed to update transaction:", err);
      setError("Failed to update transaction.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 HARD OVERRIDE: mark complete even if flags/business rules
  const handleMarkCompleteOverride = async () => {
    if (!tx) return;

    const ok = window.confirm(
      "Force mark this transaction as COMPLETE?\n\n" +
        "Use this only when you’re happy the DVLA transfer and payments are finished."
    );
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const updateData = {
        ...sellerFlags,
        ...buyerFlags,
        payment_status: tx.payment_status || "paid",
        transaction_status: "complete",
        updated_at: new Date().toISOString(),
      };

      const updated: any = await databases.updateDocument(
        DB_ID,
        TX_COLLECTION_ID,
        tx.$id,
        updateData
      );

      setTx(updated);
      alert("Transaction marked COMPLETE.");
    } catch (err) {
      console.error("Failed to mark transaction complete:", err);
      setError("Failed to mark transaction complete.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!tx) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to remove this transaction from the main dashboard?\n\nIt will be archived for record keeping (not permanently deleted)."
    );
    if (!confirmDelete) return;

    const reasonInput = window.prompt(
      "Reason for deleting / archiving this transaction? (This will be stored on the transaction record.)",
      ""
    );

    if (reasonInput === null) return; // cancelled

    const reason = reasonInput.trim();
    if (!reason) {
      alert("Please enter a reason, or press Cancel to abort.");
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch("/api/admin/delete-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txId: tx.$id, // must match API
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Delete transaction failed:", data);
        throw new Error(data.error || "Request failed");
      }

      alert("Transaction archived as deleted.");
      router.push("/admin");
    } catch (err) {
      console.error("Delete transaction failed:", err);
      alert("Failed to delete transaction.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-yellow-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-blue-600 underline mb-4"
        >
          ← Back to Admin Dashboard
        </button>

        {loading && <p>Loading transaction…</p>}

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </p>
        )}

        {tx && (
          <>
            <h1 className="text-2xl font-bold text-yellow-700 mb-4">
              Transaction for {tx.registration || tx.listing_id}
            </h1>

            <div className="mb-4 text-sm text-gray-700 space-y-1">
              <p>
                <strong>Sale price:</strong> {formatMoney(tx.sale_price)}
              </p>
              <p>
                <strong>Seller payout:</strong>{" "}
                {formatMoney(tx.seller_payout)}
              </p>
              <p>
                <strong>Seller:</strong> {tx.seller_email}
              </p>
              <p>
                <strong>Buyer:</strong> {tx.buyer_email || "-"}
              </p>
              <p>
                <strong>Payment status:</strong>{" "}
                {tx.payment_status || "pending"}
              </p>
              <p>
                <strong>Transaction status:</strong>{" "}
                {tx.transaction_status || "pending"}
              </p>

              {publicListingId && (
                <p>
                  <a
                    href={`/place_bid?id=${publicListingId}`}
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    View public listing page
                  </a>
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Seller Section */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <h2 className="font-semibold text-lg mb-3">
                  Seller Section
                </h2>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sellerFlags.seller_docs_requested}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({
                        ...prev,
                        seller_docs_requested: e.target.checked,
                      }))
                    }
                  />
                  Documents requested
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sellerFlags.seller_docs_received}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({
                        ...prev,
                        seller_docs_received: e.target.checked,
                      }))
                    }
                  />
                  Documents received
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canPaySeller}
                    checked={sellerFlags.seller_payment_transferred}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({
                        ...prev,
                        seller_payment_transferred: e.target.checked,
                      }))
                    }
                  />
                  Payment transferred{" "}
                  {!canPaySeller && (
                    <span className="text-xs text-gray-500">
                      (requires buyer info, tax/MOT, funds & transfer
                      complete)
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canMarkSellerComplete}
                    checked={sellerFlags.seller_process_complete}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({
                        ...prev,
                        seller_process_complete: e.target.checked,
                      }))
                    }
                  />
                  Seller process complete
                </label>
              </div>

              {/* Buyer Section */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <h2 className="font-semibold text-lg mb-3">
                  Buyer Section
                </h2>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_info_requested}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({
                        ...prev,
                        buyer_info_requested: e.target.checked,
                      }))
                    }
                  />
                  Information requested
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_info_received}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({
                        ...prev,
                        buyer_info_received: e.target.checked,
                      }))
                    }
                  />
                  Information received
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_tax_mot_validated}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({
                        ...prev,
                        buyer_tax_mot_validated: e.target.checked,
                      }))
                    }
                  />
                  Tax and MOT validated
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_payment_taken}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({
                        ...prev,
                        buyer_payment_taken: e.target.checked,
                      }))
                    }
                  />
                  Payment taken
                </label>
                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_transfer_complete}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({
                        ...prev,
                        buyer_transfer_complete: e.target.checked,
                      }))
                    }
                  />
                  Transfer complete
                </label>
              </div>
            </div>

            {/* DOCUMENTS SECTION */}
<div className="mt-6 border rounded-xl p-4 bg-gray-50">
  <h2 className="font-semibold text-lg mb-2">
    Documents &amp; uploads
  </h2>
  <p className="text-xs text-gray-600 mb-3">
    These are the files attached to this transaction by the
    seller or buyer in their dashboard.
  </p>

  {Array.isArray(tx.documents) && tx.documents.length > 0 ? (
    <ul className="space-y-2 text-sm">
      {tx.documents.map((doc: any, idx: number) => {
        // Handle both "object" docs and plain string IDs just in case
        const isStringId = typeof doc === "string";

        const label =
          (!isStringId &&
            (doc.label ||
              doc.description ||
              doc.type ||
              doc.role)) ||
          `Document ${idx + 1}`;

        const fileName =
          !isStringId &&
          (doc.fileName ||
            doc.name ||
            doc.originalName ||
            doc.filename);

        const directUrl =
          !isStringId && (doc.url || doc.publicUrl || null);

        const fileId = isStringId
          ? doc
          : doc.fileId || doc.id || doc.documentId || null;

        // If we have a direct URL from when the user uploaded, use that.
        // Otherwise, if we have an Appwrite fileId, go via our view-document route.
        const viewHref = directUrl
          ? directUrl
          : fileId
          ? `/api/admin/view-document?fileId=${encodeURIComponent(
              fileId
            )}`
          : null;

        return (
          <li
            key={fileId || fileName || idx}
            className="flex items-center justify-between border-b last:border-b-0 pb-2"
          >
            <div className="mr-3 overflow-hidden">
              <p className="font-semibold truncate">{label}</p>
              {fileName && (
                <p className="text-xs text-gray-500 truncate">
                  {fileName}
                </p>
              )}
              {fileId && !directUrl && (
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">
                  ID: {fileId}
                </p>
              )}
            </div>

            {viewHref ? (
              <a
                href={viewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline"
              >
                View
              </a>
            ) : (
              <span className="text-xs text-gray-400">
                No viewable link for this file
              </span>
            )}
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-xs text-gray-500">
      No documents are attached to this transaction yet.
    </p>
  )}
</div>

            {/* ACTION BUTTONS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                onClick={handleSave}
                className="bg-yellow-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Progress"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleMarkCompleteOverride}
                className="bg-emerald-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-60"
              >
                Force Mark Complete
              </button>

              <button
                type="button"
                disabled={saving || deleting}
                onClick={handleDeleteTransaction}
                className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete Transaction"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
