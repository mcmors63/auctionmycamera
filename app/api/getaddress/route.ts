// app/api/getaddress/route.ts
import { NextRequest, NextResponse } from "next/server";

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

function formatForYourUI(a: IdealPostcodesAddress) {
  const buildingNumber = clean(a.building_number);
  const buildingName = clean(a.building_name);
  const subBuildingName = clean(a.sub_building_name);
  const thoroughfare = clean(a.thoroughfare);

  const house =
    buildingNumber || subBuildingName || buildingName || clean(a.line_1);

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

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const url = new URL(req.url);
    const rawPostcode = (url.searchParams.get("postcode") || "").trim();

    if (!rawPostcode) {
      return NextResponse.json(
        { error: "Postcode is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.IDEAL_POSTCODES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "IDEAL_POSTCODES_API_KEY is not set on the server. Add it to .env.local and restart dev server.",
        },
        { status: 500 }
      );
    }

    const postcodeForUrl = encodeURIComponent(rawPostcode);
    const endpoint = `https://api.ideal-postcodes.co.uk/v1/postcodes/${postcodeForUrl}?api_key=${encodeURIComponent(
      apiKey
    )}`;

    const r = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    // Read as text first so we can handle empty/non-JSON bodies without ending up with "{}"
    const text = await r.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!r.ok) {
      const message =
        (parsed &&
          (parsed.message ||
            parsed.error ||
            parsed.title ||
            parsed.detail)) ||
        (text ? `Upstream error: ${text.slice(0, 120)}` : "Failed to find address.");

      // NOTE: We include upstreamStatus + timeMs to stop guesswork.
      return NextResponse.json(
        {
          error: message,
          upstreamStatus: r.status,
          timeMs: Date.now() - startedAt,
        },
        { status: r.status }
      );
    }

    const result: IdealPostcodesAddress[] = Array.isArray(parsed?.result)
      ? parsed.result
      : [];

    const addresses = result
      .map(formatForYourUI)
      .map((s) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .join(", ")
      )
      .filter(Boolean);

    return NextResponse.json(
      {
        addresses,
        count: addresses.length,
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
