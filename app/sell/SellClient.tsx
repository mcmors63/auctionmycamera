"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client, Account } from "appwrite";

type GearType =
  | "camera"
  | "lens"
  | "accessory"
  | "film"
  | "lighting"
  | "tripod"
  | "bag"
  | "other";
type Era = "modern" | "vintage" | "antique";
type Condition = "new" | "like_new" | "excellent" | "good" | "fair" | "parts";

type User = {
  $id: string;
  email: string;
  name?: string;
  emailVerification?: boolean;
};

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function SellClient() {
  const router = useRouter();

  const [gearType, setGearType] = useState<GearType>("camera");
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [verifySending, setVerifySending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string>("");

  // ✅ Require login to sell
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const me = (await account.get()) as any;
        if (!alive) return;

        setUser({
          $id: String(me.$id),
          email: String(me.email),
          name: me.name ? String(me.name) : undefined,
          emailVerification: !!me.emailVerification,
        });
      } catch {
        if (!alive) return;
        setUser(null);

        // Direct them to register/login before they can sell
        router.replace(`/login-or-register?next=${encodeURIComponent("/sell")}`);
      } finally {
        if (!alive) return;
        setLoadingUser(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [router]);

  async function resendVerificationEmail() {
    setVerifyMsg("");
    setVerifySending(true);
    try {
      // Safe redirect target (doesn't require a special page)
      const redirectUrl = `${window.location.origin}/`;
      await account.createVerification(redirectUrl);
      setVerifyMsg("✅ Verification email sent. Check your inbox (and spam).");
    } catch (err) {
      console.error("Failed to send verification email:", err);
      setVerifyMsg("❌ Could not send verification email. Try again in a moment.");
    } finally {
      setVerifySending(false);
    }
  }

  async function getJwtOrThrow(): Promise<string> {
    // Appwrite Web SDK: create a JWT for server-side auth
    const jwtRes: any = await account.createJWT();
    const jwt = String(jwtRes?.jwt || "").trim();
    if (!jwt) throw new Error("Missing JWT");
    return jwt;
  }

  // ✅ Helper: upcoming auction window (Monday 01:00 → Sunday 23:00)
  function getNextAuctionWindow() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat

    // Next Monday
    const daysUntilMonday = (1 - day + 7) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() + daysUntilMonday);

    // If it's Monday already, only use "today" if we haven't reached 01:00 yet; otherwise next week
    const isMonday = day === 1;
    if (isMonday) {
      const candidate = new Date(now);
      candidate.setHours(1, 0, 0, 0);
      if (candidate.getTime() >= now.getTime()) {
        start.setTime(candidate.getTime());
      } else {
        start.setDate(now.getDate() + 7);
        start.setHours(1, 0, 0, 0);
      }
    } else {
      start.setHours(1, 0, 0, 0);
      if (start.getTime() < now.getTime()) {
        start.setDate(start.getDate() + 7);
        start.setHours(1, 0, 0, 0);
      }
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    end.setHours(23, 0, 0, 0); // Sunday 23:00

    return {
      auction_start: start.toISOString(),
      auction_end: end.toISOString(),
    };
  }

  const previewWindow = useMemo(() => getNextAuctionWindow(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyMsg("");

    if (!user?.email) {
      alert("⚠️ Please log in before submitting a listing.");
      router.push(`/login-or-register?next=${encodeURIComponent("/sell")}`);
      return;
    }

    // ✅ HARD GATE: must be email-verified to submit listings
    if (!user.emailVerification) {
      alert("⚠️ Please verify your email address before submitting a listing.");
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);

    const item_title = String(formData.get("item_title") || "").trim();
    const gear_type = String(formData.get("gear_type") || "camera") as GearType;
    const era = String(formData.get("era") || "modern") as Era;

    const brand = String(formData.get("brand") || "").trim();
    const model = String(formData.get("model") || "").trim();

    const condition = String(formData.get("condition") || "good") as Condition;
    const description = String(formData.get("description") || "").trim();

    const starting_price_raw = formData.get("starting_price");
    const reserve_price_raw = formData.get("reserve_price");

    const shutter_count_raw = formData.get("shutter_count");
    const lens_mount = String(formData.get("lens_mount") || "").trim();
    const focal_length = String(formData.get("focal_length") || "").trim();
    const max_aperture = String(formData.get("max_aperture") || "").trim();

    const starting_price = Number(starting_price_raw);
    const reserve_price = Number(reserve_price_raw);

    if (!item_title || !starting_price_raw || !reserve_price_raw) {
      alert("⚠️ Please fill in the item title, starting price, and reserve price.");
      return;
    }

    if (!Number.isFinite(starting_price) || starting_price < 0) {
      alert("⚠️ Starting price must be a valid number.");
      return;
    }

    if (!Number.isFinite(reserve_price) || reserve_price < 0) {
      alert("⚠️ Reserve price must be a valid number.");
      return;
    }

    // ✅ Get upcoming auction window
    const { auction_start, auction_end } = getNextAuctionWindow();

    // ✅ Backwards-compatible listing ref (keeps legacy pages happy while we migrate schema)
    const legacy_listing_ref = `AMC${String(Date.now()).slice(-6)}`;

    // ✅ Payload: server must trust auth, but keep legacy-safe fields
    const payload: Record<string, unknown> = {
      // (Server ignores these and uses the authed user anyway, but harmless)
      sellerEmail: user.email,
      owner_id: user.$id,

      // Camera fields
      item_title,
      gear_type,
      era,
      brand: brand || null,
      model: model || null,
      condition,
      description: description || null,
      shutter_count:
        shutter_count_raw && String(shutter_count_raw).trim() !== ""
          ? Number(shutter_count_raw)
          : null,
      lens_mount: lens_mount || null,
      focal_length: focal_length || null,
      max_aperture: max_aperture || null,

      // Pricing
      starting_price,
      reserve_price,

      // Auction timing (approval will overwrite later anyway)
      auction_start,
      auction_end,

      // Legacy fields (until every page is migrated)
      reg_number: legacy_listing_ref,
      plate_status: "available",
      expiry_date: null,
    };

    try {
      const jwt = await getJwtOrThrow();

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Make auth/verify failures obvious
        const msg = String(data?.error || "Request failed");

        if (res.status === 401) {
          alert("⚠️ Your session has expired. Please log in again.");
          router.push(`/login-or-register?next=${encodeURIComponent("/sell")}`);
          return;
        }

        if (res.status === 403) {
          alert(msg);
          return;
        }

        alert("❌ Error: " + msg);
        return;
      }

      alert(
        `✅ Listing submitted!\nWe’ll review it and email you once it’s approved.\n\nAuction window preview:\nStarts: ${new Date(
          auction_start
        ).toLocaleString()}\nEnds: ${new Date(auction_end).toLocaleString()}`
      );

      (e.target as HTMLFormElement).reset();
      setGearType("camera");
    } catch (error) {
      console.error("Error submitting listing:", error);
      alert("❌ Failed to submit listing, please try again.");
    }
  };

  // UI helpers
  const inputBase =
    "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelBase = "block mb-1 text-sm font-semibold text-foreground";
  const hintBase = "mt-1 text-xs text-muted-foreground";

  if (loadingUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Checking your account…</p>
        </div>
      </div>
    );
  }

  // Fallback in case redirect is blocked/slow
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold">Create an account to sell</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to be registered and logged in before you can submit a listing.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/register?next=${encodeURIComponent("/sell")}`}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-semibold"
            >
              Register
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent("/sell")}`}
              className="rounded-xl border border-border bg-card px-4 py-2 font-semibold"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Sell camera gear</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Modern and antique cameras welcome — plus lenses and accessories. Listings are reviewed and then queued for the next
          weekly auction.
        </p>

        <div className="mt-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming auction window (preview)
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Starts:</span>{" "}
            <span className="text-muted-foreground">
              {new Date(previewWindow.auction_start).toLocaleString()}
            </span>
            <br />
            <span className="font-semibold">Ends:</span>{" "}
            <span className="text-muted-foreground">
              {new Date(previewWindow.auction_end).toLocaleString()}
            </span>
          </p>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Logged in as <span className="font-semibold">{user.email}</span>
        </p>

        {!user.emailVerification && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Verify your email to list items</p>
            <p className="mt-1 text-xs text-amber-800">
              You’re logged in, but your email isn’t verified yet. Verify it first, then come back here to submit your listing.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resendVerificationEmail}
                disabled={verifySending}
                className="rounded-xl bg-amber-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {verifySending ? "Sending…" : "Resend verification email"}
              </button>

              <Link
                href="/"
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Back to home
              </Link>
            </div>

            {verifyMsg && <p className="mt-2 text-xs text-amber-900">{verifyMsg}</p>}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelBase}>Item title</label>
          <input
            name="item_title"
            placeholder='e.g. "Canon EOS 5D Mark IV + 24-70mm"'
            className={inputBase}
            required
          />
          <p className={hintBase}>Keep it clear and specific — brand + model is ideal.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>Type</label>
            <select
              name="gear_type"
              className={inputBase}
              value={gearType}
              onChange={(e) => setGearType(e.target.value as GearType)}
            >
              <option value="camera">Camera</option>
              <option value="lens">Lens</option>
              <option value="accessory">Accessory</option>
              <option value="film">Film</option>
              <option value="lighting">Lighting</option>
              <option value="tripod">Tripod / Support</option>
              <option value="bag">Bag / Case</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelBase}>Era</label>
            <select name="era" className={inputBase} defaultValue="modern">
              <option value="modern">Modern</option>
              <option value="vintage">Vintage</option>
              <option value="antique">Antique</option>
            </select>
            <p className={hintBase}>This helps buyers filter modern vs collectible items.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>Brand (optional)</label>
            <input name="brand" placeholder="e.g. Canon, Nikon, Leica" className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Model (optional)</label>
            <input name="model" placeholder="e.g. AE-1, D850, M6" className={inputBase} />
          </div>
        </div>

        <div>
          <label className={labelBase}>Condition</label>
          <select name="condition" className={inputBase} defaultValue="good">
            <option value="new">New / Unused</option>
            <option value="like_new">Like new</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="parts">For parts / not working</option>
          </select>
          <p className={hintBase}>Be honest — it reduces disputes and improves buyer confidence.</p>
        </div>

        {gearType === "camera" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Camera details (optional)</p>
            <div className="mt-3">
              <label className={labelBase}>Shutter count (optional)</label>
              <input
                name="shutter_count"
                type="number"
                placeholder="e.g. 12345"
                className={inputBase}
                min={0}
              />
              <p className={hintBase}>If you know it, buyers love seeing this.</p>
            </div>
          </div>
        )}

        {gearType === "lens" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Lens details (optional)</p>
            <div className="mt-3 grid sm:grid-cols-3 gap-4">
              <div>
                <label className={labelBase}>Mount</label>
                <input name="lens_mount" placeholder="e.g. EF, F, E, MFT" className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Focal length</label>
                <input name="focal_length" placeholder="e.g. 24-70mm" className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Max aperture</label>
                <input name="max_aperture" placeholder="e.g. f/2.8" className={inputBase} />
              </div>
            </div>
            <p className={hintBase}>Optional, but helps buyers filter quickly.</p>
          </div>
        )}

        <div>
          <label className={labelBase}>Description (optional)</label>
          <textarea
            name="description"
            placeholder="What’s included? Any marks, fungus, haze, scratches, battery health, missing parts, etc."
            className={`${inputBase} min-h-[120px]`}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelBase}>Starting price (£)</label>
            <input name="starting_price" type="number" placeholder="0" className={inputBase} required min={0} step="1" />
          </div>

          <div>
            <label className={labelBase}>Reserve price (£)</label>
            <input name="reserve_price" type="number" placeholder="0" className={inputBase} required min={0} step="1" />
            <p className={hintBase}>Minimum you’re happy to accept.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!user.emailVerification}
          className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          title={!user.emailVerification ? "Verify your email to submit listings" : undefined}
        >
          Submit listing
        </button>

        <p className="text-xs text-muted-foreground text-center">
          By submitting, you confirm the item is yours to sell and the listing details are accurate.
        </p>
      </form>
    </div>
  );
}