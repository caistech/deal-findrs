import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Extract plain text from a PDF buffer, server-side. `unpdf` is a serverless-friendly pdf.js build
 * (no native deps), so it runs in the Next route runtime. Pages are merged into one string; the
 * WAPC letter + plan-summary are text PDFs, so this yields the conditions + lot summary directly.
 */
export async function pdfToText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  // mergePages:true → `text` is a single merged string across all pages.
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? (text as string[]).join('\n') : text
}
