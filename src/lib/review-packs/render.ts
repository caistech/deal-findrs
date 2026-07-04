import { renderPdf, type RenderResult } from '@caistech/report-generator'
import type { ReviewPackContext, ReviewPackTemplate } from './types'

/**
 * Render a review-pack template to a branded PDF via @caistech/report-generator (the shared
 * Markdown → PDF path — no bespoke PDF plumbing). Brand/disclaimer are the DealFindrs/F2K estate
 * pipeline identity. Throws if the pack isn't available yet (the caller gates on `available` first).
 */

const BRAND = {
  productName: 'DealFindrs',
  primaryColor: '#4f46e5',
  accentColor: '#059669',
}

const DISCLAIMER =
  'Prepared by DealFindrs (Factory2Key estate pipeline) as a desktop buildup for professional ' +
  'review and certification. Figures are derived from third-party planning/terrain datasets and ' +
  'are indicative only — not a substitute for formal professional assessment or certification.'

export async function renderReviewPack(template: ReviewPackTemplate, ctx: ReviewPackContext): Promise<RenderResult> {
  const availability = template.available(ctx)
  if (!availability.ok) {
    throw new Error(availability.reason || 'Review pack not available yet.')
  }

  const o = ctx.opportunity
  const markdown = template.buildMarkdown(ctx)

  return renderPdf({
    markdown,
    brand: BRAND,
    header: {
      title: template.title,
      subtitle: o.name || o.address || 'Estate site',
      preparedFor: template.professionLabel,
      dateLine: ctx.preparedOn,
    },
    footer: {
      disclaimer: DISCLAIMER,
      watermark: 'INDICATIVE — FOR REVIEW',
      pageNumbers: true,
    },
    metadata: {
      author: 'DealFindrs',
      subject: template.title,
      recipient: template.professionLabel,
      title: `${template.title} — ${o.name || 'Estate site'}`,
    },
  })
}

/** A filesystem-safe download name for a pack. */
export function reviewPackFilename(kind: string, opportunityName: string | null): string {
  const slug = (opportunityName || 'estate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${slug || 'estate'}-${kind}-review-pack.pdf`
}
