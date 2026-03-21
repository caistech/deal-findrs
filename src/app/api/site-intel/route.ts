import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function callEdge(fnName: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { lat, lng, address } = await request.json();

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng required" },
      { status: 400 }
    );
  }

  // Call all 5 edge functions in parallel
  const [wind, council, climate, bal, zoning] = await Promise.all([
    callEdge("wind-derive", { lat, lng }),
    callEdge("council-derive", { lat, lng }),
    callEdge("climate-derive", { lat, lng }),
    callEdge("bal-derive", { lat, lng }),
    callEdge("zoning-derive", { lat, lng, address }),
  ]);

  return NextResponse.json({
    wind_region: wind?.wind_region || null,
    wind_speed: wind?.wind_speed || null,
    council_name: council?.council || null,
    council_code: council?.lga_code || null,
    climate_zone: climate?.climate_zone || null,
    climate_description: climate?.description || null,
    bal_rating: bal?.bal || null,
    bal_in_overlay: bal?.in_overlay || false,
    zoning: zoning?.zoning || null,
    zone_name: zoning?.zone_name || null,
  });
}
