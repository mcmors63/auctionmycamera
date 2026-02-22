// app/admin/transaction/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Client, Account, Databases } from "appwrite";

// -----------------------------
// Appwrite client (browser)
// -----------------------------
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

// ✅ Single source of truth for admin email
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@auctionmycamera.co.uk")
  .trim()
  .toLowerCase();

// ✅ Transactions DB/Collection (keep flexible, but remove duplicates)
const TRANSACTIONS_DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID ||
  "transactions";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

// -----------------------------
// Types
// -----------------------------
type TxDoc = {
  $id: string;

  // camera-friendly
  item_title?: string;
  title?: string;
  brand?: string;
  model?: string;

  // legacy (plates)
  registration?: string;

  listing_id?: string;
  sale_price?: number;
  seller_payout?: number;
  seller_email?: string;
  buyer_email?: string;
  payment_status?: string;
  transaction_status?: string;

  // legacy progress flags (safe if present)
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

  $createdAt?: string;
  $updatedAt?: string;

  [key: string]: any;
};

function formatMoney(value?: number) {
  return value == null ? "—" : `£${value.toLocaleString("en-GB")}`;
}

function formatDateTime(value?: string) {
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

// Try to update with schema tolerance (strip unknown attributes)
async function updateDocSchemaTolerant(
  dbId: string,
  colId: string,
  docId: string,
  payload: Record<string, any>
) {
  const data: Record<string, any> = { ...payload };

  for (let i = 0; i < 12; i++) {
    try {
      return await databases.updateDocument(dbId, colId, docId, data);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const m = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
      if (m?.[1]) {
        delete data[m[1]];
        continue;
      }
      throw err;
    }
  }

  // Last resort: update only core statuses/flags (no timestamps)
  const minimal: Record<string, any> = {};
  for (const k of Object.keys(payload)) {
    if (
      k === "payment_status" ||
      k === "transaction_status" ||
      k.startsWith("seller_") ||
      k.startsWith("buyer_")
    ) {
      minimal[k] = payload[k];
    }
  }
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

export default function AdminTransactionPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [authorized, setAuthorized] = useState(false);
  const [tx, setTx] = useState<TxDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>("");

  // Local checkbox state (legacy-compatible, but optional)
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

  // -----------------------------
  // Verify admin (match AdminClient.tsx)
  // -----------------------------
  useEffect(() => {
    const verify = async () => {
      try {
        const user: any = await account.get();
        const email = String(user?.email || "").trim().toLowerCase();

        if (email === ADMIN_EMAIL) {
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
  // Load transaction
  // -----------------------------
  useEffect(() => {
    if (!authorized || !id) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        if (!TRANSACTIONS_DB_ID || !TRANSACTIONS_COLLECTION_ID) {
          setError(
            "Missing Appwrite env for transactions. Set NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID and NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID."
          );
          setTx(null);
          return;
        }

        const doc: any = await databases.getDocument(
          TRANSACTIONS_DB_ID,
          TRANSACTIONS_COLLECTION_ID,
          id
        );

        setTx(doc);

        // Flags are optional; default false if not present
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
      } catch (err) {
        console.error("Failed to load transaction:", err);
        setError("Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authorized, id]);

  const itemLabel = useMemo(() => {
    if (!tx) return "";
    const t =
      String(tx.item_title || tx.title || "").trim() ||
      [tx.brand, tx.model].filter(Boolean).join(" ").trim() ||
      String(tx.registration || "").trim() ||
      String(tx.listing_id || "").trim();
    return t || "Transaction";
  }, [tx]);

  if (!authorized) return null;

  // Legacy business rules (keep if flags exist; harmless otherwise)
  const canPaySeller =
    sellerFlags.seller_docs_received &&
    buyerFlags.buyer_info_received &&
    buyerFlags.buyer_tax_mot_validated &&
    buyerFlags.buyer_payment_taken &&
    buyerFlags.buyer_transfer_complete;

  const canMarkSellerComplete = canPaySeller && sellerFlags.seller_payment_transferred;

  const publicListingHref = tx?.listing_id ? `/listing/${tx.listing_id}` : null;

  const handleSave = async () => {
    if (!tx) return;

    setSaving(true);
    setError("");

    try {
      const payment_status =
        canPaySeller && sellerFlags.seller_payment_transferred
          ? "paid"
          : tx.payment_status || "pending";

      const transaction_status =
        canMarkSellerComplete && sellerFlags.seller_process_complete
          ? "complete"
          : tx.transaction_status || "pending";

      const updateData: Record<string, any> = {
        ...sellerFlags,
        ...buyerFlags,
        payment_status,
        transaction_status,

        // Prefer schema-safe timestamps (Appwrite has $updatedAt automatically).
        // We'll attempt updated_at but strip it if schema rejects it.
        updated_at: new Date().toISOString(),
      };

      const updated: any = await updateDocSchemaTolerant(
        TRANSACTIONS_DB_ID,
        TRANSACTIONS_COLLECTION_ID,
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

  // Hard override: complete
  const handleMarkCompleteOverride = async () => {
    if (!tx) return;

    const ok = window.confirm(
      "Force mark this transaction as COMPLETE?\n\nUse only when you’re happy everything is finished."
    );
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const updateData: Record<string, any> = {
        ...sellerFlags,
        ...buyerFlags,
        payment_status: tx.payment_status || "paid",
        transaction_status: "complete",
        updated_at: new Date().toISOString(),
      };

      const updated: any = await updateDocSchemaTolerant(
        TRANSACTIONS_DB_ID,
        TRANSACTIONS_COLLECTION_ID,
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

    const reasonInput = window.prompt("Reason for deleting / archiving this transaction?", "");
    if (reasonInput === null) return;

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
        body: JSON.stringify({ txId: tx.$id, reason }),
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
    <main className="min-h-screen bg-neutral-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-neutral-200">
        <button onClick={() => router.push("/admin")} className="text-sm text-blue-600 underline mb-4">
          ← Back to Admin Dashboard
        </button>

        {loading && <p className="text-sm text-neutral-700">Loading transaction…</p>}

        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}

        {tx && (
          <>
            <h1 className="text-2xl font-bold text-orange-700 mb-2">{itemLabel}</h1>

            <div className="mb-4 text-sm text-neutral-700 space-y-1">
              <p>
                <strong>Sale price:</strong> {formatMoney(tx.sale_price)}
              </p>
              <p>
                <strong>Seller payout:</strong> {formatMoney(tx.seller_payout)}
              </p>
              <p>
                <strong>Seller:</strong> {tx.seller_email || "—"}
              </p>
              <p>
                <strong>Buyer:</strong> {tx.buyer_email || "—"}
              </p>
              <p>
                <strong>Payment status:</strong> {tx.payment_status || "pending"}
              </p>
              <p>
                <strong>Transaction status:</strong> {tx.transaction_status || "pending"}
              </p>
              <p>
                <strong>Created:</strong> {formatDateTime(tx.created_at || tx.$createdAt)}
              </p>
              <p>
                <strong>Updated:</strong> {formatDateTime(tx.updated_at || tx.$updatedAt)}
              </p>

              {publicListingHref && (
                <p className="pt-2">
                  <a href={publicListingHref} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    View public listing page
                  </a>
                </p>
              )}

              <p className="text-xs text-neutral-500 pt-2">
                Dashboard link:{" "}
                <a className="underline" href={`${SITE_URL}/dashboard`} target="_blank" rel="noopener noreferrer">
                  {SITE_URL}/dashboard
                </a>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Seller Section */}
              <div className="border rounded-xl p-4 bg-neutral-50">
                <h2 className="font-semibold text-lg mb-3">Seller</h2>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sellerFlags.seller_docs_requested}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({ ...prev, seller_docs_requested: e.target.checked }))
                    }
                  />
                  Documents requested
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sellerFlags.seller_docs_received}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({ ...prev, seller_docs_received: e.target.checked }))
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
                      setSellerFlags((prev) => ({ ...prev, seller_payment_transferred: e.target.checked }))
                    }
                  />
                  Payment transferred{" "}
                  {!canPaySeller && (
                    <span className="text-xs text-neutral-500">
                      (requires buyer info, validation, payment taken, transfer complete)
                    </span>
                  )}
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canMarkSellerComplete}
                    checked={sellerFlags.seller_process_complete}
                    onChange={(e) =>
                      setSellerFlags((prev) => ({ ...prev, seller_process_complete: e.target.checked }))
                    }
                  />
                  Seller process complete
                </label>

                <p className="text-xs text-neutral-500 mt-3">
                  These progress flags are optional. If your camera transactions schema doesn’t include them, saves will
                  still work (we auto-strip unknown fields).
                </p>
              </div>

              {/* Buyer Section */}
              <div className="border rounded-xl p-4 bg-neutral-50">
                <h2 className="font-semibold text-lg mb-3">Buyer</h2>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_info_requested}
                    onChange={(e) => setBuyerFlags((prev) => ({ ...prev, buyer_info_requested: e.target.checked }))}
                  />
                  Information requested
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_info_received}
                    onChange={(e) => setBuyerFlags((prev) => ({ ...prev, buyer_info_received: e.target.checked }))}
                  />
                  Information received
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_tax_mot_validated}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({ ...prev, buyer_tax_mot_validated: e.target.checked }))
                    }
                  />
                  Validation complete
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_payment_taken}
                    onChange={(e) => setBuyerFlags((prev) => ({ ...prev, buyer_payment_taken: e.target.checked }))}
                  />
                  Payment taken
                </label>

                <label className="flex items-center gap-2 mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={buyerFlags.buyer_transfer_complete}
                    onChange={(e) =>
                      setBuyerFlags((prev) => ({ ...prev, buyer_transfer_complete: e.target.checked }))
                    }
                  />
                  Deal complete
                </label>
              </div>
            </div>

            {/* DOCUMENTS SECTION */}
            <div className="mt-6 border rounded-xl p-4 bg-neutral-50">
              <h2 className="font-semibold text-lg mb-2">Documents &amp; uploads</h2>
              <p className="text-xs text-neutral-600 mb-3">
                Files attached to this transaction by the seller or buyer in their dashboard.
              </p>

              {Array.isArray(tx.documents) && tx.documents.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {tx.documents.map((doc: any, idx: number) => {
                    const isStringId = typeof doc === "string";

                    const label =
                      (!isStringId && (doc.label || doc.description || doc.type || doc.role)) || `Document ${idx + 1}`;

                    const fileName =
                      !isStringId && (doc.fileName || doc.name || doc.originalName || doc.filename);

                    const directUrl = !isStringId && (doc.url || doc.publicUrl || null);

                    const fileId = isStringId ? doc : doc.fileId || doc.id || doc.documentId || null;

                    const viewHref = directUrl
                      ? directUrl
                      : fileId
                      ? `/api/admin/view-document?fileId=${encodeURIComponent(fileId)}`
                      : null;

                    return (
                      <li
                        key={fileId || fileName || idx}
                        className="flex items-center justify-between border-b last:border-b-0 pb-2"
                      >
                        <div className="mr-3 overflow-hidden">
                          <p className="font-semibold truncate">{label}</p>
                          {fileName && <p className="text-xs text-neutral-500 truncate">{fileName}</p>}
                          {fileId && !directUrl && (
                            <p className="text-[10px] text-neutral-400 mt-0.5 font-mono truncate">ID: {fileId}</p>
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
                          <span className="text-xs text-neutral-400">No viewable link</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">No documents are attached to this transaction yet.</p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={saving}
                onClick={handleSave}
                className="bg-orange-600 text-white px-6 py-2 rounded-md font-semibold disabled:opacity-60"
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