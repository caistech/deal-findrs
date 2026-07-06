-- Developed lot price — the land-only economics input.
--
-- An estate has two exit strategies: (1) subdivide + sell serviced LOTS (land only), and (2) build
-- + sell HOUSE-AND-LAND. They have different revenue/cost/margin. The model previously only carried
-- `avg_sale_price` (the house-and-land price), which was ALSO being fed into the F2K deal-model's
-- marketPricePerLot (a lot price) — conflating the two. This adds the serviced-lot sale price so the
-- LAND-ONLY case (the subdivider's base play + the assess verdict) is distinct from the house-and-land
-- upside (F2K modular homes on a capture %).
--
-- avg_sale_price is retained as the house-and-land price per dwelling. Idempotent, additive, nullable
-- (older deals have no lot price yet → the assess/F2K paths fall back to avg_sale_price).

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS developed_lot_price NUMERIC;

COMMENT ON COLUMN opportunities.developed_lot_price IS
  'Serviced/developed LOT sale price (land-only exit). Drives the land-only verdict + the F2K deal-model marketPricePerLot. avg_sale_price is the house-and-land price per dwelling (the upside exit).';
