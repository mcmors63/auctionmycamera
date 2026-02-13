"use client";

import { useState, ChangeEvent, FormEvent } from "react";

type Props = {
  transactionId: string;
  listingId: string;
  userId: string;
  userEmail: string;
  role?: "buyer" | "seller";
};

export default function UploadDocumentsForm({
  transactionId,
  listingId,
  userId,
  userEmail,
  role = "buyer",
}: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!files || files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("transactionId", transactionId);
      formData.append("listingId", listingId);
      formData.append("userId", userId);
      formData.append("userEmail", userEmail);
      formData.append("role", role);

      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload-documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setMessage("Documents uploaded successfully. Admin has been notified.");
      setFiles(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded-md p-3">
      <p className="text-sm font-semibold">
        Upload required documents ({role === "buyer" ? "Buyer" : "Seller"})
      </p>

      <input
        type="file"
        multiple
        onChange={onFileChange}
        className="block w-full text-sm"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-green-600">{message}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="px-3 py-1 text-sm rounded bg-black text-white disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload documents"}
      </button>
    </form>
  );
}
