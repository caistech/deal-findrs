import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'DealFindrs | AI-Powered Deal Assessment for Buyers\' Agents',
  description: 'Stop Guessing. Start Knowing. DealFindrs is the branded deal assessment platform for buyers\' agent firms and property development advisories — deploy AI-powered Finance Packs to your developer client roster.',
  keywords: ['property development', 'deal assessment', 'buyers agent', 'finance pack', 'real estate', 'AI', 'proptech', 'property advisory'],
  authors: [{ name: 'Corporate AI Solutions' }],
  openGraph: {
    title: 'DealFindrs | AI-Powered Deal Assessment for Buyers\' Agents',
    description: 'Stop Guessing. Start Knowing. Branded deal assessment for buyers\' agent firms and property advisories — your developer clients get Finance Packs, you get the credit.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable + ' font-sans'}>{children}</body>
    </html>
  )
}
