import Link from 'next/link'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'

export const metadata = {
  title: 'Privacy Policy — DealFindrs',
  description: 'How DealFindrs collects, uses, and protects your data.',
}

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: June 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. What data we collect</h2>
            <p>
              DealFindrs collects the information you provide during account creation (name,
              email, company details, mobile), the property opportunity data you enter into
              the platform, and usage metadata (page views, feature interactions) for product
              improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. How we use your data</h2>
            <p>
              Your data is used to run the assessment pipeline (RAG, QS, Valuation,
              Feasibility, Finance Pack), to authenticate your account, and to send
              transactional emails. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Data storage and residency</h2>
            <p>
              Data is stored in Supabase (PostgreSQL) with row-level security. Australian
              customers&apos; data is hosted in the ap-southeast-2 (Sydney) region.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data at
              any time. To exercise these rights, contact us at the address below. Account
              deletion can also be triggered from the Settings page inside the product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Contact</h2>
            <p>
              Corporate AI Solutions · privacy@corporateaisolutions.com
            </p>
          </section>
        </div>
      </main>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
