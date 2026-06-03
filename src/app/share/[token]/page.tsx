// Distribution loop surface — shared deal assessment summary
// This is a PUBLIC (no-auth) page. A user inside the app shares an assessment link
// with a lender, broker, or partner. The recipient sees the RAG summary branded
// with the partner firm's name, plus a "Powered by DealFindrs" attribution CTA.
// Every shared link is an acquisition path back to the product.

import Link from 'next/link'
import { ArrowRight, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'

// Force dynamic so every visit gets a fresh DB read.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ShareData {
  opportunity_name: string | null
  opportunity_address: string | null
  rag_status: 'green' | 'amber' | 'red' | null
  score: number | null
  gross_margin_pct: number | null
  partner_name: string | null
  expires_at: string | null
}

async function fetchShareData(token: string): Promise<ShareData | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      'https://deal-findrs.vercel.app'

    const res = await fetch(`${baseUrl}/api/share?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })

    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function RagBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  const config = {
    green: {
      icon: CheckCircle,
      bg: 'bg-emerald-500',
      text: 'text-white',
      label: 'GREEN — Deal meets criteria',
    },
    amber: {
      icon: AlertTriangle,
      bg: 'bg-amber-500',
      text: 'text-white',
      label: 'AMBER — Review required',
    },
    red: {
      icon: XCircle,
      bg: 'bg-red-500',
      text: 'text-white',
      label: 'RED — Does not meet criteria',
    },
  }

  const { icon: Icon, bg, text, label } = config[status]

  return (
    <div
      className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${bg} ${text} font-bold text-lg shadow-lg`}
    >
      <Icon className="w-6 h-6" />
      {label}
    </div>
  )
}

export default async function SharePage({
  params,
}: {
  params: { token: string }
}) {
  const data = await fetchShareData(params.token)

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Link not found or expired</h1>
          <p className="text-gray-400 mb-8">
            This shared assessment link has expired or been revoked by its owner.
            Links are active for 30 days from the date they were created.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-[#4ade80] transition-all"
          >
            Learn about DealFindrs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const ragStatus = data.rag_status ?? 'amber'
  const partnerName = data.partner_name ?? 'A DealFindrs partner'
  const dealName = data.opportunity_name ?? 'Property Assessment'
  const dealAddress = data.opportunity_address ?? ''
  const score = data.score != null ? Math.round(data.score) : null
  const gmPct = data.gross_margin_pct != null ? Number(data.gross_margin_pct).toFixed(1) : null

  const gradientMap = {
    green: 'from-emerald-900/60 via-slate-900 to-indigo-900',
    amber: 'from-amber-900/40 via-slate-900 to-indigo-900',
    red: 'from-red-900/40 via-slate-900 to-indigo-900',
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${gradientMap[ragStatus]} text-white`}
    >
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#22c55e] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">DF</span>
            </div>
            <span className="text-white font-semibold">DealFindrs</span>
            <span className="text-gray-500 text-sm">· Shared Assessment</span>
          </div>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-white text-sm rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
          >
            Try for Your Deals <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Explanatory header: what this is / what to do / why it matters */}
        <p className="text-sm text-gray-400 mb-4">
          <strong className="text-gray-200">{partnerName}</strong> used DealFindrs to assess
          this opportunity and shared the result with you. Below is the AI-generated RAG
          assessment — Green / Amber / Red — with the key financial indicators.
        </p>

        {/* Deal name */}
        <h1 className="text-3xl font-bold text-white mb-2">{dealName}</h1>
        {dealAddress && (
          <p className="text-gray-400 mb-6">{dealAddress}</p>
        )}

        {/* RAG result */}
        <div className="mb-8">
          <RagBadge status={ragStatus as 'green' | 'amber' | 'red'} />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {score != null && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-1">Assessment Score</p>
              <p className="text-4xl font-bold text-white">
                {score}
                <span className="text-xl text-gray-400 font-normal">/100</span>
              </p>
            </div>
          )}
          {gmPct != null && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-1">Gross Margin</p>
              <p className={`text-4xl font-bold ${Number(gmPct) >= 25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {gmPct}
                <span className="text-xl font-normal text-gray-400">%</span>
              </p>
              {Number(gmPct) < 25 && (
                <p className="text-xs text-amber-400 mt-1">Below 25% threshold</p>
              )}
            </div>
          )}
        </div>

        {/* Attribution + CTA — the distribution loop node */}
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-8 h-8 text-[#22c55e] flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                Assessed with DealFindrs
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                DealFindrs is the deal assessment platform for buyers&apos; agent firms and
                property development advisories. Agency owners use it to deliver branded
                Finance Packs to their developer clients — instantly, under their own brand.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-bold hover:bg-[#4ade80] transition-all"
                >
                  Start a Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/partners"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[#22c55e]/40 text-[#22c55e] rounded-xl font-semibold hover:border-[#22c55e] transition-all"
                >
                  Partner Programme
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-600 mt-6 text-center">
          This assessment was generated by AI and is for informational purposes only. It does
          not constitute financial advice. The recipient should conduct their own due diligence.
        </p>
      </main>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/partners', label: 'Partner Programme' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
