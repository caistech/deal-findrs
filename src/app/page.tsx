'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Mic, Target, BarChart3, FileText, Users, Zap } from 'lucide-react'
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
              For property firms, buyers&apos; agents &amp; real estate agencies — white-label deal assessment for your developer clients.
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
            <p className="text-gray-500 text-sm mt-4">No credit card required • Cancel anytime</p>
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
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
              🟢 GREEN
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-800/50 py-24" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Evaluate Deals</h2>
            <p className="text-gray-400 text-lg">Built for property professionals who serve developers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Set Your Criteria', desc: 'Define your minimum GM%, de-risk factors, and deal-breakers once. AI remembers forever.' },
              { icon: Mic, title: 'Voice-Guided Input', desc: 'Our AI assistant helps you think deeper about each opportunity as you enter details.' },
              { icon: Zap, title: 'Instant RAG Assessment', desc: 'Get Green/Amber/Red ratings in seconds with detailed explanations and action items.' },
              { icon: BarChart3, title: 'Priority Rankings', desc: 'See all your opportunities ranked by potential, not just chronologically.' },
              { icon: FileText, title: 'Auto-Generate IMs', desc: 'One click to create professional Investment Memorandums for green-lit projects.' },
              { icon: Users, title: 'Team Collaboration', desc: 'DealFindrs submit opportunities, Promoters review and approve.' },
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

      {/* Target Market Section - ICP Evidence */}
      <div className="py-24 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Who DealFindrs Is For</h2>
            <p className="text-gray-400 text-lg">Built for Australian property professionals</p>
          </div>
          
          {/* ICP: Geography */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Geographic Focus</h3>
            <p className="text-gray-400">DealFindrs is purpose-built for the Australian property development market — Australian cities, Australian lending criteria, Australian council requirements, and Australian tax depreciation schedules.</p>
          </div>

          {/* ICP: Buyer Title */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Target Roles</h3>
            <ul className="text-gray-400 space-y-2">
              <li>• Property Investment Managers evaluating development opportunities</li>
              <li>• Buyers' Agents assessing deals for their client portfolios</li>
              <li>• Development Promoters screening projects before commitment</li>
              <li>• Real Estate Agency Principals offering deal assessment as a service</li>
            </ul>
          </div>

          {/* ICP: Company Size */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Firm Size</h3>
            <p className="text-gray-400">From boutique agencies (1-5 staff) to established property firms (20+). DealFindrs scales with your team — Solo operators use it directly; agencies white-label it for their clients.</p>
          </div>

          {/* ICP: Stage */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Deal Stage</h3>
            <p className="text-gray-400">Evaluates opportunities at any stage — from initial site identification and due diligence through to DA approval, tender, and acquisition. Most valuable at the early "go/no-go" decision point before expensive consultants are engaged.</p>
          </div>

          {/* Exclusions */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Who It&apos;s Not For</h3>
            <ul className="text-gray-400 space-y-2">
              <li>• Institutional investors with in-house QS and valuation teams</li>
              <li>• Residential property flippers (not development-focused)</li>
              <li>• Overseas developers without Australian project experience</li>
              <li>• Commercial-only developers (residential focus)</li>
            </ul>
          </div>

          {/* Distributor */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">Distributor Model</h3>
            <p className="text-gray-400">Property firms, buyers&apos; agents, and real estate agencies use DealFindrs as a white-label tool to serve their developer clients. Your brand on the interface, your criteria applied to every deal, your clients receiving professional assessments under your name.</p>
          </div>

          {/* Distributor Outcomes */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">What Distributors Get</h3>
            <ul className="text-gray-400 space-y-2">
              <li>• White-label interface with your branding</li>
              <li>• Steady flow of consistently-scored deal opportunities</li>
              <li>• Client retention through valuable advisory services</li>
              <li>• Differentiated offering beyond traditional agency services</li>
            </ul>
          </div>

          {/* End User */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-white mb-4">End Users</h3>
            <p className="text-gray-400">Property developers, investment analysts, and development promoters who evaluate deal opportunities. They receive professional, criteria-based assessments that help them make faster, more consistent go/no-go decisions.</p>
          </div>

          {/* End User Outcomes */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">What End Users Achieve</h3>
            <ul className="text-gray-400 space-y-2">
              <li>• Consistent scoring regardless of deal source</li>
              <li>• Saved time on initial deal screening</li>
              <li>• Better-informed investment decisions</li>
              <li>• Faster deal flow with automated assessments</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">From signup to assessment in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Create your account and company profile' },
              { step: '2', title: 'Set Criteria', desc: 'Define your GREEN light requirements' },
              { step: '3', title: 'Add Deals', desc: 'Enter opportunity details with voice assist' },
              { step: '4', title: 'Get Results', desc: 'Instant RAG rating with action items' },
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
      <div className="py-24 bg-slate-800/30" id="pricing">
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
                features: ['50 opportunities/mo', '5 users', 'Voice assistant', 'IM generation', 'Priority support'], 
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
          <p className="text-gray-400 text-lg mb-8">Join property developers who are making smarter, faster decisions.</p>
          <Link 
            href="/signup"
            className="inline-block px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all"
          >
            Start Your Free Trial Today
          </Link>
        </div>
      </div>

      <CorporateFooter productName="DealFindrs" theme="dark" />
    </div>
  )
}
