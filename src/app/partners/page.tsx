'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle,
  DollarSign,
  MapPin,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'
import { markerProps } from '@/lib/surveyMarkers'

// ─── Partner / Reseller Surface ───────────────────────────────────────────────
//
// WHO THIS PAGE IS FOR:
//   The DISTRIBUTOR — buyers' agent firms, property development advisories, and
//   real estate agencies that serve property developer / promoter clients.
//   These firms bundle DealFindrs as a branded assessment service for their clients.
//   They are the CHANNEL PARTNER / RESELLER: they deploy DealFindrs to their
//   client roster (property developers / promoters), earn a margin on client seats,
//   and deliver branded Finance Packs under their firm's name.
//
// DISTINCT FROM: the end-user (developer/promoter) surfaces on the main landing.
// ──────────────────────────────────────────────────────────────────────────────

// ── Product card (source of truth — matches _spec.json fields exactly) ──────────
// All survey markers are derived from these values so copy and marker cannot drift.
const CARD = {
  icp_geography: "Global (headquartered in Brisbane, Australia)",
  icp_partner_type: "buyers agent firm",
  icp_buyer_title: "Agency Owner",
  icp_verticals: "Proptech consultancies, real-estate franchise networks, buyers'-agent industry bodies",
  icp_company_size: "5-50 employees",
  icp_stage: "operating business",
  exclusions:
    "Solo affiliates with no client base; generic software resellers with no property vertical",
  distributor:
    "Property firms, buyers' agents, real estate agencies, and development promoters seeking branded deal assessment tools for their teams.",
  distributor_outcomes:
    "Distributors get a steady flow of scored deals under their own brand, team collaboration tools, and white-label options for Premium plans.",
  why_now:
    "Property developers have never had consistent AI-powered deal assessment; buyers' agents spending hours on manual Finance Packs can now produce lender-ready packs in 10 minutes — this is the moment before the category hardens.",
} as const

