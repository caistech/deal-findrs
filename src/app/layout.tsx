import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SayFixWidget } from '@caistech/sayfix-embed'
import { AgentJsonLd } from '@caistech/webmcp-kit/react'
import { agentConfig } from '@/agent-readiness.config'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  // Absolute base so the generated OG image resolves to a full URL (required for OG to work).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://deal-findrs.vercel.app'),
  title: 'DealFindrs | AI-Powered Deal Assessment for Buyers\' Agents',
  description: 'Stop Guessing. Start Knowing. DealFindrs is the branded deal assessment platform for buyers\' agent firms and property development advisories — deploy AI-powered Finance Packs to your developer client roster.',
  keywords: ['property development', 'deal assessment', 'buyers agent', 'finance pack', 'real estate', 'AI', 'proptech', 'property advisory'],
  authors: [{ name: 'Corporate AI Solutions' }],
  openGraph: {
    title: 'DealFindrs | AI-Powered Deal Assessment for Buyers\' Agents',
    description: 'Stop Guessing. Start Knowing. Branded deal assessment for buyers\' agent firms and property advisories — your developer clients get Finance Packs, you get the credit.',
    type: 'website',
    siteName: 'DealFindrs',
    // og:image is supplied automatically by src/app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealFindrs | AI-Powered Deal Assessment for Buyers\' Agents',
    description: 'Stop Guessing. Start Knowing. Branded deal assessment for buyers\' agent firms and property advisories.',
    // twitter:image is supplied automatically by src/app/opengraph-image.tsx
  },
  // favicon + apple icon are supplied automatically by src/app/icon.tsx (+ apple-icon if added)
  // manifest is supplied automatically by src/app/manifest.ts
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable + ' font-sans'}><AgentJsonLd config={agentConfig} />{children}<SayFixWidget repo="deal-findrs" /></body>
    </html>
  )
}
