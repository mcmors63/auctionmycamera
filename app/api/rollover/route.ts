// app/api/rollover/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 🔧 Legacy rollover endpoint disabled.
// We now use /api/auction-rollover + /api/auction-scheduler instead.
export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "Legacy /api/rollover endpoint is disabled. Use /api/auction-rollover instead.",
    },
    { status: 200 }
  );
}
