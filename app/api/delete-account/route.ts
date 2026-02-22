// app/api/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Users, Account, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------
// ENV (server-side)
// Prefer server envs, fall back to NEXT_PUBLIC only if you truly must.
// -----------------------------
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

// LISTINGS DB / collection (LISTINGS ONLY — no PLATES and no hardcoded IDs)
const LISTINGS_DB_ID =
  process.env.APPWRITE_LISTINGS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_DATABASE_ID ||
  "";

const LISTINGS_COLLECTION_ID =
  process.env.APPWRITE_LISTINGS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_LISTINGS_COLLECTION_ID ||
  "";

// Transactions DB / collection
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  LISTINGS_DB_ID;

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "";

// Profiles DB / collection (Personal Details lives here in most builds)
const PROFILES_DB_ID =
  process.env.APPWRITE_PROFILES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_DATABASE_ID ||
  "";

const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "";

// A safe placeholder email for anonymised history
const DELETED_EMAIL_PLACEHOLDER =
  process.env.DELETED_EMAIL_PLACEHOLDER || "deleted@auctionmycamera.co.uk";

// -----------------------------
// Helpers
// -----------------------------
function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing ${name}.`);
}

function getBearerJwt(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function safeEmail(e: unknown) {
  return String(e || "").trim().toLowerCase();
}

function serverClient() {
  requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
  requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
  requireEnv("APPWRITE_API_KEY", apiKey);
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function jwtClient(jwt: string) {
  requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
  requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
  return new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
}

function getDatabases() {
  return new Databases(serverClient());
}

function getUsers() {
  return new Users(serverClient());
}

function isTransactionFinished(tx: any): boolean {
  // Be conservative: only consider “finished” when transaction says so.
  const t = String(tx?.transaction_status || "").toLowerCase();
  return (
    t === "complete" ||
    t === "completed" ||
    t === "deleted" ||
    t === "cancelled" ||
    t === "canceled"
  );
}

function has(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

async function listAllDocuments(
  databases: Databases,
  dbId: string,
  colId: string,
  baseQueries: string[],
  pageSize = 100
) {
  const out: any[] = [];
  let cursor: string | undefined;

  while (true) {
    const queries = [...baseQueries, Query.orderAsc("$id"), Query.limit(pageSize)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await databases.listDocuments(dbId, colId, queries);
    out.push(...page.documents);

    if (!page.documents.length || page.documents.length < pageSize) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return out;
}

// Schema-tolerant update: remove unknown keys and retry
async function updateDocSchemaTolerant(
  databases: Databases,
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

  // last resort: do nothing
  return await databases.getDocument(dbId, colId, docId);
}

async function deleteDocsByQuerySchemaTolerant(params: {
  databases: Databases;
  dbId: string;
  colId: string;
  tryQueries: string[][];
  limit?: number;
}) {
  const { databases, dbId, colId, tryQueries, limit = 25 } = params;

  for (const queries of tryQueries) {
    try {
      const res = await databases.listDocuments(dbId, colId, [...queries, Query.limit(limit)]);
      for (const doc of res.documents) {
        await databases.deleteDocument(dbId, colId, doc.$id);
      }
      return { ok: true, deleted: res.documents.length };
    } catch {
      // try next query shape
      continue;
    }
  }

  return { ok: false, deleted: 0 };
}

// -----------------------------
// POST /api/delete-account
// Body: { confirm?: string }  (optional: you can enforce a confirm phrase)
// Requires: Authorization: Bearer <appwrite_jwt>
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    // Required env for this route
    requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
    requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
    requireEnv("APPWRITE_API_KEY", apiKey);
    requireEnv("APPWRITE_LISTINGS_DATABASE_ID (or NEXT_PUBLIC_...)", LISTINGS_DB_ID);
    requireEnv("APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC_...)", LISTINGS_COLLECTION_ID);

    // ✅ Require session (JWT)
    const jwt = getBearerJwt(req);
    if (!jwt) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));

    // Optional confirmation gate (nice safety)
    // If you want it enforced, uncomment:
    // if (String(body?.confirm || "").trim().toUpperCase() !== "DELETE") {
    //   return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
    // }

    // Who is calling?
    const account = new Account(jwtClient(jwt));
    let sessionUser: any;
    try {
      sessionUser = await account.get();
    } catch {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const userId = String(sessionUser?.$id || "").trim();
    const email = safeEmail(sessionUser?.email);

    if (!userId || !email) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const databases = getDatabases();
    const users = getUsers();

    // -----------------------------
    // 1) Check for active listings (pending_approval / queued / live)
    // -----------------------------
    const blockingStatuses = ["pending_approval", "queued", "live"];

    let activeListingCount = 0;

    // Prefer seller_id style if you have it, then fall back to email attributes.
    const listingChecks: string[][] = [
      [Query.equal("seller_id", userId), Query.equal("status", blockingStatuses)],
      [Query.equal("sellerId", userId), Query.equal("status", blockingStatuses)],
      [Query.equal("userId", userId), Query.equal("status", blockingStatuses)],
      [Query.equal("ownerUserId", userId), Query.equal("status", blockingStatuses)],
      [Query.equal("seller_email", email), Query.equal("status", blockingStatuses)],
      [Query.equal("sellerEmail", email), Query.equal("status", blockingStatuses)],
    ];

    {
      let checked = false;
      for (const q of listingChecks) {
        try {
          const res = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
            ...q,
            Query.limit(1),
          ]);
          activeListingCount = res.total;
          checked = true;
          break;
        } catch {
          continue;
        }
      }

      if (!checked) {
        return NextResponse.json(
          { error: "Failed to check listings (schema/env mismatch)." },
          { status: 500 }
        );
      }
    }

    if (activeListingCount > 0) {
      return NextResponse.json(
        {
          error:
            "You still have a listing in an active state (pending approval, queued, or live). " +
            "Wait until all auctions have finished before deleting your account.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2) Check for active transactions (block if anything not clearly finished)
    // -----------------------------
    if (TX_DB_ID && TX_COLLECTION_ID) {
      // Use pagination and multiple schema paths
      const txQueryShapes: string[][] = [
        [Query.equal("seller_id", userId)],
        [Query.equal("sellerId", userId)],
        [Query.equal("buyer_id", userId)],
        [Query.equal("buyerId", userId)],
        [Query.equal("seller_email", email)],
        [Query.equal("sellerEmail", email)],
        [Query.equal("buyer_email", email)],
        [Query.equal("buyerEmail", email)],
      ];

      let foundAny = false;
      let hasActive = false;

      for (const q of txQueryShapes) {
        try {
          const docs = await listAllDocuments(databases, TX_DB_ID, TX_COLLECTION_ID, q, 100);
          if (docs.length) foundAny = true;
          if (docs.some((tx) => !isTransactionFinished(tx))) {
            hasActive = true;
            break;
          }
        } catch {
          // ignore this shape if schema doesn't have field
          continue;
        }
      }

      if (foundAny && hasActive) {
        return NextResponse.json(
          {
            error:
              "You have transactions still in progress. Once all sales and purchases are completed, you can delete your account.",
          },
          { status: 400 }
        );
      }
    } else {
      // If you use transactions, you should set these envs.
      console.warn("⚠️ DELETE-ACCOUNT: TX env missing; skipping transaction checks.");
    }

    // -----------------------------
    // 3) Delete profile document(s)
    // -----------------------------
    if (PROFILES_DB_ID && PROFILES_COLLECTION_ID) {
      const profTryQueries: string[][] = [
        [Query.equal("userId", userId)],
        [Query.equal("user_id", userId)],
        [Query.equal("ownerUserId", userId)],
        [Query.equal("email", email)],
      ];

      const profDelete = await deleteDocsByQuerySchemaTolerant({
        databases,
        dbId: PROFILES_DB_ID,
        colId: PROFILES_COLLECTION_ID,
        tryQueries: profTryQueries,
        limit: 25,
      });

      if (!profDelete.ok) {
        // Not fatal — some builds don't have profiles collection or it's different
        console.warn("⚠️ DELETE-ACCOUNT: Could not locate profile docs to delete (non-fatal).");
      }
    } else {
      console.warn(
        "⚠️ DELETE-ACCOUNT: PROFILES env missing; skipping profile delete (set APPWRITE_PROFILES_DATABASE_ID + APPWRITE_PROFILES_COLLECTION_ID)."
      );
    }

    // -----------------------------
    // 4) Anonymise historical listings (keep sold/ended history but strip seller identity)
    // -----------------------------
    try {
      const historicalStatuses = ["sold", "not_sold", "completed", "ended"];

      // Find listings by ID fields or email fields (schema tolerant)
      const historyShapes: string[][] = [
        [Query.equal("seller_id", userId), Query.equal("status", historicalStatuses)],
        [Query.equal("sellerId", userId), Query.equal("status", historicalStatuses)],
        [Query.equal("userId", userId), Query.equal("status", historicalStatuses)],
        [Query.equal("ownerUserId", userId), Query.equal("status", historicalStatuses)],
        [Query.equal("seller_email", email), Query.equal("status", historicalStatuses)],
        [Query.equal("sellerEmail", email), Query.equal("status", historicalStatuses)],
      ];

      let historyDocs: any[] = [];

      for (const q of historyShapes) {
        try {
          // paginate
          const docs = await listAllDocuments(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, q, 100);
          if (docs.length) {
            historyDocs = docs;
            break;
          }
        } catch {
          continue;
        }
      }

      for (const listing of historyDocs) {
        const payload: Record<string, any> = {};

        // Update whatever fields exist on that doc without blowing up
        if (has(listing, "seller_email")) payload.seller_email = DELETED_EMAIL_PLACEHOLDER;
        if (has(listing, "sellerEmail")) payload.sellerEmail = DELETED_EMAIL_PLACEHOLDER;
        if (has(listing, "seller_id")) payload.seller_id = "deleted";
        if (has(listing, "sellerId")) payload.sellerId = "deleted";
        if (has(listing, "userId")) payload.userId = "deleted";
        if (has(listing, "ownerUserId")) payload.ownerUserId = "deleted";

        if (Object.keys(payload).length) {
          await updateDocSchemaTolerant(databases, LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listing.$id, payload);
        }
      }
    } catch (err) {
      console.error("⚠️ DELETE-ACCOUNT: Failed anonymisation step (non-fatal)", err);
    }

    // -----------------------------
    // 5) Finally, delete Appwrite user (this will also remove sessions)
    // -----------------------------
    try {
      await users.delete(userId);
      console.log("✅ DELETE-ACCOUNT: User deleted in Appwrite", { userId, email });
    } catch (err) {
      console.error("❌ DELETE-ACCOUNT: Failed to delete user", err);
      return NextResponse.json(
        { error: "Failed to delete user account. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ DELETE-ACCOUNT: Unhandled error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}