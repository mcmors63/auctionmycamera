// app/api/rollover/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 🔧 Legacy rollover endpoint disabled.
// We now use /api/auction-rollover + /api/auction-scheduler instead.
function response() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "Legacy /api/rollover endpoint is disabled. Use /api/auction-rollover instead.",
    },
    { status: 200 }
  );
}

export async function POST() {
  return response();
}

export async function GET() {
  return response();
}