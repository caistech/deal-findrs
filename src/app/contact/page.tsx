'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle, Building2, Mail, Phone, MapPin } from 'lucide-react'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    companySize: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <CorporateHeader
          productName="DealFindrs"
          productAcronym="DF"
          theme="dark"
          LinkComponent={Link}
          navItems={[
            { href: '/#features', label: 'Features' },
            { href: '/#how-it-works', label: 'How It Works' },
            { href: '/#pricing', label: 'Pricing' },
          ]}
          rightContent={
            <div className="flex items-center gap-4">
              <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors">
                Team Login
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
        <div className="max-w-2xl mx-auto px-6 py-24">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-[#22c55e] mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Thank You!</h1>
            <p className="text-gray-400 text-lg mb-6">
              Your demo request has been received. Our team will be in touch within 24 hours.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#22c55e] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
        <CorporateFooter productName="DealFindrs" theme="dark" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: '/#features', label: 'Features' },
          { href: '/#how-it-works', label: 'How It Works' },
          { href: '/#pricing', label: 'Pricing' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors">
              Team Login
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

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <h1 className="text-3xl font-bold text-white mb-4">Get in Touch</h1>
            <p className="text-gray-400 mb-8">
              Ready to deliver professional deal assessments under your brand? Let&apos;s talk.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-[#22c55e] mt-1" />
                <div>
                  <p className="text-white font-medium">Headquarters</p>
                  <p className="text-gray-400 text-sm">Brisbane, Australia</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#22c55e] mt-1" />
                <div>
                  <p className="text-white font-medium">Email</p>
                  <p className="text-gray-400 text-sm">dennis@corporateaisolutions.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#22c55e] mt-1" />
                <div>
                  <p className="text-white font-medium">Phone</p>
                  <p className="text-gray-400 text-sm">+61 402 612 471</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#22c55e] mt-1" />
                <div>
                  <p className="text-white font-medium">Target Market</p>
                  <p className="text-gray-400 text-sm">Property firms globally (headquartered in Brisbane)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              {error && (
                <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Size</label>
                <select
                  required
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="200+">200+ employees</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your firm and how you'd like to use DealFindrs..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Request a Demo'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <CorporateFooter productName="DealFindrs" theme="dark" />
    </div>
  )
}
