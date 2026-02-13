"use client";

import type React from "react";
import { useState } from "react";

type SellerDocumentsUploaderProps = {
  sellerId: string;
  transactionId?: string | null;
  /**
   * Optional list of existing document IDs (from the transaction row).
   * This is just for display so the seller can see that files are on record.
   */
  existingDocuments?: any[];
};

const DOCUMENT_TYPES = [
  "Proof of Ownership (V5C / V750 / V778)",
  "Retention Certificate",
  "Other supporting document",
];

export default function SellerDocumentsUploader({
  sellerId,
  transactionId,
  existingDocuments = [],
}: SellerDocumentsUploaderProps) {
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFileName(f ? f.name : "");
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    if (!docType) {
      setError("Please select a document type.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("sellerId", sellerId);
      if (transactionId) {
        formData.append("transactionId", transactionId);
      }
      formData.append("docType", docType);
      formData.append("file", file);

      const res = await fetch("/api/seller-documents/upload", {
        method: "POST",
        body: formData, // don't set Content-Type manually
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            (rawText && !data.error
              ? "Upload failed (server returned an error page)."
              : `Upload failed with status ${res.status}`)
        );
      }

      setSuccess("Document uploaded successfully.");
      setFile(null);
      setFileName("");
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err?.message || "Failed to upload document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border rounded-2xl p-5 bg-gray-50">
      <h3 className="text-lg font-semibold mb-2 text-gray-900">
        Upload Supporting Documents
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Please upload proof of entitlement (e.g. V750, V778, retention
        certificate) and any other required documents. Our team will review
        them before we complete the DVLA transfer and payout.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Doc type */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Document type
          </label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            className="border rounded-md w-full px-3 py-2 text-sm"
          >
            {DOCUMENT_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* File input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Upload file
          </label>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="inline-flex items-center justify-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-md cursor-pointer">
              <span>Choose file</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <span className="text-sm text-gray-700 truncate">
              {fileName || "No file selected"}
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Accepted: PDF, JPG, PNG. Keep file size sensible.
          </p>
        </div>

        {/* Error / success */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-sm rounded-md disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload Document"}
        </button>
      </form>

      {/* Existing docs list (read-only) */}
      {existingDocuments && existingDocuments.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">
            Documents already on file:
          </p>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
            {existingDocuments.map((doc, index) => (
              <li key={index}>File ID: {String(doc)}</li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-400 mt-1">
            For security reasons, only the AuctionMyPlate team can access the
            files themselves.
          </p>
        </div>
      )}
    </div>
  );
}
