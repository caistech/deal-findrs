/**
 * Panel-review field metadata — the site factors a development dossier can't
 * auto-source (a professional completes them). Mirrors the property-services
 * PLANNER_REVIEW constant so the checklist renders without a round-trip; the
 * dossier() call overlays completed status + evidence on top of these.
 */

export const FIELD_KEYS = [
  'title',
  'contamination',
  'servicing',
  'native_title',
  'survey_geotech',
] as const

export type PanelReviewFieldKey = (typeof FIELD_KEYS)[number]

export const PANEL_REVIEW_FIELDS: Record<
  PanelReviewFieldKey,
  { field: string; discipline: string; note: string }
> = {
  title: {
    field: 'Title & encumbrances',
    discipline: 'Conveyancer / Valuer',
    note: 'Order a title search (LANDATA / state land registry) — ownership, mortgages, easements, covenants, caveats.',
  },
  contamination: {
    field: 'Contamination',
    discipline: 'Environmental Engineer',
    note: 'Check the state EPA contaminated-land register and prior site use; a Phase 1 ESA may be required.',
  },
  servicing: {
    field: 'Servicing & utilities',
    discipline: 'Civil Engineer',
    note: 'Confirm water, sewer, power, stormwater and NBN capacity with the relevant authorities.',
  },
  native_title: {
    field: 'Native title & cultural heritage',
    discipline: 'Planner',
    note: 'Check native title (National Native Title Tribunal) and the state Aboriginal cultural-heritage register.',
  },
  survey_geotech: {
    field: 'On-site survey & geotechnical',
    discipline: 'Surveyor / Geotechnical Engineer',
    note: 'Feature/level survey and geotechnical investigation for final design — the engine slope is DEM-derived and indicative only.',
  },
}
