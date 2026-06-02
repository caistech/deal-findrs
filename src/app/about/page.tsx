import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'

export const metadata = {
  title: 'About DealFindrs',
  description: 'DealFindrs brings AI-powered deal assessment to property development firms and buyers\' agent practices across Australia.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '/#for-firms', label: 'For Firms' },
          { href: '/#for-promoters', label: 'For Promoters' },
          { href: '/reports', label: 'Reports' },
        ]}
        rightContent={
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors text-sm">
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-[#22c55e] text-white rounded-lg font-semibold text-sm hover:bg-[#4ade80] transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        }
      />

      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-white mb-6">About DealFindrs</h1>

        <div className="space-y-8 text-gray-300 leading-relaxed text-lg">
          <p>
            DealFindrs is a deal assessment platform built for property development firms
            and buyers&apos; agent practices in Australia. The platform gives development
            promoters and investment analysts instant, criteria-based Green/Amber/Red
            assessments on every opportunity — and generates the full document trail
            (QS, Valuation, Feasibility, Finance Pack) from the same record.
          </p>

          <p>
            The problem it solves: most development firms still assess deals manually —
            spreadsheets rebuilt from scratch each time, inconsistent scoring, and a
            Finance Pack that takes days to assemble before the lender meeting.
            DealFindrs replaces that with a single pipeline: enter the deal once, get
            the assessment in seconds, and export the Finance Pack in one click.
          </p>

          <p>
            DealFindrs is built by{' '}
            <a
              href="https://www.corporateaisolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22c55e] hover:underline"
            >
              Corporate AI Solutions
            </a>
            , an AI product studio based in Australia.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-white rounded-lg font-semibold hover:border-[#22c55e]/50 transition-all"
          >
            See the reports
          </Link>
        </div>
      </main>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