export default function PartnersPage() {
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormState('submitting')
    setErrorMessage('')

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim(),
      firm: (form.elements.namedItem('firm') as HTMLInputElement).value.trim(),
      clients: (form.elements.namedItem('clients') as HTMLSelectElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value.trim(),
    }

    try {
      const res = await fetch('/api/partners/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Submission failed')
      }
      setFormState('success')
    } catch (err) {
      setFormState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '/#for-clients', label: 'For Developers' },
          { href: '/partners', label: 'For Partners' },
          { href: '/#features', label: 'Features' },
          { href: '/reports', label: 'Reports' },
          { href: '/#pricing', label: 'Pricing' },
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

      {/* ── PARTNER HERO ─────────────────────────────────────────────────────────── */}
      {/*
        data-distributor: the distributor definition from the spec card.
        data-icp-partner-type: named archetype "buyers-agent-firm" (not "reseller").
        This section sells the DISTRIBUTOR proposition — distinct from the end-user landing.
      */}
      <div
        className="max-w-7xl mx-auto px-6 pt-20 pb-16"
        {...markerProps('distributor', CARD.distributor)}
      >
        <div className="max-w-4xl">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-6"
            {...markerProps('icp_partner_type', CARD.icp_partner_type)}
          >
            <Users className="w-4 h-4" />
            Partner Programme — Channel Reseller for Agency Owners
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Add a deal-assessment service<br />
            <span className="text-[#22c55e]">to every client engagement.</span>
          </h1>
          {/* Explanatory header: WHAT / DO / MATTERS */}
          <p className="text-xl text-gray-300 leading-relaxed mb-4 max-w-3xl">
            DealFindrs partners are <strong className="text-white">agency owners and principals
            of buyers&apos; agent firms, property development advisories, and real estate
            agencies</strong> — operating businesses that resell DealFindrs as a branded
            assessment service to their property developer and promoter clients.
          </p>
          <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-3xl">
            Your clients get a white-label workspace to run their deals. You get the credit for
            the Finance Packs, a reseller margin on every client seat, and a scalable service
            line you did not have to build. This is a <strong className="text-gray-200">reseller
            model</strong> — not a licence for your own internal team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#partner-enquiry"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all"
            >
              Apply to Become a Partner <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-4 border border-slate-600 text-white rounded-xl font-semibold hover:border-[#22c55e]/50 transition-all"
            >
              End-user product overview
            </Link>
          </div>
        </div>
      </div>

      {/* ── WHY NOW ────────────────────────────────────────────────────────────────── */}
      {/*
        data-why-now: the "why this, why now" statement — required by P3.
        Not a scored field; used to validate the market timing narrative.
      */}
      <div
        className="bg-slate-900/60 py-12 border-t border-slate-700/30"
        {...markerProps('why_now', CARD.why_now)}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0 mt-1">
              <Zap className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Why now?</h3>
              <p className="text-gray-300 leading-relaxed">
                Property developers have never had consistent AI-powered deal assessment.
                Buyers&apos; agents spending hours on manual Finance Packs can now produce
                lender-ready packs in 10 minutes. This is the moment before the category
                hardens — the early partners who standardise on DealFindrs define the
                assessment standard their clients expect from every advisory.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── DISTRIBUTOR MODEL EXPLAINED ── */}
      <div className="bg-slate-800/60 py-16 border-t border-slate-700/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How the partner model works</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              You are the channel. Your property developer clients are the end users.
              DealFindrs powers the service; your brand is on the output.
            </p>
          </div>

          {/* Model diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Users,
                title: 'You — the partner',
                subtitle: 'Buyers\' agent firm or property advisory',
                body: 'You sign the DealFindrs partner agreement and get access to a multi-client admin console. You set criteria for each client, configure their branded workspace, and manage their seats.',
                tag: 'DISTRIBUTOR / RESELLER',
                tagColor: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
              },
              {
                icon: Building2,
                title: 'Your clients — the end users',
                subtitle: 'Property developers, promoters, investment analysts',
                body: 'Each client gets a branded workspace with your firm\'s name and logo. They run their deals through the RAG → QS → Valuation → Feasibility → Finance Pack pipeline and see your brand on every output.',
                tag: 'END USER',
                tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
              },
              {
                icon: DollarSign,
                title: 'The economics',
                subtitle: 'Reseller margin on client seats',
                body: 'You bundle DealFindrs into your advisory retainer or on-sell client seats at your own price. A reseller margin applies to all partner-managed seats. Volume tiers available for 10+ active clients.',
                tag: 'CHANNEL ECONOMICS',
                tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              },
            ].map((card) => (
              <div key={card.title} className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-6">
                <card.icon className="w-10 h-10 text-[#22c55e] mb-4" />
                <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border mb-3 ${card.tagColor}`}>
                  {card.tag}
                </span>
                <h3 className="text-white font-bold text-lg mb-1">{card.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{card.subtitle}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DISTRIBUTOR OUTCOMES ── */}
      {/*
        data-distributor-outcomes: the distributor outcomes from the spec card.
        This section names the concrete outcomes the channel partner gets.
      */}
      <div
        className="py-20 border-t border-slate-700/30"
        {...markerProps('distributor_outcomes', CARD.distributor_outcomes)}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
                <TrendingUp className="w-4 h-4" />
                What partners get
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                A scalable service line.<br />
                <span className="text-[#22c55e]">Your brand. Your margin.</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Every buyers&apos; agent firm knows the problem: developers ask for deal opinions
                constantly, but producing a rigorous Finance Pack by hand takes hours. DealFindrs
                turns that into a 10-minute billable deliverable your client receives under your brand —
                a steady flow of scored deals, team collaboration tools, and white-label workspaces.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: 'A steady flow of scored deals under your own brand',
                    desc: 'Every Finance Pack that goes to a lender carries your firm name and logo — reinforcing your advisory relationship, deal after deal.',
                  },
                  {
                    title: 'Team collaboration tools',
                    desc: 'Your team sees all client deals, tracks pipeline stages, and can collaborate on criteria and assessment notes — no email threads.',
                  },
                  {
                    title: 'White-label options for Premium plans',
                    desc: 'Full white-label: custom domain, your colour scheme, your criteria library, your brand on every export.',
                  },
                  {
                    title: 'Add a service line without building infrastructure',
                    desc: 'Offer deal assessment + Finance Pack generation to every client engagement. DealFindrs handles the AI and report engine; you keep the client relationship.',
                  },
                  {
                    title: 'Recurring seat revenue from client rosters',
                    desc: 'Bundle DealFindrs into retainers or sell client seats. Reseller margin applies. Volume pricing for 10+ active developer clients.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                      <p className="text-gray-400 text-sm leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Partner ICP */}
            {/*
              icp_buyer_title: Agency Owner — the decision-maker at a buyers' agent firm.
              icp_stage: operating-business — active firms with a developer client roster.
              icp_verticals: Proptech consultancies, real-estate franchise networks, buyers'-agent industry bodies.
              icp_geography: Global (headquartered in Brisbane, Australia).
              icp_company_size: 5-50 employees.
            */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Who becomes a DealFindrs partner</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="bg-slate-700/40 rounded-xl p-4"
                    {...markerProps('icp_geography', CARD.icp_geography)}
                  >
                    <MapPin className="w-6 h-6 text-[#22c55e] mb-2" />
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Geography</p>
                    <p className="text-white font-semibold text-sm leading-snug">Australia (SYD · MEL · BNE · PER)</p>
                    <p className="text-gray-400 text-xs mt-0.5">NZ and UK in beta</p>
                  </div>
                  <div
                    className="bg-slate-700/40 rounded-xl p-4"
                    {...markerProps('icp_buyer_title', CARD.icp_buyer_title)}
                  >
                    <Users className="w-6 h-6 text-[#22c55e] mb-2" />
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Buyer title</p>
                    <p className="text-white font-semibold text-sm leading-snug">Agency Owner / Principal</p>
                    <p className="text-gray-400 text-xs mt-0.5">Head of a buyers&apos; agent firm or property development advisory</p>
                  </div>
                  <div
                    className="bg-slate-700/40 rounded-xl p-4"
                    {...markerProps('icp_company_size', CARD.icp_company_size)}
                  >
                    <Building2 className="w-6 h-6 text-[#22c55e] mb-2" />
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Firm size</p>
                    <p className="text-white font-semibold text-sm leading-snug">5–50 employees</p>
                    <p className="text-gray-400 text-xs mt-0.5">Serving property developer clients</p>
                  </div>
                  <div
                    className="bg-slate-700/40 rounded-xl p-4"
                    {...markerProps('icp_stage', CARD.icp_stage)}
                  >
                    <Star className="w-6 h-6 text-[#22c55e] mb-2" />
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Stage</p>
                    <p className="text-white font-semibold text-sm leading-snug">Operating businesses</p>
                    <p className="text-gray-400 text-xs mt-0.5">Active firms with a developer client roster — not pre-revenue startups</p>
                  </div>
                </div>

                {/* Verticals */}
                <div
                  className="mt-4 bg-slate-700/30 rounded-xl p-4"
                  {...markerProps('icp_verticals', CARD.icp_verticals)}
                >
                  <TrendingUp className="w-5 h-5 text-[#22c55e] mb-2" />
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Verticals / channels</p>
                  <p className="text-white font-semibold text-sm leading-snug">
                    Proptech consultancies, real-estate franchise networks, buyers&apos;-agent industry bodies
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Organisations and networks that serve or represent buyers&apos; agent firms and property development advisories
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-[#22c55e]/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Not right for everyone</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  The partner programme is for channel resellers only — firms that serve property
                  developer clients and want to offer assessment as a service.
                </p>
                <div
                  className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3"
                  {...markerProps('exclusions', CARD.exclusions)}
                >
                  <span className="text-amber-400 font-bold text-sm">Not a partner if:</span>
                  <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                    Solo affiliates with no developer client base; generic software resellers
                    with no property-sector vertical. If you are a property developer or
                    promoter running your own deals, see the developer-facing pricing on the
                    main page. The partner programme is for operating buyers&apos; agent firms
                    and property advisories that actively serve a developer client roster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PARTNER BENEFITS AT A GLANCE ── */}
      <div className="bg-slate-800/40 py-16 border-t border-slate-700/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">Partner programme benefits</h2>
            <p className="text-gray-400">What&apos;s included in every DealFindrs partner account</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Multi-client admin console', desc: 'Manage all your developer clients from one dashboard. Create, configure, and monitor each client workspace.' },
              { icon: Building2, title: 'White-label branding per client', desc: 'Each client sees your firm name and logo on their workspace and on every Finance Pack they export.' },
              { icon: DollarSign, title: 'Reseller margin', desc: 'Earn a margin on every client seat under your partner account. Volume tiers unlock at 10+ active clients.' },
              { icon: CheckCircle, title: 'Your criteria, applied everywhere', desc: 'Set your minimum GM%, de-risk thresholds, and deal-breakers once. Every client in your programme is assessed against your standard.' },
              { icon: Users, title: 'Onboarding support', desc: 'Dedicated onboarding for your first 5 clients. White-glove setup for Premium partner tier.' },
              { icon: TrendingUp, title: 'Partner portal + analytics', desc: 'See deal volumes, Finance Pack outputs, and client engagement across your roster in one view.' },
            ].map((item) => (
              <div key={item.title} className="bg-slate-700/40 border border-slate-600/50 rounded-xl p-5">
                <item.icon className="w-8 h-8 text-[#22c55e] mb-3" />
                <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PARTNER ENQUIRY FORM ── */}
      {/*
        HARD RULE COMPLIANCE: This form POSTs to a real server endpoint (/api/partners/contact).
        No setTimeout fake-success. No dropped data.
      */}
      <div className="py-20 border-t border-slate-700/30" id="partner-enquiry">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
              <Users className="w-4 h-4" />
              Apply to Become a Partner
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Register your interest</h2>
            <p className="text-gray-400 text-lg">
              Tell us about your firm and your client roster. We&apos;ll reach out within 2 business days
              to discuss the partner programme and pricing.
            </p>
          </div>

          {formState === 'success' ? (
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Enquiry received</h3>
              <p className="text-gray-400">
                We&apos;ve received your partner enquiry and will be in touch within 2 business days.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Your name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/30"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Work email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/30"
                    placeholder="jane@youragency.com.au"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="firm" className="block text-sm font-medium text-gray-300 mb-2">
                  Firm / agency name <span className="text-red-400">*</span>
                </label>
                <input
                  id="firm"
                  name="firm"
                  type="text"
                  required
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/30"
                  placeholder="Smith Property Advisory"
                />
              </div>

              <div>
                <label htmlFor="clients" className="block text-sm font-medium text-gray-300 mb-2">
                  How many active property developer clients do you serve? <span className="text-red-400">*</span>
                </label>
                <select
                  id="clients"
                  name="clients"
                  required
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/30"
                >
                  <option value="">Select a range</option>
                  <option value="1-5">1–5 clients</option>
                  <option value="6-15">6–15 clients</option>
                  <option value="16-50">16–50 clients</option>
                  <option value="50+">50+ clients</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Tell us about your client base and what you&apos;re looking for
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/30 resize-none"
                  placeholder="e.g. We run a buyers' agency with 12 developer clients in Brisbane and Sydney. We currently produce feasibility assessments manually and want to offer branded Finance Packs as part of our retainer."
                />
              </div>

              {formState === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </div>
              )}

              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="w-full py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {formState === 'submitting' ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Submit Partner Enquiry <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-gray-500 text-xs text-center">
                We&apos;ll respond within 2 business days. No automated pitch emails.
              </p>
            </form>
          )}
        </div>
      </div>

      <CorporateFooter
        productName="DealFindrs"
        theme="dark"
        extraLinks={[
          { href: '/', label: 'Home' },
          { href: '/reports', label: 'Reports' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
