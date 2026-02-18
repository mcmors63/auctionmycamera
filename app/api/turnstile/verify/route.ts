import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = (process.env.TURNSTILE_SECRET_KEY || "").trim();

export async function POST(req: Request) {
  try {
    if (!SECRET) {
      return NextResponse.json(
        { ok: false, error: "TURNSTILE_SECRET_KEY is not set on the server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const token = (body?.token || "").toString().trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing Turnstile token." },
        { status: 400 }
      );
    }

    const form = new URLSearchParams();
    form.set("secret", SECRET);
    form.set("response", token);

    // Optional: helps Cloudflare scoring in some setups (won't break if missing)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "";
    if (ip) form.set("remoteip", ip);

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const data: any = await resp.json().catch(() => null);

    if (!resp.ok || !data) {
      return NextResponse.json(
        { ok: false, error: "Turnstile verification failed." },
        { status: 400 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Turnstile verification failed — please try again.",
          codes: data["error-codes"] || [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[turnstile.verify] fatal:", err);
    return NextResponse.json(
      { ok: false, error: "Turnstile verification error." },
      { status: 500 }
    );
  }
}
