/** Mapbox Geocoding API v5 response types */

export interface MapboxFeature {
  id: string;
  type: "Feature";
  place_type: string[];
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  address?: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  context?: MapboxContext[];
  properties: Record<string, unknown>;
}

export interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

export interface GeocodedAddress {
  formatted_address: string;
  street_number: string;
  street_name: string;
  suburb: string;
  state: string;
  state_short: string;
  postcode: string;
  country: string;
  lat: number;
  lng: number;
}

export interface SiteIntelResult {
  climate_zone: number | null;
  climate_description: string | null;
  wind_region: string | null;
  wind_speed: number | null;
  bal_rating: string | null;
  bal_in_overlay: boolean;
  council_name: string | null;
  council_code: string | null;
  zoning: string | null;
  zone_name: string | null;
}
