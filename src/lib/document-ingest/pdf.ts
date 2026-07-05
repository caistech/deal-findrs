import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'

/**
 * Extract plain text from a PDF buffer, server-side. `unpdf` is a serverless-friendly pdf.js build
 * (no native deps), so it runs in the Next route runtime. Pages are merged into one string; the
 * WAPC letter + plan-summary are text PDFs, so this yields the conditions + lot summary directly.
 * A scanned/image PDF has no text layer → returns ~empty (the caller falls back to {@link pdfToImages}).
 */
export async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  // mergePages:true → `text` is a single merged string across all pages.
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? (text as string[]).join('\n') : text
}

/**
 * Render a PDF's pages to base64 PNG data URLs — the scanned/image-PDF path (Phase 5), so a vision
 * LLM can read a document with no text layer. Rendering needs a canvas implementation in the
 * runtime; if the runtime can't render, this throws and the caller surfaces an actionable message
 * (rather than silently losing the document).
 */
export async function pdfToImages(buffer: ArrayBuffer, maxPages = 12): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const pages = Math.min(pdf.numPages, maxPages)
  const images: string[] = []
  for (let p = 1; p <= pages; p++) {
    const png = await renderPageAsImage(pdf, p, { scale: 2 })
    const b64 = Buffer.from(png as ArrayBuffer).toString('base64')
    images.push(`data:image/png;base64,${b64}`)
  }
  return images
}
