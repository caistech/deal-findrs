import Link from 'next/link'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'

export const metadata = {
  title: 'Terms of Service — DealFindrs',
  description: 'DealFindrs Terms of Service — the rules that govern your use of the platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '/#for-firms', label: 'For Firms' },
          { href: '/reports', label: 'Reports' },
        ]}
        rightContent={
          <Link
            href="/login"
            className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors text-sm"
          >
            Log In
          </Link>
        }
      />

      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance</h2>
            <p>
              By creating an account or using DealFindrs, you agree to these Terms.
              If you are creating an account on behalf of a firm, you confirm you are
              authorised to bind that firm.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Service description</h2>
            <p>
              DealFindrs provides AI-powered property development opportunity assessment
              tools, including RAG assessments, QS reports, Valuation reports, Feasibility
              studies, Affordable Gap analyses, and Finance Packs. All outputs are
              decision-support tools — they do not constitute financial, legal, or
              valuation advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Your data</h2>
            <p>
              You retain ownership of all opportunity data you enter. We process it to
              provide the service. See the{' '}
              <Link href="/privacy" className="text-[#22c55e] hover:underline">
                Privacy Policy
              </Link>{' '}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Acceptable use</h2>
            <p>
              You must not use DealFindrs to assess fictitious opportunities for the purpose
              of generating misleading Finance Packs, or to circumvent lender due diligence.
              Accounts found in violation will be terminated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Billing</h2>
            <p>
              Paid plans are billed monthly or annually in advance via Stripe. Cancellation
              takes effect at the end of the current billing period. Refunds are not issued
              for partial periods.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Limitation of liability</h2>
            <p>
              DealFindrs is provided &quot;as is.&quot; To the maximum extent permitted by law,
              Corporate AI Solutions is not liable for any loss arising from reliance on
              assessment outputs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">7. Contact</h2>
            <p>
              Corporate AI Solutions · legal@corporateaisolutions.com
            </p>
          </section>
        </div>
      </main>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/privacy', label: 'Privacy' },
        ]}
      />
    </div>
  )
}
