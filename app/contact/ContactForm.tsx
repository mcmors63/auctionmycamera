// app/contact/ContactForm.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 2000;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<"general" | "listing" | "payment" | "delivery" | "account">(
    "general"
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot field (bots fill it, humans won't)
  const [company, setCompany] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messageCount = message.length;

  const topicLabel = useMemo(() => {
    switch (topic) {
      case "listing":
        return "Listing / auction question";
      case "payment":
        return "Payment / charges";
      case "delivery":
        return "Delivery / dispatch";
      case "account":
        return "Account / login";
      default:
        return "General";
    }
  }, [topic]);

  const inferredSubject = useMemo(() => {
    const cleaned = subject.trim().slice(0, MAX_SUBJECT);
    if (cleaned) return cleaned;
    return `${topicLabel}`;
  }, [subject, topicLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Honeypot triggered: act like success (quietly) to waste bot time
    if (company.trim()) {
      setSuccess("Thank you – your message has been sent. We'll get back to you as soon as we can.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setCompany("");
      return;
    }

    if (!email.trim() || !message.trim()) {
      setError("Please provide your email address and a message.");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please add a little more detail so we can help properly.");
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
          subject: inferredSubject,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "We couldn't send your message. Please try again.");
      }

      setSuccess("Thank you — your message has been sent. We’ll reply as soon as we can.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setCompany("");
      setTopic("general");
    } catch (err: any) {
      console.error("Contact form error:", err);
      setError(
        err?.message || "We couldn't send your message right now. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-900/40 border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 text-slate-100">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-sky-300">
          Contact Us
        </h1>
        <p className="text-sm text-slate-300">
          Questions about a listing, an auction, payment, or delivery? Send a message and we’ll help.
        </p>
        <p className="text-xs text-slate-400">
          For account/security issues, include the email address on your account so we can locate it quickly.
        </p>
      </div>

      {(error || success) && (
        <div aria-live="polite">
          {error && (
            <p className="bg-red-950/40 text-red-200 border border-red-500/40 text-sm rounded-xl px-4 py-3">
              <span className="font-semibold">Couldn’t send:</span> {error}
            </p>
          )}
          {success && (
            <p className="bg-emerald-950/30 text-emerald-200 border border-emerald-500/30 text-sm rounded-xl px-4 py-3">
              <span className="font-semibold">Sent:</span> {success}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot (hidden from humans) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input
            id="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
            >
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 block w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-black/30 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
            >
              Email address *
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 block w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-black/30 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="topic"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
          >
            Topic
          </label>
          <select
            id="topic"
            className="mt-1 block w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-black/30 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            value={topic}
            onChange={(e) => setTopic(e.target.value as any)}
          >
            <option value="general">General</option>
            <option value="listing">Listing / auction</option>
            <option value="payment">Payment</option>
            <option value="delivery">Delivery / dispatch</option>
            <option value="account">Account / login</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">
            This helps route your message to the right place.
          </p>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
          >
            Subject (optional)
          </label>
          <input
            id="subject"
            type="text"
            maxLength={MAX_SUBJECT}
            className="mt-1 block w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-black/30 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Defaults to: ${topicLabel}`}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Leave blank and we’ll auto-title it.</span>
            <span>
              {subject.trim().length}/{MAX_SUBJECT}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wide"
          >
            Message *
          </label>
          <textarea
            id="message"
            required
            rows={6}
            maxLength={MAX_MESSAGE}
            className="mt-1 block w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-black/30 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Include any order/listing reference, what you tried, and what happened."
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Be specific — it speeds up the reply.</span>
            <span>
              {messageCount}/{MAX_MESSAGE}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-sky-300 text-slate-950 text-sm font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-sky-200 transition"
        >
          {submitting ? "Sending…" : "Send message"}
        </button>

        <p className="text-xs text-slate-500">
          By sending this message you agree to our{" "}
          <Link href="/privacy" className="text-sky-300 underline hover:text-sky-200">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <Link href="/" className="hover:text-sky-200">
          ← Back to home
        </Link>

        <a
          href="mailto:support@auctionmycamera.co.uk"
          className="hover:text-sky-200 underline"
        >
          support@auctionmycamera.co.uk
        </a>
      </div>
    </div>
  );
}
