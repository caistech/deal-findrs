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
          { href: '#pricing', label: 'Pricing' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors">
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
            >
              Start Free Trial
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
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Stop Guessing.<br/>
              <span className="text-[#22c55e]">
                Start Knowing.
              </span>
            </h1>
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
            <p className="text-gray-400 text-lg">Built by developers, for developers</p>
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
