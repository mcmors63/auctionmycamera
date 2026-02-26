// app/api/admin/delete-listing/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Not implemented" },
    { status: 501 }
  );
}