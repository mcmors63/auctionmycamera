// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID, Account, Permission, Role } from "node-appwrite";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Used only to confirm which deployment is live
const ROUTE_VERSION = "listings-2026-03-02b";

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

// Optional admin access helpers
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
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
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
  if (!emailConfigured()) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
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
  if (v === "film") return "film_camera";

  const allowed = new Set([
    "camera",
    "lens",
    "film_camera",
    "bundle",
    "accessory",
    "other",
    "lighting",
    "tripod",
    "bag",
  ]);

  return allowed.has(v) ? v : "";
}

function extractUnknownAttribute(err: any): string | null {
  const respRaw = typeof err?.response === "string" ? err.response : "";
  let msg = "";

  if (respRaw) {
    try {
      const parsed = JSON.parse(respRaw);
      msg = String(parsed?.message || respRaw);
    } catch {
      msg = respRaw;
    }
  }

  if (!msg) msg = String(err?.message || "");
  const m = msg.match(/Unknown attribute:\s*["']?([A-Za-z0-9_]+)["']?/i);
  return m?.[1] ? m[1] : null;
}

async function createDocSchemaTolerant(params: {
  db: Databases;
  dbId: string;
  colId: string;
  data: Record<string, any>;
  permissions: string[];
}) {
  const { db, dbId, colId, permissions } = params;
  const data: Record<string, any> = { ...params.data };

  for (let i = 0; i < 16; i++) {
    try {
      return await db.createDocument(dbId, colId, ID.unique(), data, permissions);
    } catch (err: any) {
      const bad = extractUnknownAttribute(err);
      if (bad && bad in data) {
        delete data[bad];
        continue;
      }
      throw err;
    }
  }

  return await db.createDocument(dbId, colId, ID.unique(), data, permissions);
}

// Accept arrays, JSON-strings, or comma-strings
function coerceIdList(raw: any): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((x) => safeString(x)).filter(Boolean);
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];

    // Try JSON array
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => safeString(x)).filter(Boolean);
        }
      } catch {
        // fall through
      }
    }

    // Comma-separated fallback
    return s
      .split(",")
      .map((x) => safeString(x))
      .filter(Boolean);
  }

  return [];
}

