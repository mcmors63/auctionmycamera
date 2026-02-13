import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// 🧮 Helper: Determine fee based on reserve price
function calculateListingFee(reserve: number): number {
  if (reserve < 5000) return 5;
  if (reserve < 10000) return 10;
  if (reserve < 25000) return 15;
  if (reserve < 50000) return 25;
  return 50;
}

export async function POST(req: Request) {
  try {
    const { registration, reserve_price, seller_email, auction_start } = await req.json();

    if (!registration || !seller_email || reserve_price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const listingFee = calculateListingFee(Number(reserve_price));

    // 💳 In future this can connect to Stripe — for now we just “simulate” payment success
    console.log(`💰 Listing fee of £${listingFee} processed for ${registration}`);

    // 💌 Send seller confirmation
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: true,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    await transporter.sendMail({
      from: `"Auction My Plate" <${process.env.SMTP_USER!}>`,
      to: seller_email,
      subject: `Listing Approved – ${registration}`,
      html: `
        <h2>Your listing has been approved!</h2>
        <p>Congratulations — your registration <strong>${registration}</strong> has been approved for auction.</p>
        <p>The listing fee of <strong>£${listingFee}</strong> has now been processed.</p>
        <p>Your plate will enter the next live auction starting on <strong>${new Date(auction_start).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</strong>.</p>
        <br />
        <p>Thank you for selling with <strong>AuctionMyPlate.co.uk</strong>!</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Listing fee £${listingFee} processed and email sent.`,
    });
  } catch (err: any) {
    console.error("❌ Listing fee error:", err);
    return NextResponse.json(
      { error: "Failed to process listing fee", details: err.message },
      { status: 500 }
    );
  }
}
