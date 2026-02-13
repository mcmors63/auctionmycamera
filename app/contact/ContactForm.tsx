// app/contact/ContactForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !message.trim()) {
      setError("Please provide your email address and a message.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "We couldn't send your message. Please try again."
        );
      }

      setSuccess(
        "Thank you – your message has been sent. We'll get back to you as soon as we can."
      );
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      setError(
        err?.message ||
          "We couldn't send your message right now. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#111111] border border-yellow-700 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-gray-100">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FFD500]">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-gray-300">
          If you have a question about a listing, an auction, or the transfer
          process, use the form below and we&apos;ll get back to you.
        </p>
      </div>

      {error && (
        <p className="bg-red-900/30 text-red-300 border border-red-500/70 text-sm rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="bg-green-900/30 text-green-300 border border-green-500/70 text-sm rounded-md px-3 py-2">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
          >
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-600 px-3 py-2 text-sm bg-black/60 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD500] focus:border-[#FFD500]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
          >
            Email address *
          </label>
          <input
            id="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-600 px-3 py-2 text-sm bg-black/60 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD500] focus:border-[#FFD500]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
          >
            Subject (optional)
          </label>
          <input
            id="subject"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-600 px-3 py-2 text-sm bg-black/60 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD500] focus:border-[#FFD500]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-xs font-semibold text-gray-300 uppercase tracking-wide"
          >
            Message *
          </label>
          <textarea
            id="message"
            required
            rows={5}
            className="mt-1 block w-full rounded-md border border-gray-600 px-3 py-2 text-sm bg-black/60 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD500] focus:border-[#FFD500]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#FFD500] text-black text-sm font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-yellow-400 transition"
        >
          {submitting ? "Sending…" : "Send message"}
        </button>
      </form>

      <div className="pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <Link href="/" className="hover:text-[#FFD500]">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
