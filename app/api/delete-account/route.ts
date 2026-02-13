// app/api/delete-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, Users, Query } from "node-appwrite";

export const runtime = "nodejs";

// -----------------------------
// ENV (server-side)
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

// Plates DB / collection
const PLATES_DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID ||
  "690fc34a0000ce1baa63";

const PLATES_COLLECTION_ID =
  process.env.APPWRITE_PLATES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID ||
  "plates";

// Transactions share the same DB as plates
const TX_DB_ID = PLATES_DB_ID;
const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// Profiles DB / collection (used for address etc.)
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
function getClient() {
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite server config missing.");
  }
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function getDatabases() {
  return new Databases(getClient());
}

function getUsers() {
  return new Users(getClient());
}

function isTransactionFinished(tx: any): boolean {
  const tStatus = (tx.transaction_status || "").toString().toLowerCase();
  const pStatus = (tx.payment_status || "").toString().toLowerCase();
  return (
    tStatus === "complete" ||
    tStatus === "completed" ||
    pStatus === "paid"
  );
}

// -----------------------------
// POST /api/delete-account
// Body: { userId, email }
// -----------------------------
export async function POST(req: NextRequest) {
  try {
    if (!endpoint || !projectId || !apiKey) {
      console.error("❌ DELETE-ACCOUNT: Missing Appwrite config");
      return NextResponse.json(
        { error: "Server Appwrite config missing." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const userId = body.userId as string | undefined;
    const email = body.email as string | undefined;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required." },
        { status: 400 }
      );
    }

    const databases = getDatabases();
    const users = getUsers();

    // -----------------------------
    // 1) Double-check user exists & email matches
    // -----------------------------
    let user;
    try {
      user = await users.get(userId);
    } catch (err) {
      console.error("❌ DELETE-ACCOUNT: users.get failed", err);
      return NextResponse.json(
        { error: "User not found or invalid userId." },
        { status: 404 }
      );
    }

    const appwriteEmail = (user as any).email as string | undefined;
    if (!appwriteEmail || appwriteEmail.toLowerCase() !== email.toLowerCase()) {
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
    // 2) Check for active plates (pending / queued / live)
    // -----------------------------
    let activePlateCount = 0;
    try {
      const activePlates = await databases.listDocuments(
        PLATES_DB_ID,
        PLATES_COLLECTION_ID,
        [
          Query.equal("seller_email", email),
          // any status in this list will block deletion
          Query.equal("status", ["pending", "queued", "live"]),
        ]
      );
      activePlateCount = activePlates.total;
    } catch (err) {
      console.error("❌ DELETE-ACCOUNT: Failed to check plates", err);
      return NextResponse.json(
        { error: "Failed to check plate status. Try again later." },
        { status: 500 }
      );
    }

    if (activePlateCount > 0) {
      return NextResponse.json(
        {
          error:
            "You still have a plate in an active auction (pending, queued or live). " +
            "Wait until all auctions have finished before deleting your account.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // 3) Check for active transactions
    // -----------------------------
    let hasActiveTransactions = false;
    if (TX_DB_ID && TX_COLLECTION_ID) {
      try {
        // As seller
        const txSeller = await databases.listDocuments(
          TX_DB_ID,
          TX_COLLECTION_ID,
          [Query.equal("seller_email", email)]
        );

        // As buyer
        const txBuyer = await databases.listDocuments(
          TX_DB_ID,
          TX_COLLECTION_ID,
          [Query.equal("buyer_email", email)]
        );

        const allTx = [...txSeller.documents, ...txBuyer.documents];

        hasActiveTransactions = allTx.some((tx) => !isTransactionFinished(tx));
      } catch (err) {
        console.error("❌ DELETE-ACCOUNT: Failed to check transactions", err);
        return NextResponse.json(
          { error: "Failed to check transactions. Try again later." },
          { status: 500 }
        );
      }
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

    // -----------------------------
    // 4) Delete / anonymise profile
    // -----------------------------
    if (PROFILES_DB_ID && PROFILES_COLLECTION_ID) {
      try {
        const profRes = await databases.listDocuments(
          PROFILES_DB_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal("email", email)]
        );

        if (profRes.total > 0) {
          const profileDoc = profRes.documents[0];
          await databases.deleteDocument(
            PROFILES_DB_ID,
            PROFILES_COLLECTION_ID,
            profileDoc.$id
          );
          console.log("✅ DELETE-ACCOUNT: Profile deleted", profileDoc.$id);
        } else {
          console.log(
            "ℹ️ DELETE-ACCOUNT: No profile document found for",
            email
          );
        }
      } catch (err) {
        console.error(
          "❌ DELETE-ACCOUNT: Failed to delete profile document",
          err
        );
        return NextResponse.json(
          { error: "Failed to delete profile. Try again later." },
          { status: 500 }
        );
      }
    } else {
      console.warn(
        "⚠️ DELETE-ACCOUNT: PROFILES_DB_ID / PROFILES_COLLECTION_ID not set, skipping profile delete."
      );
    }

    // -----------------------------
    // 5) Anonymise historical plates (optional clean-up)
    //    We leave SOLD / COMPLETED records but strip PII.
// -----------------------------
    try {
      const historyPlates = await databases.listDocuments(
        PLATES_DB_ID,
        PLATES_COLLECTION_ID,
        [
          Query.equal("seller_email", email),
          Query.equal("status", ["sold", "not_sold", "completed"]),
        ]
      );

      for (const plate of historyPlates.documents) {
        try {
          await databases.updateDocument(
            PLATES_DB_ID,
            PLATES_COLLECTION_ID,
            plate.$id,
            {
              seller_email: "deleted@auctionmyplate.co.uk",
            }
          );
        } catch (innerErr) {
          console.error(
            "⚠️ DELETE-ACCOUNT: Failed to anonymise plate",
            plate.$id,
            innerErr
          );
        }
      }
    } catch (err) {
      console.error(
        "⚠️ DELETE-ACCOUNT: Failed to fetch historical plates for anonymisation",
        err
      );
      // Not fatal – continue
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

    // -----------------------------
    // 7) Done
    // -----------------------------
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ DELETE-ACCOUNT: Unhandled error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
