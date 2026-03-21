import type { MapboxFeature, GeocodedAddress } from "./types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const STATE_MAP: Record<string, string> = {
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "south australia": "SA",
  "western australia": "WA",
  tasmania: "TAS",
  "northern territory": "NT",
  "australian capital territory": "ACT",
};

/**
 * Forward geocode search via Mapbox Geocoding API v5.
 * Client-safe — uses the public token.
 */
export async function forwardSearch(query: string): Promise<MapboxFeature[]> {
  if (!query || query.length < 3 || !MAPBOX_TOKEN) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("country", "au");
  url.searchParams.set("types", "address,place,locality");
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "5");

  const resp = await fetch(url.toString());
  if (!resp.ok) return [];

  const data = await resp.json();
  return (data.features ?? []) as MapboxFeature[];
}

/** Parse a Mapbox feature into a structured GeocodedAddress */
export function parseFeature(feature: MapboxFeature): GeocodedAddress {
  const ctx = feature.context || [];
  let state = "";
  let stateShort = "";
  let suburb = "";
  let postcode = "";

  for (const c of ctx) {
    if (c.id.startsWith("region")) {
      state = c.text;
      stateShort =
        c.short_code?.replace("AU-", "") ||
        STATE_MAP[c.text.toLowerCase()] ||
        c.text;
    } else if (c.id.startsWith("place") || c.id.startsWith("locality")) {
      suburb = c.text;
    } else if (c.id.startsWith("postcode")) {
      postcode = c.text;
    }
  }

  return {
    formatted_address: feature.place_name,
    street_number: feature.address || "",
    street_name: feature.text || "",
    suburb,
    state,
    state_short: stateShort,
    postcode,
    country: "Australia",
    lat: feature.center[1],
    lng: feature.center[0],
  };
}
