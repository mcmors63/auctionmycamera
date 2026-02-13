// /app/api/notify-bid-update/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Client, Databases } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // ✅ server key only

const databases = new Databases(client);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, newBid, bidderEmail } = body;

    if (!listingId || !newBid || !bidderEmail) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
    const colId = process.env.NEXT_PUBLIC_APPWRITE_PLATES_COLLECTION_ID!;

    // ✅ Load listing data
    const listing = await databases.getDocument(dbId, colId, listingId);

    const sellerEmail = listing.seller_email;
    const previousBidder = listing.last_bidder || listing.highest_bidder || null;
    const plate = listing.registration;

    // ✅ Mailer setup
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Send to seller
    if (sellerEmail) {
      await transporter.sendMail({
        from: `"Auction My Plate" <${process.env.SMTP_USER}>`,
        to: sellerEmail,
        subject: `💷 New Bid on ${plate}!`,
        html: `
          <h2>Good news!</h2>
          <p>Your number plate <strong>${plate}</strong> has just received a new bid of <strong>£${newBid}</strong>.</p>
          <p>Bidder: ${bidderEmail}</p>
          <p>View it in your Seller Dashboard for full details.</p>
          <br />
          <p>— Auction My Plate</p>
        `,
      });
    }

    // ✅ Notify previous highest bidder (outbid notice)
    if (previousBidder && previousBidder !== bidderEmail) {
      await transporter.sendMail({
        from: `"Auction My Plate" <${process.env.SMTP_USER}>`,
        to: previousBidder,
        subject: `⚠️ You’ve been outbid on ${plate}`,
        html: `
          <h2>Heads up!</h2>
          <p>Your bid on <strong>${plate}</strong> has been beaten.</p>
          <p>The new highest bid is <strong>£${newBid}</strong>.</p>
          <p>If you still want the plate, head back and place a higher bid.</p>
          <br />
          <p>— Auction My Plate</p>
        `,
      });
    }

    return NextResponse.json({ ok: true, message: "Notifications sent" });
  } catch (err: any) {
    console.error("notify-bid-update error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
