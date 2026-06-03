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

// ── Product card (source of truth — matches _spec.json fields exactly) ──────────
// All survey markers are derived from these values so copy and marker cannot drift.
const CARD = {
  promise:
    "DealFindrs delivers instant Green/Amber/Red AI-powered assessments on property development opportunities, eliminating guesswork with consistent, criteria-based scoring.",
  friction:
    "Property developers and buyers' agents struggle to evaluate deal opportunities consistently and risk missing profitable deals or taking bad ones.",
  core_mechanism:
    "AI analyzes user-defined criteria (minimum GM%, de-risk factors, deal-breakers) and provides instant RAG ratings with detailed explanations and action items.",
  icp_geography: "Global (headquartered in Brisbane, Australia)",
  icp_partner_type: "buyers agent firm",
  icp_buyer_title: "Agency Owner",
  icp_company_size: "5-50 employees",
  icp_stage: "operating business",
  exclusions:
    "Solo affiliates with no client base; generic software resellers with no property vertical",
  end_user:
    "Property developers, investment analysts, buyers' agents, and development promoters who evaluate deal opportunities.",
  end_user_outcomes:
    "Consistent deal evaluation criteria remembered forever, instant RAG ratings in seconds, auto-generated professional Investment Memorandums, and faster, smarter investment decisions within 90 days.",
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

      {/* ── HERO — Promise marker ────────────────────────────────────────────────── */}
      {/*
        data-promise: the core product promise from the spec card.
        Planted here because this is the section that communicates the promise to visitors.
      */}
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
              Stop Guessing.<br/>
              <span className="text-[#22c55e]">
                Start Knowing.
              </span>
            </h1>
            {/*
              PROSPECT TYPE: The prospect (the person who buys and deploys DealFindrs) is an
              Agency Owner / Principal of a buyers' agent firm, property development advisory,
              or real estate agency — an OPERATING BUSINESS that resells this as a service to
              its developer client roster.
              icp_partner_type = "buyers agent firm" (named archetype, not "reseller").
            */}
            <p
              className="text-sm text-slate-400 mb-6 border-l-2 border-[#22c55e]/40 pl-3"
              {...markerProps('icp_partner_type', CARD.icp_partner_type)}
            >
              For <strong className="text-slate-300">buyers&apos; agent firms and property development advisories</strong> —
              operating businesses that deploy DealFindrs as a branded assessment service to their
              property developer client roster.
            </p>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              Your property developer clients get instant Green/Amber/Red assessments
              on every opportunity — under your brand, against your criteria, producing
              Finance Packs they take to the lender.
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

      {/* ── FRICTION — The problem buyers' agents and developers face ────────────── */}
      {/*
        data-friction: the pain/problem from the spec card.
        This section names the exact friction the product resolves.
      */}
      <div
        className="bg-slate-900/70 py-16 border-t border-slate-700/50"
        {...markerProps('friction', CARD.friction)}
      >
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            The problem every buyers&apos; agent knows
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Property developers and buyers&apos; agents struggle to evaluate deal opportunities consistently —
            applying different criteria deal to deal, missing the red flags, or passing on viable opportunities
            because the assessment took too long. The result: missed profitable deals or bad ones that
            consume months of work before the problem surfaces.
          </p>
          <p className="text-gray-500 text-sm mt-4 max-w-2xl mx-auto">
            DealFindrs replaces the inconsistent, manual assessment process with a single AI-powered pipeline
            that applies your exact criteria — the same way, every time, in seconds.
          </p>
        </div>
      </div>

      {/* ── WHO DISTRIBUTES IT: BUYERS' AGENTS & PROPERTY FIRMS ── */}
      {/*
        DISTRIBUTOR SECTION — This section addresses the CHANNEL PARTNER (reseller):
        buyers' agent firms, property development advisories, and real estate agencies
        that deploy DealFindrs as a branded assessment service for their property
        developer / promoter clients. The firm is the distributor; their clients are
        the end users. This is a RESELLER model — the firm bundles DealFindrs into
        its advisory offering and its clients receive the branded tool.
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

          {/* ICP Detail — distributor / channel partner profile */}
          {/*
            icp_buyer_title marker: Agency Owner — the decision-maker at a buyers' agent firm.
            icp_stage marker: operating-business — active firms with a developer client roster.
            icp_geography marker: Global (headquartered in Brisbane, Australia).
            icp_company_size marker: 5-50 employees.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_geography', CARD.icp_geography)}
            >
              <MapPin className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Geography</p>
              <p className="text-white font-semibold text-base leading-snug">Australia (SYD · MEL · BNE · PER)</p>
              <p className="text-gray-400 text-sm mt-1">NZ and UK in beta</p>
            </div>
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_buyer_title', CARD.icp_buyer_title)}
            >
              <Users className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Buyer title</p>
              <p className="text-white font-semibold text-base leading-snug">Agency Owner / Principal</p>
              <p className="text-gray-400 text-sm mt-1">Head of a buyers&apos; agent firm or property development advisory</p>
            </div>
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_company_size', CARD.icp_company_size)}
            >
              <Building2 className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Firm size</p>
              <p className="text-white font-semibold text-base leading-snug">5–50 employees</p>
              <p className="text-gray-400 text-sm mt-1">Serving 10–50 active developer clients/year</p>
            </div>
            <div
              className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              {...markerProps('icp_stage', CARD.icp_stage)}
            >
              <TrendingUp className="w-8 h-8 text-[#22c55e] mb-3" />
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Stage</p>
              <p className="text-white font-semibold text-base leading-snug">Operating businesses</p>
              <p className="text-gray-400 text-sm mt-1">Active firms with an existing developer client roster — not pre-revenue startups</p>
            </div>
          </div>

          {/* Distributor / channel-partner outcomes */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-2">
              What the firm gets as a channel partner
            </h3>
            <p className="text-gray-400 mb-6">
              Outcomes for the buyers&apos; agent firm or property advisory that resells
              DealFindrs as part of its client service offering:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Add a deal-assessment service to every client engagement — without building it yourself.',
                'Your developer clients get branded, lender-ready Finance Packs. You get the credit.',
                'A white-label workspace per client — your brand, your criteria, your relationship protected.',
                'Recurring revenue from client seats included in your advisory retainer.',
              ].map((outcome) => (
                <li key={outcome} className="flex items-start gap-3">
                  <BadgeCheck className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm leading-relaxed">{outcome}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link
                href="/partners"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-[#4ade80] transition-all"
              >
                See the Partner Programme <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Exclusions — distributor-level exclusions matching spec */}
          <div
            className="mt-6 bg-slate-800/40 border border-slate-700/50 rounded-xl px-6 py-4 flex items-start gap-3"
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
        </div>
      </div>

      {/* ── WHO USES IT: THE PROPERTY DEVELOPER / PROMOTER (END USER) ── */}
      {/*
        data-end-user: the end user from the spec card.
        data-end-user-outcomes: the end-user outcomes from the spec card.
        data-core-mechanism: planted on the FUNCTIONAL pipeline section (the mechanism SHIPS here).
      */}
      <div
        className="py-24 border-t border-slate-700/30"
        id="for-clients"
        {...markerProps('end_user', CARD.end_user)}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div
              {...markerProps('end_user_outcomes', CARD.end_user_outcomes)}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
                <ClipboardList className="w-4 h-4" />
                For the property developer running deals
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Know in 3 minutes whether a deal deserves deeper work
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                The{' '}
                <strong className="text-gray-200">
                  property developer, development promoter, or investment analyst
                </strong>{' '}
                who sources, qualifies, and progresses opportunities uses
                DealFindrs as their daily assessment engine — from first-look RAG through
                to the Finance Pack their broker takes to the lender.
              </p>

              <div className="space-y-4">
                {[
                  {
                    label: 'Consistent criteria remembered forever — stop rebuilding the evaluation model deal to deal.',
                    icon: Target,
                  },
                  {
                    label: 'Instant RAG ratings in seconds — know in 3 minutes whether a deal deserves deeper work.',
                    icon: Zap,
                  },
                  {
                    label: 'Auto-generated Finance Pack — lender-ready bundle, not a spreadsheet.',
                    icon: FileText,
                  },
                  {
                    label: 'Faster, smarter decisions within 90 days — the assessment pipeline compounds.',
                    icon: BarChart3,
                  },
                  {
                    label: 'Voice-guided input — nothing missed on a site visit.',
                    icon: Mic,
                  },
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

            {/*
              CORE MECHANISM MARKER — planted on the live working assessment pipeline section.
              This proves the mechanism SHIPS (RAG → QS → Valuation → Feasibility → Finance Pack),
              not merely that it is described in copy.
            */}
            <div
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8"
              {...markerProps('core_mechanism', CARD.core_mechanism)}
            >
              <h3 className="text-lg font-bold text-white mb-1">The assessment pipeline</h3>
              <p className="text-gray-400 text-sm mb-6">
                Every report feeds the next one — no re-keying numbers.
              </p>
              <ol className="space-y-4">
                {[
                  { step: '1', name: 'RAG Assessment', desc: 'Green / Amber / Red in seconds — AI applies your minimum GM% and de-risk factors' },
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
              { icon: Users, title: 'White-Label for Partners', desc: 'Buyers\' agent firms get a branded workspace per client. Their brand, their criteria, their relationships.' },
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
            Join buyers&apos; agent firms and property developers running smarter, faster deal assessments.
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
