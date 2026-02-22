// app/api/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Users, Query } from "node-appwrite";

export const runtime = "nodejs";

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

// -----------------------------
// Helpers
// -----------------------------
function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing ${name}.`);
}

function getClient() {
  requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
  requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
  requireEnv("APPWRITE_API_KEY", apiKey);
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function getDatabases() {
  return new Databases(getClient());
}

function getUsers() {
  return new Users(getClient());
}

function isTransactionFinished(tx: any): boolean {
  const tStatus = String(tx?.transaction_status || "").toLowerCase();
  const pStatus = String(tx?.payment_status || "").toLowerCase();
  return tStatus === "complete" || tStatus === "completed" || pStatus === "paid";
}

function safeEmail(e: unknown) {
  return String(e || "").trim().toLowerCase();
}

// Some projects store seller email as seller_email, others as sellerEmail.
// We check both where possible.
function sellerEmailQueries(email: string) {
  return [
    // Most common
    Query.equal("seller_email", email),
    // Optional fallback if schema supports it (Appwrite will error if attribute doesn't exist)
    Query.equal("sellerEmail", email),
  ];
}

// -----------------------------
// POST /api/delete-account
// Body: { userId, email }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    // Validate env required for this route
    requireEnv("APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)", endpoint);
    requireEnv("APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)", projectId);
    requireEnv("APPWRITE_API_KEY", apiKey);
    requireEnv("APPWRITE_LISTINGS_DATABASE_ID (or NEXT_PUBLIC_...)", LISTINGS_DB_ID);
    requireEnv("APPWRITE_LISTINGS_COLLECTION_ID (or NEXT_PUBLIC_...)", LISTINGS_COLLECTION_ID);

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const userId = String(body.userId || "").trim();
    const email = safeEmail(body.email);

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email are required." }, { status: 400 });
    }

    const databases = getDatabases();
    const users = getUsers();

    // -----------------------------
    // 1) Double-check user exists & email matches
    // -----------------------------
    let user: any;
    try {
      user = await users.get(userId);
    } catch (err) {
      console.error("❌ DELETE-ACCOUNT: users.get failed", err);
      return NextResponse.json({ error: "User not found or invalid userId." }, { status: 404 });
    }

    const appwriteEmail = safeEmail(user?.email);
    if (!appwriteEmail || appwriteEmail !== email) {
      console.warn("⚠️ DELETE-ACCOUNT: Email mismatch", {
        userId,
        appwriteEmail,
        bodyEmail: email,
      });
      return NextResponse.json(
        { error: "Email does not match the account being deleted." },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2) Check for active listings (pending_approval / queued / live)
    // -----------------------------
    // IMPORTANT: Your actual “pending” status is pending_approval.
    const blockingStatuses = ["pending_approval", "queued", "live"];

    let activeListingCount = 0;

    // Try seller_email first; if schema doesn't have it, catch and try sellerEmail.
    try {
      const activeListings = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
        Query.equal("seller_email", email),
        Query.equal("status", blockingStatuses),
        Query.limit(1),
      ]);
      activeListingCount = activeListings.total;
    } catch (errA) {
      try {
        const activeListings = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
          Query.equal("sellerEmail", email),
          Query.equal("status", blockingStatuses),
          Query.limit(1),
        ]);
        activeListingCount = activeListings.total;
      } catch (errB) {
        console.error("❌ DELETE-ACCOUNT: Failed to check listings (schema/env)", { errA, errB });
        return NextResponse.json(
          { error: "Failed to check listing status. Check schema + env IDs." },
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
    // 3) Check for active transactions
    // -----------------------------
    if (!TX_DB_ID || !TX_COLLECTION_ID) {
      // If you truly don't use transactions, this can be empty.
      // But if you do, set envs — otherwise users could delete while deals exist.
      console.warn("⚠️ DELETE-ACCOUNT: TX env missing; skipping transaction checks.");
    } else {
      let hasActiveTransactions = false;
      try {
        const txSeller = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
          Query.equal("seller_email", email),
          Query.limit(200),
        ]);

        const txBuyer = await databases.listDocuments(TX_DB_ID, TX_COLLECTION_ID, [
          Query.equal("buyer_email", email),
          Query.limit(200),
        ]);

        const allTx = [...txSeller.documents, ...txBuyer.documents];
        hasActiveTransactions = allTx.some((tx) => !isTransactionFinished(tx));
      } catch (err) {
        console.error("❌ DELETE-ACCOUNT: Failed to check transactions", err);
        return NextResponse.json(
          { error: "Failed to check transactions. Try again later." },
          { status: 500 }
        );
      }

      if (hasActiveTransactions) {
        return NextResponse.json(
          {
            error:
              "You have transactions still in progress. Once all sales and purchases are completed, you can delete your account.",
          },
          { status: 400 }
        );
      }
    }

    // -----------------------------
    // 4) Delete profile document (Personal Details)
    // -----------------------------
    if (PROFILES_DB_ID && PROFILES_COLLECTION_ID) {
      try {
        const profRes = await databases.listDocuments(PROFILES_DB_ID, PROFILES_COLLECTION_ID, [
          Query.equal("email", email),
          Query.limit(10),
        ]);

        // If multiple docs exist (shouldn't), delete them all.
        for (const profileDoc of profRes.documents) {
          await databases.deleteDocument(PROFILES_DB_ID, PROFILES_COLLECTION_ID, profileDoc.$id);
          console.log("✅ DELETE-ACCOUNT: Profile deleted", profileDoc.$id);
        }

        if (profRes.total === 0) {
          console.log("ℹ️ DELETE-ACCOUNT: No profile document found for", email);
        }
      } catch (err) {
        console.error("❌ DELETE-ACCOUNT: Failed to delete profile document", err);
        return NextResponse.json(
          { error: "Failed to delete profile. Try again later." },
          { status: 500 }
        );
      }
    } else {
      console.warn(
        "⚠️ DELETE-ACCOUNT: PROFILES env missing; skipping profile delete (set APPWRITE_PROFILES_DATABASE_ID + APPWRITE_PROFILES_COLLECTION_ID)."
      );
    }

    // -----------------------------
    // 5) Anonymise historical listings (optional clean-up)
    //    Keep SOLD/ENDED history but strip seller email.
    // -----------------------------
    try {
      const historicalStatuses = ["sold", "not_sold", "completed", "ended"];

      // seller_email path
      let historyDocs: any[] = [];
      try {
        const res = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
          Query.equal("seller_email", email),
          Query.equal("status", historicalStatuses),
          Query.limit(200),
        ]);
        historyDocs = res.documents;
      } catch (errA) {
        // sellerEmail fallback
        const res = await databases.listDocuments(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, [
          Query.equal("sellerEmail", email),
          Query.equal("status", historicalStatuses),
          Query.limit(200),
        ]);
        historyDocs = res.documents;
      }

      for (const listing of historyDocs) {
        try {
          await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listing.$id, {
            seller_email: "deleted@auctionmycamera.co.uk",
          });
        } catch (innerErrA) {
          // If schema doesn't allow seller_email, try sellerEmail
          try {
            await databases.updateDocument(LISTINGS_DB_ID, LISTINGS_COLLECTION_ID, listing.$id, {
              sellerEmail: "deleted@auctionmycamera.co.uk",
            });
          } catch (innerErrB) {
            console.error(
              "⚠️ DELETE-ACCOUNT: Failed to anonymise listing",
              listing.$id,
              { innerErrA, innerErrB }
            );
          }
        }
      }
    } catch (err) {
      console.error("⚠️ DELETE-ACCOUNT: Failed anonymisation step (non-fatal)", err);
    }

    // -----------------------------
    // 6) Finally, delete Appwrite user
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