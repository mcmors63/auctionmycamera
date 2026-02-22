import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const toRaw = typeof body?.to === "string" ? body.to.trim() : "";
    const registrationRaw =
      typeof body?.registration === "string" ? body.registration.trim() : "";

    if (!toRaw || !toRaw.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'to' email address." },
        { status: 400 }
      );
    }

    if (!registrationRaw) {
      return NextResponse.json(
        { success: false, error: "Missing 'registration'." },
        { status: 400 }
      );
    }

    const SMTP_HOST = process.env.SMTP_HOST || "";
    const SMTP_PORT = Number(process.env.SMTP_PORT || "0");
    const SMTP_USER = process.env.SMTP_USER || "";
    const SMTP_PASS = process.env.SMTP_PASS || "";

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error("[email-approved] Missing SMTP env vars.", {
        SMTP_HOST: !!SMTP_HOST,
        SMTP_PORT,
        SMTP_USER: !!SMTP_USER,
        SMTP_PASS: !!SMTP_PASS,
      });
      return NextResponse.json(
        { success: false, error: "Server email configuration is missing." },
        { status: 500 }
      );
    }

    // Common rule: port 465 => secure true. Others (e.g. 587) => secure false.
    const secure = SMTP_PORT === 465;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const itemLabel = escapeHtml(registrationRaw);

    await transporter.sendMail({
      from: `"Auction My Camera" <${SMTP_USER}>`,
      to: toRaw,
      subject: `Your listing "${registrationRaw}" has been approved`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;padding:24px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:20px 22px;background:#111827;color:#ffffff;">
              <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Auction My Camera</div>
              <div style="font-size:22px;font-weight:700;margin-top:6px;">Listing approved</div>
            </div>

            <div style="padding:22px;color:#111827;">
              <p style="margin:0 0 12px 0;">Hi there,</p>

              <p style="margin:0 0 12px 0;">
                Your listing <strong>${itemLabel}</strong> has been approved and will appear in the <strong>next live auction</strong>.
              </p>

              <p style="margin:0 0 16px 0;">
                We’ll email you again when the auction goes live.
              </p>

              <p style="margin:0;">
                Thanks for using <strong>AuctionMyCamera.co.uk</strong>.
              </p>

              <hr style="margin:20px 0;border:0;border-top:1px solid #e5e7eb;" />

              <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
                This is an automated message — please don’t reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[email-approved] Email send failed:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Email send failed." },
      { status: 500 }
    );
  }
}