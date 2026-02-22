// app/current-listings/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log once when the error boundary mounts / receives a new error
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="text-destructive">●</span> Error
        </p>

        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Oops, something went wrong
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {error?.message || "We hit a problem loading this page."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Try again
          </button>

          <a
            href="/current-listings"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-accent transition"
          >
            Back to auctions
          </a>
        </div>

        {error?.digest ? (
          <p className="mt-5 text-[11px] text-muted-foreground">
            Ref: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}