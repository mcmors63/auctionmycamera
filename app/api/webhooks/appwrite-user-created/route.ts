// app/api/webhooks/appwrite-user-created/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = (process.env.APPWRITE_WEBHOOK_SECRET || "").trim();

// ✅ Camera branding + admin inbox
const ADMIN_EMAIL = "admin@auctionmycamera.co.uk";
const BRAND_NAME = "AuctionMyCamera";

function requiredEnv(name: string) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = (url.searchParams.get("secret") || "").trim();

    if (!WEBHOOK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "APPWRITE_WEBHOOK_SECRET is not set" },
        { status: 500 }
      );
    }

    if (!secret || secret !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const payload = (body as any)?.payload || body;

    const userId = String((payload as any)?.$id || (payload as any)?.id || "").trim();
    const email = String((payload as any)?.email || "").trim();
    const name = String((payload as any)?.name || "").trim();
    const createdAt = String(
      (payload as any)?.$createdAt || (payload as any)?.createdAt || ""
    ).trim();

    const subject = `👤 New user registered${email ? `: ${email}` : ""}`;

    const textLines = [
      `A new user has registered on ${BRAND_NAME}.`,
      "",
      `Email: ${email || "(missing)"}`,
      `Name: ${name || "(missing)"}`,
      `User ID: ${userId || "(missing)"}`,
      `Created: ${createdAt || "(missing)"}`,
      "",
      `User-Agent: ${req.headers.get("user-agent") || "(missing)"}`,
      `IP (x-forwarded-for): ${req.headers.get("x-forwarded-for") || "(missing)"}`,
    ];

    const host = requiredEnv("SMTP_HOST");
    const port = Number(requiredEnv("SMTP_PORT"));
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: requiredEnv("SMTP_USER"),
        pass: requiredEnv("SMTP_PASS"),
      },
    });

    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${requiredEnv("SMTP_USER")}>`,
      to: ADMIN_EMAIL,
      subject,
      text: textLines.join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[webhooks/appwrite-user-created] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}