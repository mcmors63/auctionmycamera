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
        throw new Error(data.error || "We couldn't send your message. Please try again.");
      }

      setSuccess("Thanks â€” your message has been sent. Weâ€™ll reply as soon as we can.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      setError(err?.message || "We couldn't send your message right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-foreground">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions about a listing, an auction, delivery/collection, or a deal? Send us a message and weâ€™ll help.
        </p>
      </div>

      {error && (
        <p
          role="status"
          aria-live="polite"
          className="bg-destructive/10 text-destructive border border-destructive/30 text-sm rounded-md px-3 py-2"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          aria-live="polite"
          className="bg-green-500/10 text-green-700 border border-green-500/30 text-sm rounded-md px-3 py-2"
        >
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Email address *
          </label>
          <input
            id="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Subject (optional)
          </label>
          <input
            id="subject"
            type="text"
            className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Message *
          </label>
          <textarea
            id="message"
            required
            rows={5}
            className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
            minLength={10}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Please include enough detail for us to help (at least 10 characters).
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {submitting ? "Sendingâ€¦" : "Send message"}
        </button>
      </form>

      <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          â† Back to home
        </Link>
      </div>
    </div>
  );
}