function dedupeKeepOrder(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        { error: "Server Appwrite config missing.", routeVersion: ROUTE_VERSION },
        { status: 500 }
      );
    }
    if (!LISTINGS_DB_ID || !LISTINGS_COLLECTION_ID) {
      return NextResponse.json(
        {
          error: "Missing listings env (APPWRITE_LISTINGS_DATABASE_ID / APPWRITE_LISTINGS_COLLECTION_ID).",
          routeVersion: ROUTE_VERSION,
        },
        { status: 500 }
      );
    }

    const me = await getAuthedUser(req);
    if (!me) {
      return NextResponse.json(
        {
          error: "Not authenticated. Please log in or register before selling.",
          code: "NOT_AUTHENTICATED",
          routeVersion: ROUTE_VERSION,
        },
        { status: 401 }
      );
    }

    if (!me.emailVerified) {
      return NextResponse.json(
        {
          error: "Email not verified. Please verify your email before submitting a listing.",
          code: "EMAIL_NOT_VERIFIED",
          routeVersion: ROUTE_VERSION,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body.", routeVersion: ROUTE_VERSION }, { status: 400 });
    }

    const itemTitle = safeString(body.item_title || body.title || body.itemTitle || body.registration);

    const gearTypeRaw = safeString(body.gear_type || body.gearType);
    const gearType = normalizeGearType(gearTypeRaw);

    const era = safeString(body.era);
    const condition = safeString(body.condition);
    const brand = safeString(body.brand);
    const model = safeString(body.model);
    const description = safeString(body.description);

    const shutterCount = toNullableString(body.shutter_count ?? body.shutterCount);
    const lensMount = toNullableString(body.lens_mount ?? body.lensMount);
    const focalLength = toNullableString(body.focal_length ?? body.focalLength);
    const maxAperture = toNullableString(body.max_aperture ?? body.maxAperture);

    // --- Images (robust) ---
    const imageIdFromBody = safeString(body.image_id || body.imageId);

    const idsFromImageIds = coerceIdList(body.image_ids);
    const idsFromImageIdsCamel = coerceIdList(body.imageIds);
    const idsFromImages = coerceIdList(body.images);

    let mergedIds = dedupeKeepOrder([
      ...idsFromImageIds,
      ...idsFromImageIdsCamel,
      ...idsFromImages,
    ]);

    // Ensure single imageId is included
    if (imageIdFromBody) mergedIds = dedupeKeepOrder([imageIdFromBody, ...mergedIds]);

    // Limit
    mergedIds = mergedIds.slice(0, 10);

    // Final stored values:
    const image_id = mergedIds[0] || (imageIdFromBody || null);
    const image_ids = mergedIds.length ? mergedIds : null;

    const relistUntilSold = !!(body.relist_until_sold ?? body.relistUntilSold);

    const reservePrice = isBlank(body.reserve_price ?? body.reservePrice)
      ? NaN
      : toNumber(body.reserve_price ?? body.reservePrice, NaN);

    const startingPrice = isBlank(body.starting_price ?? body.startingPrice)
      ? 0
      : toNumber(body.starting_price ?? body.startingPrice, NaN);

    const buyNow = isBlank(body.buy_now ?? body.buyNow) ? 0 : toNumber(body.buy_now ?? body.buyNow, NaN);

    if (!Number.isFinite(reservePrice)) {
      return NextResponse.json({ error: "reserve_price must be a valid number.", routeVersion: ROUTE_VERSION }, { status: 400 });
    }
    if (!Number.isFinite(startingPrice) || startingPrice < 0) {
      return NextResponse.json({ error: "Starting price must be a valid number (0+).", routeVersion: ROUTE_VERSION }, { status: 400 });
    }
    if (!Number.isFinite(buyNow) || buyNow < 0) {
      return NextResponse.json({ error: "Buy Now must be a valid number (0+).", routeVersion: ROUTE_VERSION }, { status: 400 });
    }

    if (reservePrice < 10) {
      return NextResponse.json({ error: "Minimum reserve price is £10.", routeVersion: ROUTE_VERSION }, { status: 400 });
    }
    if (startingPrice > 0 && startingPrice >= reservePrice) {
      return NextResponse.json({ error: "Starting price must be lower than reserve price.", routeVersion: ROUTE_VERSION }, { status: 400 });
    }
    if (buyNow > 0) {
      const minBuyNow = Math.max(reservePrice || 0, startingPrice || 0);
      if (buyNow < minBuyNow) {
        return NextResponse.json(
          { error: "Buy Now price cannot be lower than the reserve price or starting price.", routeVersion: ROUTE_VERSION },
          { status: 400 }
        );
      }
    }

    const displayName = itemTitle || [brand, model].filter(Boolean).join(" ") || `Listing ${Date.now()}`;

    const databases = getAdminDatabases();
    const sellerEmail = me.email;
    const ownerId = me.id;

    const permissions = buildCreatePermissions(ownerId);

    const data: Record<string, any> = {
      registration: displayName,
      item_title: itemTitle || null,

      owner_id: ownerId,
      seller_email: sellerEmail,

      starting_price: startingPrice,
      reserve_price: reservePrice,
      buy_now: buyNow,

      status: "pending_approval",
      auction_start: null,
      auction_end: null,
      current_bid: 0,

      gear_type: gearType || null,
      era: era || null,
      condition: condition || null,

      brand: brand || null,
      model: model || null,
      description: description || null,

      shutter_count: shutterCount,
      lens_mount: lensMount,
      focal_length: focalLength,
      max_aperture: maxAperture,

      image_id: image_id,
      image_ids: image_ids,

      relist_until_sold: relistUntilSold,
    };

    const created: any = await createDocSchemaTolerant({
      db: databases,
      dbId: LISTINGS_DB_ID,
      colId: LISTINGS_COLLECTION_ID,
      data,
      permissions,
    });

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
      }
    } catch {
      // non-blocking
    }

    return NextResponse.json(
      { ok: true, listingId: created?.$id, routeVersion: ROUTE_VERSION },
      { status: 200 }
    );
  } catch (err: any) {
    const respRaw = typeof err?.response === "string" ? err.response : "";
    if (respRaw) {
      try {
        const parsed = JSON.parse(respRaw);
        if (parsed?.type === "document_invalid_structure" && parsed?.code === 400) {
          return NextResponse.json({ error: parsed?.message || "Invalid listing schema.", routeVersion: ROUTE_VERSION }, { status: 400 });
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ error: err?.message || "Failed to create listing.", routeVersion: ROUTE_VERSION }, { status: 500 });
  }
}