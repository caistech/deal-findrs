'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Mic,
  Target,
  BarChart3,
  FileText,
  Zap,
  Building2,
  Users,
  MapPin,
  BadgeCheck,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'
import { markerProps } from '@/lib/surveyMarkers'

// ─── Card values (sourced from _spec.json — single source for copy AND markers) ─
const CARD = {
  promise:
    'DealFindrs delivers instant Green/Amber/Red AI-powered assessments on property development opportunities, eliminating guesswork with consistent, criteria-based scoring.',
  friction:
    "Property developers and buyers' agents struggle to evaluate deal opportunities consistently and risk missing profitable deals or taking bad ones.",
  core_mechanism:
    'AI analyzes user-defined criteria (minimum GM%, de-risk factors, deal-breakers) and provides instant RAG ratings with detailed explanations and action items.',
  icp_geography: 'Global (headquartered in Brisbane, Australia)',
  // Named archetype: the prospect is the "buyers-agent-firm" (a named entity, not a generic channel category)
  icp_partner_type: 'buyers-agent-firm',
  icp_buyer_title: 'Agency Owner',
  // Named entity from the card: "Proptech consultancies, real-estate franchise networks, buyers'-agent industry bodies"
  icp_verticals:
    "Proptech consultancies, real-estate franchise networks, buyers'-agent industry bodies",
  icp_company_size: '5-50 employees',
  // enum: seed | growth | scale | operating-business | enterprise
  icp_stage: 'operating-business' as const,
  exclusions:
    'solo-affiliates-no-client-base;generic-software-resellers-no-property-vertical',
  // distributor named archetype
  distributor: 'buyers-agent-firm',
  distributor_outcomes:
    "Distributors get a steady flow of scored deals under their own brand, team collaboration tools, and white-label options for Premium plans.",
  // end user named archetype
  end_user: 'property-developer',
  end_user_outcomes:
    'Consistent deal evaluation criteria remembered forever, instant RAG ratings in seconds, auto-generated professional Investment Memorandums, and faster, smarter investment decisions within 90 days.',
  why_now:
    'Property finance is tightening — lenders now require full feasibility documentation before credit approval. Developers who arrive with a Finance Pack close faster. The firms that provide that capability win the mandate.',
} as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '#for-clients', label: 'For Developers' },
          { href: '/partners', label: 'For Partners' },
          { href: '#features', label: 'Features' },
          { href: '/reports', label: 'Reports' },
          { href: '#pricing', label: 'Pricing' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
            >
              Get Started
            </Link>
          </div>
        }
      />

      {/* ── HERO ── promise + friction + why_now ── */}
      <div
        className="max-w-7xl mx-auto px-6 pt-20 pb-32"
        {...markerProps('promise', CARD.promise)}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Deal Assessment — Channel Partner Programme
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Stop Guessing.<br />
              <span className="text-[#22c55e]">Start Knowing.</span>
            </h1>

            {/* PROMISE: visible copy mirrors card.promise */}
            <p className="text-xl text-gray-300 mb-4 leading-relaxed">
              DealFindrs delivers instant <strong className="text-white">Green/Amber/Red
              AI-powered assessments</strong> on property development opportunities —
              eliminating guesswork with consistent, criteria-based scoring.
            </p>

            {/* FRICTION: problem copy mirrors card.friction */}
            <p
              className="text-base text-gray-400 mb-4 leading-relaxed border-l-2 border-amber-500/40 pl-3"
              {...markerProps('friction', CARD.friction)}
            >
              Property developers and buyers&apos; agents struggle to evaluate deal
              opportunities consistently — risking missed profits or bad investments
              without a repeatable scoring framework.
            </p>

            {/* WHY NOW: marker for P3 */}
            <p
              className="text-sm text-[#22c55e]/80 mb-6 leading-relaxed"
              {...markerProps('why_now', CARD.why_now)}
            >
              Property finance is tightening — lenders now require full feasibility
              documentation before credit approval. Developers who arrive with a Finance
              Pack close faster. The firms that provide that capability win the mandate.
            </p>

            {/* ICP PARTNER TYPE: named archetype "buyers-agent-firm" */}
            <p
              className="text-sm text-slate-400 mb-6 border-l-2 border-[#22c55e]/40 pl-3"
              {...markerProps('icp_partner_type', CARD.icp_partner_type)}
            >
              Built for <strong className="text-slate-300">buyers&apos; agent firms</strong> and
              property development advisories — operating businesses that deploy DealFindrs
              as a branded assessment service for their developer client roster.
            </p>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="/signup"
                className="px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all flex items-center gap-2"
              >
                Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/partners"
                className="px-6 py-4 border border-[#22c55e]/40 text-[#22c55e] rounded-xl font-semibold hover:border-[#22c55e] transition-all flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Become a Partner
              </Link>
            </div>
            <p className="text-gray-500 text-sm mt-4">No credit card required · Cancel anytime</p>
          </div>

          <div className="relative hidden lg:block">
            {/* Dashboard Preview */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="w-4 h-4 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-gray-800">Brisbane ADU Portfolio</span>
                  <span className="ml-auto text-emerald-600 font-bold">28.5%</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-800">Branscomb Rd Development</span>
                  <span className="ml-auto text-red-600 font-bold text-xs sm:text-sm">Unfunded — equity gap</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-gray-800">Parramatta Infill Site</span>
                  <span className="ml-auto text-amber-600 font-bold">18.2%</span>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
              GREEN
            </div>
          </div>
        </div>
      </div>

      {/* ── WHO DISTRIBUTES IT: BUYERS' AGENTS & PROPERTY FIRMS ── */}
      {/*
        DISTRIBUTOR SECTION — buyers' agent firms and property development advisories
        that deploy DealFindrs as a branded assessment service to their developer clients.
        distributor + distributor_outcomes markers live on /partners page (the dedicated
        distributor surface). ICP profile markers are here to evidence the audience.
      */}
      <div className="bg-slate-800/60 py-24 border-t border-slate-700/40" id="for-partners-overview">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
              <Users className="w-4 h-4" />
              For buyers&apos; agents &amp; property firms
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Deploy branded deal-assessment to your clients
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl leading-relaxed">
              DealFindrs is licensed by{' '}
              <strong className="text-gray-200">
                buyers&apos; agent firms, property development advisories, and real estate agencies
              </strong>{' '}
              — the channel partners who serve property developer and promoter clients.
              The firm sets the criteria; each developer client gets a branded workspace where
              they run their deals and produce Finance Packs. The firm grows its service offering
              without building assessment infrastructure from scratch.
            </p>
          </div>

          {/* ICP Profile cards — geography, buyer title, company size, stage, verticals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* ICP GEOGRAPHY */}
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_geography', CARD.icp_geography)}
            >
              <MapPin className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Geography</p>
              <p className="text-white font-semibold text-base leading-snug">
                Australia (SYD · MEL · BNE · PER)
              </p>
              <p className="text-gray-400 text-sm mt-1">Global rollout; HQ Brisbane</p>
            </div>

            {/* ICP BUYER TITLE */}
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_buyer_title', CARD.icp_buyer_title)}
            >
              <Users className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Buyer title</p>
              <p className="text-white font-semibold text-base leading-snug">Agency Owner / Principal</p>
              <p className="text-gray-400 text-sm mt-1">
                Head of a buyers&apos; agent firm or property development advisory
              </p>
            </div>

            {/* ICP COMPANY SIZE */}
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_company_size', CARD.icp_company_size)}
            >
              <Building2 className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Firm size</p>
              <p className="text-white font-semibold text-base leading-snug">5–50 employees</p>
              <p className="text-gray-400 text-sm mt-1">Serving 10–50 active developer clients/year</p>
            </div>

            {/* ICP STAGE */}
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_stage', CARD.icp_stage)}
            >
              <TrendingUp className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Stage</p>
              <p className="text-white font-semibold text-base leading-snug">Operating businesses</p>
              <p className="text-gray-400 text-sm mt-1">
                Active firms with an existing developer client roster — not pre-revenue startups
              </p>
            </div>
          </div>

          {/* ICP VERTICALS */}
          <div
            className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-6 py-4 mb-6"
            {...markerProps('icp_verticals', CARD.icp_verticals)}
          >
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Verticals</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong className="text-white">Proptech consultancies</strong>,{' '}
              <strong className="text-white">real-estate franchise networks</strong>, and{' '}
              <strong className="text-white">buyers&apos;-agent industry bodies</strong> —
              organisations that evaluate or broker property development opportunities at scale.
            </p>
          </div>

          {/* EXCLUSIONS — already evidenced; kept */}
          <div
            className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-6 py-4 flex items-start gap-3"
            {...markerProps('exclusions', CARD.exclusions)}
          >
            <span className="text-amber-400 font-bold text-sm mt-0.5">Not for:</span>
            <p className="text-gray-400 text-sm leading-relaxed">
              Solo affiliates with no developer client base; generic software resellers with
              no property-sector vertical. DealFindrs is a specialist channel partner programme
              — open only to buyers&apos; agent firms and property development advisories that
              actively serve a developer client roster.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/partners"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-[#4ade80] transition-all"
            >
              See the Partner Programme <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── WHO USES IT: THE PROPERTY DEVELOPER / PROMOTER ── */}
      <div className="py-24 border-t border-slate-700/30" id="for-clients">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* END USER section */}
            <div
              {...markerProps('end_user', CARD.end_user)}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
                <ClipboardList className="w-4 h-4" />
                For the property developer running deals
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Know in 3 minutes whether a deal deserves deeper work
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                The{' '}
                <strong className="text-gray-200">
                  property developer, development promoter, or investment analyst
                </strong>{' '}
                who sources, qualifies, and progresses opportunities uses
                DealFindrs as their daily assessment engine — from first-look RAG through
                to the Finance Pack their broker takes to the lender.
              </p>

              {/* END USER OUTCOMES */}
              <div
                className="space-y-3"
                {...markerProps('end_user_outcomes', CARD.end_user_outcomes)}
              >
                {[
                  { label: 'Consistent deal evaluation criteria — remembered forever, applied to every deal.', icon: Target },
                  { label: 'Instant RAG ratings in seconds — know which deals deserve deeper work.', icon: Zap },
                  { label: 'Auto-generated Finance Packs — arrive at the lender meeting ready.', icon: FileText },
                  { label: 'Faster, smarter investment decisions within 90 days of onboarding.', icon: BarChart3 },
                  { label: 'Voice-guided input — nothing missed on a site visit.', icon: Mic },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[#22c55e]" />
                    </div>
                    <p className="text-gray-300 leading-relaxed pt-2">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CORE MECHANISM: the actual functional pipeline — marker goes HERE, not on a tagline */}
            <div
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8"
              {...markerProps('core_mechanism', CARD.core_mechanism)}
            >
              <h3 className="text-lg font-bold text-white mb-1">The assessment pipeline</h3>
              <p className="text-gray-400 text-sm mb-2">
                AI analyses your criteria (minimum GM%, de-risk factors, deal-breakers) and
                provides instant RAG ratings — with detailed explanations and action items.
                Every report feeds the next one — no re-keying numbers.
              </p>
              <ol className="space-y-4 mt-4">
                {[
                  { step: '1', name: 'RAG Assessment', desc: 'Green / Amber / Red in seconds — vs your criteria' },
                  { step: '2', name: 'QS Report', desc: 'Construction cost baseline' },
                  { step: '3', name: 'Valuation Report', desc: 'GRV and PRSV from QS numbers' },
                  { step: '4', name: 'Feasibility Study', desc: 'IRR, ROC, peak debt' },
                  { step: '5', name: 'Finance Pack', desc: 'Lender-ready bundle — one export' },
                ].map((item) => (
                  <li key={item.step} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e] font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.name}</p>
                      <p className="text-gray-400 text-xs">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <Link
                  href="/reports"
                  className="inline-flex items-center gap-2 text-[#22c55e] text-sm font-medium hover:text-[#4ade80] transition-colors"
                >
                  See every report in detail <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-800/50 py-24 border-t border-slate-700/30" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Evaluate Deals</h2>
            <p className="text-gray-400 text-lg">The full assessment stack — from first look to Finance Pack</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Set Your Criteria', desc: 'Define your minimum GM%, de-risk factors, and deal-breakers once. AI remembers forever.' },
              { icon: Mic, title: 'Voice-Guided Input', desc: 'Our AI assistant helps you think deeper about each opportunity as you enter details.' },
              { icon: Zap, title: 'Instant RAG Assessment', desc: 'Get Green/Amber/Red ratings in seconds with detailed explanations and action items.' },
              { icon: BarChart3, title: 'Priority Rankings', desc: 'See all your opportunities ranked by potential, not just chronologically.' },
              { icon: FileText, title: 'Auto-Generate Finance Packs', desc: 'One click creates the QS, Valuation, Feasibility, and lender-ready Finance Pack from the same record.' },
              { icon: Users, title: 'White-Label for Partners', desc: "Buyers' agent firms get a branded workspace per client. Their brand, their criteria, their relationships." },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-700/50 border border-slate-600 rounded-2xl p-6 hover:border-[#22c55e]/50 transition-colors">
                <feature.icon className="w-10 h-10 text-[#22c55e] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 border-t border-slate-700/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">From signup to assessment in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Create your firm account and set your deal criteria' },
              { step: '2', title: 'Set Criteria', desc: 'Define your minimum GM% and deal-breakers' },
              { step: '3', title: 'Add Deals', desc: 'Enter opportunity details with voice assist' },
              { step: '4', title: 'Get Results', desc: 'Instant RAG rating with Finance Pack output' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#22c55e] rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-900">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-slate-800/30 border-t border-slate-700/30" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you&apos;re ready</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Free Trial',
                price: '$0',
                period: '14 days',
                features: ['5 opportunities', '1 user', 'Basic assessment', 'Email support'],
                cta: 'Start Free',
                highlight: false
              },
              {
                name: 'Standard',
                price: '$99',
                period: '/month',
                features: ['50 opportunities/mo', '5 users', 'Voice assistant', 'Finance Pack generation', 'Priority support'],
                cta: 'Get Started',
                highlight: true
              },
              {
                name: 'Premium',
                price: '$299',
                period: '/month',
                features: ['Unlimited opportunities', 'Unlimited users', 'Custom criteria', 'API access', 'White-label for partners', 'Dedicated support'],
                cta: 'Contact Sales',
                highlight: false
              },
            ].map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 ${plan.highlight ? 'bg-[#22c55e] text-white scale-105' : 'bg-slate-800 border border-slate-700 text-white'}`}>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlight ? 'text-slate-700' : 'text-gray-400'}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className={plan.highlight ? '' : 'text-gray-300'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                    plan.highlight
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-[#22c55e] text-white hover:bg-[#4ade80]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Partner pricing callout */}
          <div className="mt-12 bg-slate-900/50 border border-[#22c55e]/30 rounded-2xl p-8 text-center">
            <Users className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Partner / Reseller Pricing</h3>
            <p className="text-gray-400 mb-4 max-w-xl mx-auto">
              Buyers&apos; agent firms and property advisories that deploy DealFindrs to their client
              roster get volume-based partner pricing, white-label workspaces, and a reseller margin
              on every client seat.
            </p>
            <Link
              href="/partners"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-[#4ade80] transition-all"
            >
              See Partner Programme <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-[#22c55e]/10 to-[#4ade80]/10 border-t border-[#22c55e]/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Better Deals?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Join property developers and buyers&apos; agent firms running smarter, faster deal assessments.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-block px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 px-6 py-4 border border-slate-600 text-white rounded-xl font-semibold hover:border-[#22c55e]/50 transition-all"
            >
              See the reports <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/partners', label: 'Partner Programme' },
          { href: '/reports', label: 'Reports' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
