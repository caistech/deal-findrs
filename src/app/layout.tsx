import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'DealFindrs | AI-Powered Project Assessment',
  description: 'The AI-powered platform that gives property development promoters instant Green/Amber/Red assessments on every opportunity.',
  keywords: ['property development', 'deal assessment', 'investment', 'real estate', 'AI'],
  authors: [{ name: 'Corporate AI Solutions' }],
  openGraph: {
    title: 'DealFindrs | AI-Powered Project Assessment',
    description: 'Stop Guessing. Start Knowing. AI-powered deal assessment for property developers.',
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
