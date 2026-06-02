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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '#for-firms', label: 'For Firms' },
          { href: '#for-promoters', label: 'For Promoters' },
          { href: '#features', label: 'Features' },
          { href: '/reports', label: 'Reports' },
          { href: '#pricing', label: 'Pricing' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors">
              Start as User
            </Link>
            <Link
              href="/admin/login"
              className="px-5 py-2.5 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
            >
              Admin Login
            </Link>
          </div>
        }
      />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Deal Assessment
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Stop Guessing.<br/>
              <span className="text-[#22c55e]">
                Start Knowing.
              </span>
            </h1>
            <p className="text-sm text-slate-400 mb-6 border-l-2 border-[#22c55e]/40 pl-3">
              For buyers&apos; agents &amp; property firms: a steady flow of scored deals, under your brand.
            </p>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              The AI-powered platform that gives property development promoters instant 
              Green/Amber/Red assessments on every opportunity. Set your criteria once, 
              evaluate deals consistently forever.
            </p>
            <div className="flex gap-4">
              <Link
                href="/signup"
                className="px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all flex items-center gap-2"
              >
                Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
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
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-800">Trinidad Roberts</span>
                  <span className="ml-auto text-red-600 font-bold">12.4%</span>
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

      {/* ── WHO IT'S FOR: DISTRIBUTORS ── */}
      <div className="bg-slate-800/60 py-24 border-t border-slate-700/40" id="for-firms">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
              <Building2 className="w-4 h-4" />
              For buyers&apos; agents &amp; property firms
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              The deal-assessment tool your firm deploys to its team
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl leading-relaxed">
              DealFindrs is licenced by{' '}
              <strong className="text-gray-200">
                principals and directors at buyers&apos; agent practices and property development firms
              </strong>{' '}
              — teams of 2–15 people running 10–50 active development opportunities per year
              across Australian metro markets (Sydney, Melbourne, Brisbane, Perth; New Zealand
              and UK in beta). The firm sets the criteria; their promoters and analysts run
              every deal through the same scoring model, producing Finance Packs that land
              under the firm&apos;s brand.
            </p>
          </div>

          {/* ICP Detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: MapPin,
                label: 'Geography',
                value: 'Australia (SYD · MEL · BNE · PER)',
                sub: 'NZ and UK in beta',
              },
              {
                icon: Users,
                label: 'Buyer title',
                value: 'Principal / Director',
                sub: 'Buyers\' agent practice or development firm',
              },
              {
                icon: Building2,
                label: 'Company size',
                value: '2–15 people',
                sub: '10–50 active opportunities/year',
              },
              {
                icon: TrendingUp,
                label: 'Stage',
                value: 'Past the first deal',
                sub: 'Actively building a deal pipeline',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-5"
              >
                <item.icon className="w-8 h-8 text-[#22c55e] mb-3" />
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{item.label}</p>
                <p className="text-white font-semibold text-base leading-snug">{item.value}</p>
                <p className="text-gray-400 text-sm mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Distributor outcomes */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-2">
              What the firm gets
            </h3>
            <p className="text-gray-400 mb-6">
              Outcomes for the principal who licences DealFindrs for their team:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Deal flow assessed consistently against the firm\'s criteria — not each promoter\'s gut.',
                'Every deal the firm touches produces a Finance Pack the lender can act on.',
                'Branded reports delivered to clients under the firm\'s name.',
                'Audit trail: who assessed what, when, and why it rated Green.',
              ].map((outcome) => (
                <li key={outcome} className="flex items-start gap-3">
                  <BadgeCheck className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm leading-relaxed">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Exclusions */}
          <div className="mt-6 bg-slate-800/40 border border-slate-700/50 rounded-xl px-6 py-4 flex items-start gap-3">
            <span className="text-amber-400 font-bold text-sm mt-0.5">Not for:</span>
            <p className="text-gray-400 text-sm leading-relaxed">
              Solo residential buyers, institutional fund managers running 200+ deals through
              a dedicated PM system, or investors who assess fewer than five deals per year.
            </p>
          </div>
        </div>
      </div>

      {/* ── WHO IT'S FOR: END USERS ── */}
      <div className="py-24 border-t border-slate-700/30" id="for-promoters">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-4">
                <ClipboardList className="w-4 h-4" />
                For the promoter running deals
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Know in 3 minutes whether a deal deserves deeper work
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                The{' '}
                <strong className="text-gray-200">
                  development promoter or investment analyst
                </strong>{' '}
                who sources, qualifies, and progresses opportunities inside the firm uses
                DealFindrs as their daily assessment engine — from first-look RAG through
                to the Finance Pack their broker takes to the lender.
              </p>

              <div className="space-y-4">
                {[
                  {
                    label: 'Know inside 3 minutes whether a deal deserves deeper work.',
                    icon: Zap,
                  },
                  {
                    label: 'Arrive at the lender meeting with a Finance Pack, not a spreadsheet.',
                    icon: FileText,
                  },
                  {
                    label: 'Stop rebuilding the feasibility model from scratch on every deal.',
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

            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-1">The assessment pipeline</h3>
              <p className="text-gray-400 text-sm mb-6">
                Every report the promoter generates feeds the next one — no re-keying numbers.
              </p>
              <ol className="space-y-4">
                {[
                  { step: '1', name: 'RAG Assessment', desc: 'Green / Amber / Red in seconds' },
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
              { icon: Users, title: 'Team Workflow', desc: 'Promoters submit; principals review. Every assessment carries an audit trail.' },
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
                features: ['Unlimited opportunities', 'Unlimited users', 'Custom criteria', 'API access', 'White-label options', 'Dedicated support'], 
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
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-[#22c55e]/10 to-[#4ade80]/10 border-t border-[#22c55e]/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Better Deals?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Join buyers&apos; agent practices and property development firms running smarter, faster deal assessments.
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
          { href: '/reports', label: 'Reports' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ]}
      />
    </div>
  )
}
