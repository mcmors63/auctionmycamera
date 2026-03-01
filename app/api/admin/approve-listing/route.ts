// app/api/admin/approve-listing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { POST as approveListingPOST } from "../../approve-listing/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/approve-listing
 * This forwards to the existing server route:
 * POST /api/approve-listing
 *
 * Reason: your Admin UI calls /api/admin/* like reject/delete,
 * but the real approve logic lives in /api/approve-listing.
 * This keeps one source of truth and fixes the 405.
 */
export async function POST(req: NextRequest) {
  return approveListingPOST(req);
}

// Optional explicit 405 for other methods
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}