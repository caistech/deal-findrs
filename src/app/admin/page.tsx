'use client'

import Link from 'next/link'
import { ArrowLeft, Mic, CreditCard, Users } from 'lucide-react'

const ADMIN_LINKS = [
  {
    href: '/admin/users',
    icon: Users,
    title: 'User Management',
    description: 'Create and manage user accounts',
    color: 'green',
  },
  {
    href: '/admin/elevenlabs',
    icon: Mic,
    title: 'ElevenLabs Voice Agents',
    description: 'Create and manage voice assistant agents',
    color: 'violet',
  },
  {
    href: '/admin/stripe',
    icon: CreditCard,
    title: 'Stripe Products',
    description: 'Set up subscription plans and pricing',
    color: 'blue',
  },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        <Link href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Setup</h1>
          <p className="text-gray-600">Configure third-party integrations and services</p>
        </div>

        <div className="grid gap-4">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  link.color === 'green' ? 'bg-green-100' :
                  link.color === 'violet' ? 'bg-violet-100' :
                  'bg-blue-100'
                }`}>
                  <link.icon className={`w-6 h-6 ${
                    link.color === 'green' ? 'text-green-600' :
                    link.color === 'violet' ? 'text-violet-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
                    {link.title}
                  </h2>
                  <p className="text-gray-600 mt-1">{link.description}</p>
                </div>
                <span className="text-gray-400 group-hover:text-gray-600">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Environment Variables Reference */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Required Environment Variables</h2>
          <div className="space-y-4 text-sm font-mono">
            <div>
              <p className="text-gray-500 mb-1"># Supabase</p>
              <p className="text-gray-700">NEXT_PUBLIC_SUPABASE_URL</p>
              <p className="text-gray-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
              <p className="text-gray-700">SUPABASE_SERVICE_ROLE_KEY</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1"># Anthropic (Claude)</p>
              <p className="text-gray-700">ANTHROPIC_API_KEY</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1"># ElevenLabs (all server-only — no NEXT_PUBLIC_ prefix)</p>
              <p className="text-gray-700">ELEVENLABS_API_KEY</p>
              <p className="text-gray-700">ELEVENLABS_WEBHOOK_SECRET</p>
              <p className="text-gray-700">ELEVENLABS_AGENT_SETUP</p>
              <p className="text-gray-700">ELEVENLABS_AGENT_BASICS</p>
              <p className="text-gray-400">... (see /admin/elevenlabs)</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1"># Stripe</p>
              <p className="text-gray-700">STRIPE_SECRET_KEY</p>
              <p className="text-gray-700">STRIPE_WEBHOOK_SECRET</p>
              <p className="text-gray-700">STRIPE_PRICE_STANDARD_MONTHLY</p>
              <p className="text-gray-400">... (see /admin/stripe)</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1"># App</p>
              <p className="text-gray-700">NEXT_PUBLIC_APP_URL=https://deal-findrs.vercel.app</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}