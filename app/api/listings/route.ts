// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account, Permission, Role } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// Appwrite ENV (SAFE reads)
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const apiKey = process.env.APPWRITE_API_KEY || "";

// Optional admin access helpers (ONLY used for document permissions if you enable Row Security)
const ADMINS_TEAM_ID = (process.env.APPWRITE_ADMINS_TEAM_ID || "").trim(); // optional
const ADMIN_USER_ID = (process.env.APPWRITE_ADMIN_USER_ID || "").trim(); // optional

const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "listings";

// -----------------------------
// Email ENV (server-side only)
// -----------------------------
const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || "465");
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = (process.env.FROM_EMAIL || "").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim();
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://auctionmycamera.co.uk").replace(/\/+$/, "");

// -----------------------------
// Helpers
// -----------------------------
function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function toNullableString(v: any) {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Appwrite schema shows these fields as STRING, so stringify safely.
    return String(v);
  }
  return null;
}

function isBlank(v: any) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function getAdminDatabases() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

function getJwtFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  const alt = req.headers.get("x-appwrite-user-jwt") || "";
  return alt.trim();
}

async function getAuthedUser(req: NextRequest) {
  const jwt = getJwtFromRequest(req);
  if (!jwt) return null;

  const userClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
  const account = new Account(userClient);

  try {
    const me: any = await account.get();
    if (!me?.$id || !me?.email) return null;

    const emailVerified = !!me?.emailVerification;

    return {
      id: String(me.$id),
      email: String(me.email),
      name: String(me.name || ""),
      emailVerified,
    };
  } catch {
    return null;
  }
}

function buildCreatePermissions(userId: string) {
  const perms: string[] = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  if (ADMINS_TEAM_ID) {
    perms.push(
      Permission.read(Role.team(ADMINS_TEAM_ID)),
      Permission.update(Role.team(ADMINS_TEAM_ID)),
      Permission.delete(Role.team(ADMINS_TEAM_ID))
    );
  }

  if (ADMIN_USER_ID) {
    perms.push(
      Permission.read(Role.user(ADMIN_USER_ID)),
      Permission.update(Role.user(ADMIN_USER_ID)),
      Permission.delete(Role.user(ADMIN_USER_ID))
    );
  }

  return perms;
}

function emailConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS && FROM_EMAIL && ADMIN_EMAIL);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendAdminNewListingEmail(params: {
  listingId: string;
  displayName: string;
  sellerEmail: string;
  reservePrice: number;
  startingPrice: number;
  buyNow: number;
}) {
  if (!emailConfigured()) {
    console.warn("⚠️ Email not configured; skipping admin notification.", {
      hasHost: !!SMTP_HOST,
      hasUser: !!SMTP_USER,
      hasPass: !!SMTP_PASS,
      hasFrom: !!FROM_EMAIL,
      hasAdmin: !!ADMIN_EMAIL,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const adminLink = `${SITE_URL}/admin`;

  const subject = `New listing submitted: ${params.displayName}`;
  const text = [
    `A new listing has been submitted for approval.`,
    ``,
    `Listing: ${params.displayName}`,
    `Listing ID: ${params.listingId}`,
    `Seller: ${params.sellerEmail}`,
    ``,
    `Reserve: £${params.reservePrice.toFixed(2)}`,
    `Starting: £${params.startingPrice.toFixed(2)}`,
    `Buy Now: £${params.buyNow.toFixed(2)}`,
    ``,
    `Review in admin: ${adminLink}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2 style="margin:0 0 8px;">New listing submitted</h2>
      <p style="margin:0 0 14px;">A new listing has been submitted for approval.</p>
      <table style="border-collapse:collapse; width:100%; max-width:640px;">
        <tr><td style="padding:6px 0; width:140px;"><strong>Listing</strong></td><td style="padding:6px 0;">${escapeHtml(
          params.displayName
        )}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Listing ID</strong></td><td style="padding:6px 0;">${escapeHtml(
          params.listingId
        )}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Seller</strong></td><td style="padding:6px 0;">${escapeHtml(
          params.sellerEmail
        )}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Reserve</strong></td><td style="padding:6px 0;">£${params.reservePrice.toFixed(
          2
        )}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Starting</strong></td><td style="padding:6px 0;">£${params.startingPrice.toFixed(
          2
        )}</td></tr>
        <tr><td style="padding:6px 0;"><strong>Buy Now</strong></td><td style="padding:6px 0;">£${params.buyNow.toFixed(
          2
        )}</td></tr>
      </table>
      <p style="margin:16px 0 0;">
        <a href="${adminLink}" style="display:inline-block; padding:10px 14px; background:#111827; color:#fff; text-decoration:none; border-radius:8px;">
          Review in Admin
        </a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject,
    text,
    html,
    replyTo: FROM_EMAIL,
  });
}

function normalizeGearType(raw: string) {
  const v = String(raw || "").trim().toLowerCase();

  // Keep UI + stored values consistent with the dashboard dropdown
  if (v === "film") return "film_camera";

  const allowed = new Set([
    "camera",
    "lens",
    "film_camera",
    "bundle",
    "accessory",
    "other",

    // Keep these in case they exist elsewhere in your UI or older data
    "lighting",
    "tripod",
    "bag",
  ]);

  return allowed.has(v) ? v : "";
}

// -----------------------------
// ✅ Schema-tolerant create:
// If Appwrite throws "Unknown attribute: X", remove ONLY X and retry.
// This prevents the "minimal fallback" that was dropping description/images.
// -----------------------------
async function createDocSchemaTolerant(params: {
  db: Databases;
  dbId: string;
  colId: string;
  data: Record<string, any>;
  permissions: string[];
}) {
  const { db, dbId, colId, permissions } = params;
  const data: Record<string, any> = { ...params.data };

  // Try a handful of times stripping unknown attributes one-by-one
  for (let i = 0; i < 16; i++) {
    try {
      return await db.createDocument(dbId, colId, ID.unique(), data, permissions);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const m = msg.match(/Unknown attribute:\s*([A-Za-z0-9_]+)/i);
      if (m?.[1]) {
        const bad = m[1];
        // Strip ONLY the unknown field and retry
        delete data[bad];
        continue;
      }
      // Not a schema error -> bubble up
      throw err;
    }
  }

  // If we still can't create, attempt a safe "core" payload,
  // but keep description/image_id if they were not the issue.
  const core: Record<string, any> = {};
  const allow = new Set([
    "registration",
    "item_title",
    "owner_id",
    "seller_email",
    "status",
    "starting_price",
    "reserve_price",
    "buy_now",
    "gear_type",
    "brand",
    "model",
    "description",
    "image_id",
    "image_ids",
    "relist_until_sold",
  ]);

  for (const k of Object.keys(data)) {
    if (allow.has(k)) core[k] = data[k];
  }

  return await db.createDocument(dbId, colId, ID.unique(), core, permissions);
}

// -----------------------------
// POST /api/listings
// Requires Authorization: Bearer <Appwrite JWT>
// Creates a NEW listing document as pending_approval
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json({ error: "Server Appwrite config missing." }, { status: 500 });
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        { error: "Missing listings env (APPWRITE_LISTINGS_DATABASE_ID / APPWRITE_LISTINGS_COLLECTION_ID)." },
        { status: 500 }
      );
    }

    // ✅ Auth
    const me = await getAuthedUser(req);
    if (!me) {
      return NextResponse.json(
        {
          error: "Not authenticated. Please log in or register before selling.",
          code: "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // ✅ Email verified
    if (!me.emailVerified) {
      return NextResponse.json(
        {
          error: "Email not verified. Please verify your email before submitting a listing.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // -----------------------------
    // Fields (camera-first)
    // -----------------------------
    // Accept both "item_title" and legacy "registration"
    const itemTitle = safeString(body.item_title || body.title || body.itemTitle || body.registration);

    const gearTypeRaw = safeString(body.gear_type || body.gearType);
    const gearType = normalizeGearType(gearTypeRaw);

    const era = safeString(body.era);
    const condition = safeString(body.condition);
    const brand = safeString(body.brand);
    const model = safeString(body.model);
    const description = safeString(body.description);

    // ✅ Camera/Lens detail fields (Appwrite schema shows STRING)
    const shutterCount = toNullableString(body.shutter_count ?? body.shutterCount);
    const lensMount = toNullableString(body.lens_mount ?? body.lensMount);
    const focalLength = toNullableString(body.focal_length ?? body.focalLength);
    const maxAperture = toNullableString(body.max_aperture ?? body.maxAperture);

    // Photo references
    const imageId = safeString(body.image_id || body.imageId);
    const imageIdsRaw = Array.isArray(body.image_ids || body.imageIds) ? body.image_ids || body.imageIds : null;

    const imageIds =
      Array.isArray(imageIdsRaw) && imageIdsRaw.length
        ? imageIdsRaw.map((x: any) => safeString(x)).filter(Boolean).slice(0, 10)
        : null;

    // Optional relist (accept both)
    const relistUntilSold = !!(body.relist_until_sold ?? body.relistUntilSold);

    // -----------------------------
    // Prices
    // -----------------------------
    const reservePrice = isBlank(body.reserve_price ?? body.reservePrice)
      ? NaN
      : toNumber(body.reserve_price ?? body.reservePrice, NaN);

    const startingPrice = isBlank(body.starting_price ?? body.startingPrice)
      ? 0
      : toNumber(body.starting_price ?? body.startingPrice, NaN);

    const buyNow = isBlank(body.buy_now ?? body.buyNow) ? 0 : toNumber(body.buy_now ?? body.buyNow, NaN);

    if (!Number.isFinite(reservePrice)) {
      return NextResponse.json({ error: "reserve_price must be a valid number." }, { status: 400 });
    }
    if (!Number.isFinite(startingPrice) || startingPrice < 0) {
      return NextResponse.json({ error: "Starting price must be a valid number (0+)." }, { status: 400 });
    }
    if (!Number.isFinite(buyNow) || buyNow < 0) {
      return NextResponse.json({ error: "Buy Now must be a valid number (0+)." }, { status: 400 });
    }

    if (reservePrice < 10) {
      return NextResponse.json({ error: "Minimum reserve price is £10." }, { status: 400 });
    }

    if (startingPrice > 0 && startingPrice >= reservePrice) {
      return NextResponse.json({ error: "Starting price must be lower than reserve price." }, { status: 400 });
    }

    if (buyNow > 0) {
      const minBuyNow = Math.max(reservePrice || 0, startingPrice || 0);
      if (buyNow < minBuyNow) {
        return NextResponse.json(
          { error: "Buy Now price cannot be lower than the reserve price or starting price." },
          { status: 400 }
        );
      }
    }

    const displayName = itemTitle || [brand, model].filter(Boolean).join(" ") || `Listing ${Date.now()}`;

    const databases = getAdminDatabases();

    const sellerEmail = me.email;
    const ownerId = me.id;

    const permissions = buildCreatePermissions(ownerId);

    // IMPORTANT:
    // Some of your docs/clients use snake_case, some camelCase.
    // We can send both, but schema-tolerant create will strip whichever doesn't exist.
    const data: Record<string, any> = {
      // label / legacy compatibility
      registration: displayName,
      item_title: itemTitle || null,

      // Ownership / seller
      owner_id: ownerId,

      seller_email: sellerEmail,
      sellerEmail: sellerEmail,

      // Pricing (both styles)
      starting_price: startingPrice,
      startingPrice: startingPrice,

      reserve_price: reservePrice,
      reservePrice: reservePrice,

      buy_now: buyNow,
      buyNow: buyNow,

      // Lifecycle
      status: "pending_approval",
      auction_start: null,
      auction_end: null,
      current_bid: 0,

      // Camera fields (also keep camel fallbacks harmlessly)
      gear_type: gearType || null,
      gearType: gearType || null,

      era: era || null,
      condition: condition || null,

      brand: brand || null,
      model: model || null,
      description: description || null,

      // ✅ Details
      shutter_count: shutterCount,
      lens_mount: lensMount,
      focal_length: focalLength,
      max_aperture: maxAperture,

      // Photos
      image_id: imageId || null,
      image_ids: imageIds || null,

      // Relist (both styles)
      relist_until_sold: relistUntilSold,
      relistUntilSold: relistUntilSold,
    };

    const created: any = await createDocSchemaTolerant({
      db: databases,
      dbId: LISTINGS_DB_ID,
      colId: LISTINGS_COLLECTION_ID,
      data,
      permissions,
    });

    // -----------------------------
    // Notify admin (non-blocking)
    // -----------------------------
    try {
      if (created?.$id) {
        await sendAdminNewListingEmail({
          listingId: String(created.$id),
          displayName,
          sellerEmail,
          reservePrice,
          startingPrice,
          buyNow,
        });
        console.log("✅ Admin notified of new listing:", created.$id);
      }
    } catch (emailErr: any) {
      console.error("⚠️ Admin email notification failed:", emailErr?.message || emailErr);
    }

    return NextResponse.json({ ok: true, listingId: created?.$id }, { status: 200 });
  } catch (err: any) {
    console.error("❌ /api/listings error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create listing." }, { status: 500 });
  }
}