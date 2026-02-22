// app/api/getaddress/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdealPostcodesAddress = {
  building_number?: string;
  building_name?: string;
  sub_building_name?: string;
  thoroughfare?: string;

  line_1?: string;
  line_2?: string;
  line_3?: string;

  post_town?: string;
  dependant_locality?: string;
  county?: string;
  postcode?: string;
};

function clean(s?: string) {
  return (s || "").trim();
}

function joinParts(parts: string[]) {
  return parts.map((p) => p.trim()).filter(Boolean).join(", ");
}

function normalizePostcode(input: string) {
  // Uppercase + remove spaces for the upstream URL
  return (input || "").trim().toUpperCase().replace(/\s+/g, "");
}

function formatForYourUI(a: IdealPostcodesAddress) {
  const buildingNumber = clean(a.building_number);
  const buildingName = clean(a.building_name);
  const subBuildingName = clean(a.sub_building_name);
  const thoroughfare = clean(a.thoroughfare);

  // Prefer something “house-ish” first
  const house = buildingNumber || subBuildingName || buildingName || clean(a.line_1);

  // Then the street-ish bit
  const street = thoroughfare || clean(a.line_2) || clean(a.line_1);

  const town = clean(a.post_town) || clean(a.dependant_locality);
  const county = clean(a.county);

  return joinParts([house, street, town, county]);
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const url = new URL(req.url);
    const rawPostcode = (url.searchParams.get("postcode") || "").trim();

    if (!rawPostcode) {
      return NextResponse.json({ error: "Postcode is required." }, { status: 400 });
    }

    const apiKey = process.env.IDEAL_POSTCODES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "IDEAL_POSTCODES_API_KEY is not set on the server. Add it to .env.local / Vercel env and redeploy.",
        },
        { status: 500 }
      );
    }

    const postcodeCompact = normalizePostcode(rawPostcode);
    if (postcodeCompact.length < 5) {
      return NextResponse.json({ error: "Please enter a valid UK postcode." }, { status: 400 });
    }

    // Ideal Postcodes postcode lookup returns addresses for a postcode. :contentReference[oaicite:1]{index=1}
    const endpoint = `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(
      postcodeCompact
    )}?api_key=${encodeURIComponent(apiKey)}`;

    const r = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const text = await r.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!r.ok) {
      const message =
        (parsed &&
          (parsed.message || parsed.error || parsed.title || parsed.detail)) ||
        (text ? `Upstream error: ${text.slice(0, 160)}` : "Failed to find address.");

      return NextResponse.json(
        {
          error: message,
          upstreamStatus: r.status,
          timeMs: Date.now() - startedAt,
        },
        { status: r.status }
      );
    }

    // Expected: parsed.result is an array of address objects
    const resultRaw = parsed?.result;

    const result: IdealPostcodesAddress[] = Array.isArray(resultRaw) ? resultRaw : [];

    // If result is unexpectedly not an array, surface something useful
    if (!Array.isArray(resultRaw)) {
      return NextResponse.json(
        {
          error: "Unexpected response format from address provider.",
          upstreamStatus: r.status,
          timeMs: Date.now() - startedAt,
        },
        { status: 502 }
      );
    }

    // Build display strings
    const addresses = uniq(
      result
        .map(formatForYourUI)
        .map((s) =>
          s
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .join(", ")
        )
        .filter(Boolean)
    );

    // Don’t flood the UI (dropdowns get horrible fast)
    const capped = addresses.slice(0, 50);

    return NextResponse.json(
      {
        addresses: capped,
        count: capped.length,
        timeMs: Date.now() - startedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[getaddress] unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to find address (server error)." },
      { status: 500 }
    );
  }
}