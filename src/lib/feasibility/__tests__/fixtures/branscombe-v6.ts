/**
 * Branscombe V6 — the known-bad real deal used as the engine's regression gate.
 *
 * Why this fixture exists (verbatim from the brief):
 *   - Land value $3.6M (evidenced purchase price only $1.41M — contracts of $610k + $800k).
 *   - GRV $25.15M; senior facility $16.2M.
 *   - Claimed "Net Project Equity" $2.1M (only ~$500k is real cash).
 *   - Claimed LVR 63%; claimed margin 22.2%.
 *
 * A correctly built engine MUST return RED, having independently:
 *   1. Stripped the unbacked $3.6M land value down to the evidenced $1.41M.
 *   2. Counted only ~$500k of real cash equity.
 *   3. Recomputed loan-to-cost in the mid-90s and margin near 6%.
 *   4. Produced a real LVR near 88% (loan $16.2M / GRV $18.4M — promoter's
 *      GRV $25.15M was unevidenced and must be substituted from contracts +
 *      valuation if those are attached, otherwise reduced).
 */

import type { RawInputs } from '../../substitute'
import type { EvidenceRow, FieldLink, EvidenceIndex } from '../../evidence'
import { assembleIndex } from '../../evidence'

export const BRANSCOMBE_V6_RAW: RawInputs = {
  opportunityId: 'branscombe-v6',
  // Promoter's claimed land value (asserted)
  claimedLandValue: 3_600_000,
  // The two executed contracts together total $1.41M.
  evidencedPurchasePrice: 1_410_000,
  // Promoter's "Net Project Equity" — includes land uplift, in-kind, etc.
  claimedTotalEquity: 2_100_000,
  // Of which ~$500k is real cash
  claimedEquityCash: 500_000,
  // GRV asserted at $25.15M
  claimedGRVTotal: 25_150_000,
  numDwellings: 20,          // round number; exact unit count not specified in brief
  constructionPerUnit: 800_000,
  infrastructureCosts: 1_500_000,
  promoterContingencyPct: 0.03,    // promoter under-contingencied
  proposedLoanAmount: 16_200_000,
  isOffshoreSupply: false,
  isComplex: false,
  claimedPreSalesPercent: 0,
}

/**
 * Evidence attached to the fixture:
 *   - purchase contract (land $1.41M)
 *   - equity proof (only $500k of the claimed $2.1M)
 *
 * Notably NO evidence is attached for the GRV ($25.15M is unbacked).
 */
export function buildBranscombeEvidence(): EvidenceIndex {
  const docs: EvidenceRow[] = [
    {
      id: 'ev-purchase-1',
      opportunity_id: 'branscombe-v6',
      company_id: 'fixture-co',
      category: 'purchase_contract',
      storage_path: 'branscombe/purchase_1.pdf',
      original_filename: 'purchase_1.pdf',
      file_size_bytes: 1024,
      mime_type: 'application/pdf',
      extracted_fields: {},
      extraction_confidence: null,
      verified_by_user: true,
      uploader_id: null,
      received_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ev-equity-1',
      opportunity_id: 'branscombe-v6',
      company_id: 'fixture-co',
      category: 'equity_proof',
      storage_path: 'branscombe/equity_1.pdf',
      original_filename: 'equity_proof.pdf',
      file_size_bytes: 2048,
      mime_type: 'application/pdf',
      extracted_fields: {},
      extraction_confidence: null,
      verified_by_user: true,
      uploader_id: null,
      received_at: '2026-01-01T00:00:00Z',
    },
  ]

  const links: FieldLink[] = [
    // Purchase contract backs land value at $1.41M
    {
      id: 'link-land-1',
      opportunity_id: 'branscombe-v6',
      claim_field: 'land_value',
      evidence_id: 'ev-purchase-1',
      evidence_value_numeric: 1_410_000,
      notes: 'Combined contracts: $610k + $800k',
    },
    // Equity proof backs $500k cash equity (the real component)
    {
      id: 'link-equity-1',
      opportunity_id: 'branscombe-v6',
      claim_field: 'equity_cash',
      evidence_id: 'ev-equity-1',
      evidence_value_numeric: 500_000,
      notes: 'Bank statement showing cash on account',
    },
  ]

  return assembleIndex(docs, links)
}
