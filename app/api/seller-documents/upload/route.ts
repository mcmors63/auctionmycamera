// app/api/seller-documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Client, Storage, Databases, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// -----------------------------
// ENV
// -----------------------------
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;
const bucketId = process.env.APPWRITE_SELLER_DOCS_BUCKET_ID!;

// Transactions DB/collection – same DB as plates
const TX_DB_ID =
  process.env.APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_DATABASE_ID ||
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;

const TX_COLLECTION_ID =
  process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

// SMTP / admin
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "admin@auctionmyplate.co.uk";

function getAppwriteClient() {
  return new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
}

function getTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[seller-documents/upload] SMTP not fully configured, skipping emails."
    );
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const sellerId = formData.get("sellerId");
    const transactionId = formData.get("transactionId");
    const docType = formData.get("docType");
    const fileField = formData.get("file");

    if (!sellerId || typeof sellerId !== "string") {
      return NextResponse.json({ error: "Missing sellerId" }, { status: 400 });
    }

    if (!docType || typeof docType !== "string") {
      return NextResponse.json({ error: "Missing docType" }, { status: 400 });
    }

    if (!fileField || typeof fileField === "string") {
      return NextResponse.json(
        { error: "File not provided or invalid" },
        { status: 400 }
      );
    }

    const blob = fileField as Blob & {
      name?: string;
      size?: number;
      type?: string;
    };

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const client = getAppwriteClient();
    const storage = new Storage(client);
    const databases = new Databases(client);

    // -----------------------------
    // 1) Upload file into bucket
    // -----------------------------
    const inputFile = InputFile.fromBuffer(
      buffer,
      blob.name || "document-upload"
    );

    const createdFile = await storage.createFile(
      bucketId,
      ID.unique(),
      inputFile
    );

    console.log("[seller-documents/upload] Uploaded seller doc:", {
      sellerId,
      transactionId,
      docType,
      fileId: createdFile.$id,
    });

    // Metadata we want to attach to the transaction
    const docMeta = {
      fileId: createdFile.$id,
      bucketId,
      docType,
      sellerId,
      transactionId: transactionId || null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: sellerId,
      label: docType,
      fileName: blob.name || null,
    };

    let updatedTx: any = null;

    // -----------------------------
    // 2) Attach to transaction (if we have one)
    // -----------------------------
    if (transactionId && typeof transactionId === "string") {
      try {
        const txDoc: any = await databases.getDocument(
          TX_DB_ID,
          TX_COLLECTION_ID,
          transactionId
        );

        const existingDocs = Array.isArray(txDoc.documents)
          ? txDoc.documents
          : [];

        updatedTx = await databases.updateDocument(
          TX_DB_ID,
          TX_COLLECTION_ID,
          transactionId,
          {
            documents: [...existingDocs, docMeta],
            // Mark seller docs received – if you later have a buyer uploader,
            // you can add a separate flag there.
            seller_docs_received: true,
            updated_at: new Date().toISOString(),
          }
        );

        console.log(
          "[seller-documents/upload] Transaction updated with document",
          {
            transactionId,
          }
        );
      } catch (err) {
        console.error(
          "[seller-documents/upload] Failed to update transaction with document:",
          err
        );
        // We still continue – upload is successful, transaction link is best-effort
      }
    }

    // -----------------------------
    // 3) Email admin to say docs were uploaded
    // -----------------------------
    try {
      const transporter = getTransporter();
      if (transporter) {
        const subjectTxPart = transactionId
          ? ` for transaction ${transactionId}`
          : "";

        await transporter.sendMail({
          from: `"AuctionMyPlate" <${smtpUser}>`,
          to: ADMIN_EMAIL,
          subject: `New document uploaded${subjectTxPart}`,
          text: `A new supporting document has been uploaded on AuctionMyPlate.

Seller ID: ${sellerId}
Transaction ID: ${transactionId || "not supplied"}
Doc type: ${docType}
File ID: ${createdFile.$id}

You can view the file in the Appwrite Storage bucket (${bucketId}) and the associated transaction in the admin panel.
`,
        });

        console.log(
          "[seller-documents/upload] Admin notification email sent."
        );
      }
    } catch (mailErr) {
      console.error(
        "[seller-documents/upload] Failed to send admin email:",
        mailErr
      );
      // Don’t fail the request over email
    }

    return NextResponse.json(
      {
        ok: true,
        fileId: createdFile.$id,
        sellerId,
        transactionId: transactionId || null,
        docType,
        updatedTransactionId: updatedTx?.$id || null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[seller-documents/upload] Upload seller doc error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
