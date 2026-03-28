-- Add property_profile JSONB to opportunities table
-- Stores full property-services derivation (lot, zoning, subdivision, overlays)
-- Source: property-services /derive endpoint (shared across F2K, MMC Build, DealFindrs)

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS property_profile JSONB;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS property_lookup_id UUID;

COMMENT ON COLUMN opportunities.property_profile IS 'Full PropertyProfile from property-services /derive';
COMMENT ON COLUMN opportunities.property_lookup_id IS 'Cache ID from property-services for /assess calls';
