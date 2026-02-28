// app/admin/transaction/[id]/AdminTransactionClient.tsx
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

// ✅ Transactions DB/Collection
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

  item_title?: string;
  title?: string;
  brand?: string;
  model?: string;

  registration?: string; // legacy

  listing_id?: string;

  sale_price?: number;
  commission_rate?: number;
  commission_amount?: number;
  seller_payout?: number;

  seller_email?: string;
  buyer_email?: string;

  payment_status?: string; // paid | unpaid | failed
  transaction_status?: string; // dispatch_pending | receipt_pending | complete | payment_failed | deleted

  stripe_payment_intent_id?: string;

  payment_failure_reason?: string;

  documents?: any[];

  created_at?: string;
  updated_at?: string;

  $createdAt?: string;
  $updatedAt?: string;

  [key: string]: any;
};

function formatMoney(value?: number) {
  return value == null || Number.isNaN(value) ? "—" : `£${value.toLocaleString("en-GB")}`;
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

  // Last resort: only update core fields
  const minimal: Record<string, any> = {};
  for (const k of Object.keys(payload)) {
    if (k === "payment_status" || k === "transaction_status" || k === "admin_notes") {
      minimal[k] = payload[k];
    }
  }
  return await databases.updateDocument(dbId, colId, docId, minimal);
}

function pickItemLabel(tx: TxDoc) {
  const t =
    String(tx.item_title || tx.title || "").trim() ||
    [tx.brand, tx.model].filter(Boolean).join(" ").trim() ||
    String(tx.registration || "").trim() ||
    String(tx.listing_id || "").trim();
  return t || "Transaction";
}

const TX_STATUSES = ["dispatch_pending", "receipt_pending", "complete", "payment_failed"] as const;
type TxStatus = (typeof TX_STATUSES)[number];

export default function AdminTransactionClient() {
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

  // Admin-editable fields (camera-safe)
  const [adminNotes, setAdminNotes] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus>("dispatch_pending");

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

    void verify();
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

        const doc: any = await databases.getDocument(TRANSACTIONS_DB_ID, TRANSACTIONS_COLLECTION_ID, id);

        setTx(doc);
        setAdminNotes(String(doc.admin_notes || doc.notes || "").trim());

        const current = String(doc.transaction_status || "").trim().toLowerCase();
        if (TX_STATUSES.includes(current as any)) {
          setTxStatus(current as TxStatus);
        } else {
          setTxStatus("dispatch_pending");
        }
      } catch (err) {
        console.error("Failed to load transaction:", err);
        setError("Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authorized, id]);

  const itemLabel = useMemo(() => {
    return tx ? pickItemLabel(tx) : "";
  }, [tx]);

  if (!authorized) return null;

  const publicListingHref = tx?.listing_id ? `/listing/${tx.listing_id}` : null;

  const handleSave = async () => {
    if (!tx) return;

    setSaving(true);
    setError("");

    try {
      /**
       * IMPORTANT:
       * - Stripe/webhooks are the source of truth for payment_status.
       * - Admin can manage fulfilment status (transaction_status) + notes.
       */
      const updateData: Record<string, any> = {
        transaction_status: txStatus,
        admin_notes: adminNotes,
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

  // Force complete (still allowed)
  const handleMarkCompleteOverride = async () => {
    if (!tx) return;

    const ok = window.confirm(
      "Force mark this transaction as COMPLETE?\n\nUse only when dispatch + receipt are confirmed."
    );
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const updateData: Record<string, any> = {
        transaction_status: "complete",
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      };

      const updated: any = await updateDocSchemaTolerant(
        TRANSACTIONS_DB_ID,
        TRANSACTIONS_COLLECTION_ID,
        tx.$id,
        updateData
      );

      setTx(updated);
      setTxStatus("complete");
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
      "Archive this transaction (admin-only)?\n\nIt will be removed from main dashboards, but kept for record keeping."
    );
    if (!confirmDelete) return;

    const reasonInput = window.prompt("Reason for archiving this transaction?", "");
    if (reasonInput === null) return;

    const reason = reasonInput.trim();
    if (!reason) {
      alert("Please enter a reason, or press Cancel to abort.");
      return;
    }

    try {
      setDeleting(true);

      // ✅ Use Appwrite JWT, same pattern as PaymentMethodClient.tsx
      const jwt = await account.createJWT();

      const res = await fetch("/api/admin/delete-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt.jwt}`,
        },
        body: JSON.stringify({ txId: tx.$id, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Archive transaction failed:", data);

        // If auth died, kick back to admin-login
        if (res.status === 401 || res.status === 403) {
          router.push("/admin-login");
          return;
        }

        throw new Error(data.error || "Request failed");
      }

      alert("Transaction archived.");
      router.push("/admin");
    } catch (err) {
      console.error("Archive transaction failed:", err);
      alert("Failed to archive transaction.");
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
                <strong>Commission:</strong> {formatMoney(tx.commission_amount)}{" "}
                {typeof tx.commission_rate === "number" ? `(${tx.commission_rate}%)` : ""}
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
                <strong>Payment status (Stripe-owned):</strong> {tx.payment_status || "—"}
              </p>
              <p>
                <strong>Transaction status:</strong> {tx.transaction_status || "—"}
              </p>

              {tx.stripe_payment_intent_id ? (
                <p className="text-xs text-neutral-600">
                  <strong>PaymentIntent:</strong> <span className="font-mono">{tx.stripe_payment_intent_id}</span>
                </p>
              ) : null}

              {tx.payment_failure_reason ? (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mt-2">
                  <strong>Failure reason:</strong> {String(tx.payment_failure_reason)}
                </p>
              ) : null}

              <p>
                <strong>Created:</strong> {formatDateTime(tx.created_at || tx.$createdAt)}
              </p>
              <p>
                <strong>Updated:</strong> {formatDateTime(tx.updated_at || tx.$updatedAt)}
              </p>

              {publicListingHref && (
                <p className="pt-2">
                  <a
                    href={publicListingHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
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

            {/* Admin controls (camera-safe) */}
            <div className="border rounded-xl p-4 bg-neutral-50 mb-6">
              <h2 className="font-semibold text-lg mb-3">Admin Controls</h2>

              <label className="block text-sm font-semibold mb-1">Transaction status</label>
              <select
                className="border rounded-md px-3 py-2 text-sm w-full"
                value={txStatus}
                onChange={(e) => setTxStatus(e.target.value as TxStatus)}
              >
                <option value="dispatch_pending">Dispatch pending</option>
                <option value="receipt_pending">Receipt pending</option>
                <option value="complete">Complete</option>
                <option value="payment_failed">Payment failed</option>
              </select>

              <label className="block text-sm font-semibold mt-4 mb-1">Admin notes (internal)</label>
              <textarea
                className="border rounded-md px-3 py-2 text-sm w-full"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes for audit trail…"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Payment status is controlled by Stripe/webhooks. Use this page for fulfilment + admin notes.
              </p>
            </div>

            {/* DOCUMENTS SECTION (kept) */}
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

                    const fileName = !isStringId && (doc.fileName || doc.name || doc.originalName || doc.filename);

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
                          <a href={viewHref} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
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
                {saving ? "Saving…" : "Save"}
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
                {deleting ? "Archiving…" : "Archive Transaction"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}