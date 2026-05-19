'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, Save, User, Building, Bell, Shield, CreditCard, Users, Key,
  Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/UserMenu'

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  mobile: string | null
  role: string | null
  company_id: string | null
  notification_preferences: { email?: boolean; sms?: boolean; push?: boolean } | null
}

type CompanyRow = {
  id: string
  name: string | null
  abn: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  subscription_status: string | null
  subscription_tier: string | null
  subscription_period_end: string | null
  stripe_customer_id: string | null
}

type TeamMember = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  is_active: boolean | null
}

function initialsFromProfile(
  p: { first_name: string | null; last_name: string | null; email: string | null } | null
): string {
  if (!p) return '?'
  const f = p.first_name?.[0] ?? ''
  const l = p.last_name?.[0] ?? ''
  if (f || l) return (f + l).toUpperCase()
  return p.email?.[0]?.toUpperCase() ?? '?'
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  // Loaded data
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Per-tab edit state — initialised from loaded data once it arrives
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', mobile: '' })
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', city: '', country: '', website: '', phone: '' })
  const [notifForm, setNotifForm] = useState({ email: true, sms: false, push: true })

  // Per-section save feedback
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [companySaving, setCompanySaving] = useState(false)
  const [companyMsg, setCompanyMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMsg, setNotifMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Change-password state (Security tab — wired in the earlier session)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  // Billing portal navigation
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setLoadError('You must be signed in to view settings.')
        if (!cancelled) setLoading(false)
        return
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, mobile, role, company_id, notification_preferences')
        .eq('id', user.id)
        .single()

      if (cancelled) return
      if (profileErr || !profileRow) {
        setLoadError(profileErr?.message || 'Could not load your profile.')
        setLoading(false)
        return
      }

      setProfile(profileRow)
      setProfileForm({
        first_name: profileRow.first_name ?? '',
        last_name: profileRow.last_name ?? '',
        mobile: profileRow.mobile ?? '',
      })
      setNotifForm({
        email: profileRow.notification_preferences?.email ?? true,
        sms: profileRow.notification_preferences?.sms ?? false,
        push: profileRow.notification_preferences?.push ?? true,
      })

      // Company + team only if the user belongs to one
      if (profileRow.company_id) {
        const [{ data: companyRow }, { data: teamRows }] = await Promise.all([
          supabase
            .from('companies')
            .select('id, name, abn, address, city, state, postcode, country, phone, email, website, subscription_status, subscription_tier, subscription_period_end, stripe_customer_id')
            .eq('id', profileRow.company_id)
            .single(),
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, is_active')
            .eq('company_id', profileRow.company_id)
            .order('created_at', { ascending: true }),
        ])

        if (cancelled) return
        if (companyRow) {
          setCompany(companyRow)
          setCompanyForm({
            name: companyRow.name ?? '',
            address: companyRow.address ?? '',
            city: companyRow.city ?? '',
            country: companyRow.country ?? '',
            website: companyRow.website ?? '',
            phone: companyRow.phone ?? '',
          })
        }
        if (teamRows) setTeam(teamRows)
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setProfileSaving(true)
    setProfileMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: profileForm.first_name || null,
        last_name: profileForm.last_name || null,
        mobile: profileForm.mobile || null,
      })
      .eq('id', profile.id)

    if (error) {
      setProfileMsg({ kind: 'err', text: error.message })
    } else {
      setProfileMsg({ kind: 'ok', text: 'Profile updated.' })
      setProfile({ ...profile, ...profileForm } as ProfileRow)
    }
    setProfileSaving(false)
  }

  async function handleCompanySave(e: React.FormEvent) {
    e.preventDefault()
    if (!company) return
    setCompanySaving(true)
    setCompanyMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .update({
        name: companyForm.name || null,
        address: companyForm.address || null,
        city: companyForm.city || null,
        country: companyForm.country || null,
        website: companyForm.website || null,
        phone: companyForm.phone || null,
      })
      .eq('id', company.id)

    if (error) {
      // Most common cause: caller isn't a company admin and RLS rejected the
      // UPDATE. Show that explicitly so the user knows it's a permission
      // problem, not a typing problem.
      const msg = /row[- ]level security|policy/i.test(error.message)
        ? 'Only company admins can edit company details. Ask your admin to make this change.'
        : error.message
      setCompanyMsg({ kind: 'err', text: msg })
    } else {
      setCompanyMsg({ kind: 'ok', text: 'Company updated.' })
      setCompany({ ...company, ...companyForm } as CompanyRow)
    }
    setCompanySaving(false)
  }

  async function handleNotifSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setNotifSaving(true)
    setNotifMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: notifForm })
      .eq('id', profile.id)

    if (error) {
      setNotifMsg({ kind: 'err', text: error.message })
    } else {
      setNotifMsg({ kind: 'ok', text: 'Preferences saved.' })
    }
    setNotifSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }

    setPwLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwError(error.message || 'Could not update password. Please try again.')
        setPwLoading(false)
        return
      }
      setPwSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setPwLoading(false)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Unexpected error updating password')
      setPwLoading(false)
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.url) {
        setPortalError(body?.error || 'Could not open billing portal.')
        setPortalLoading(false)
        return
      }
      window.location.href = body.url
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : 'Unexpected error')
      setPortalLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'criteria', label: 'Assessment Criteria', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  const initials = initialsFromProfile(profile)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">DF</span>
              </div>
              <span className="text-xl font-bold text-gray-900">DealFindrs</span>
            </Link>
            <div className="flex items-center gap-1">
              {[
                { name: 'Dashboard', href: '/dashboard', active: false },
                { name: 'Opportunities', href: '/opportunities', active: false },
                { name: 'Analytics', href: '/analytics', active: false },
                { name: 'Settings', href: '/settings', active: true },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/opportunities/new"
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Opportunity
            </Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account, company, team and how DealFindrs reaches you.
            Changes save per section — there is no global Save here.
          </p>
        </div>

        {loadError && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        <div className="flex gap-8">
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {loading && (
                <div className="p-6 text-gray-500 text-sm">Loading your settings…</div>
              )}

              {!loading && activeTab === 'profile' && (
                <form onSubmit={handleProfileSave} className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Your name and contact details. Email is managed by your sign-in and can&apos;t be changed here.
                  </p>

                  <div className="space-y-6 max-w-lg">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                      <div className="text-sm text-gray-500">
                        Avatar uses your initials. Custom photo upload coming later.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input
                          type="text"
                          autoComplete="given-name"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          autoComplete="family-name"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile?.email ?? ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                      <input
                        type="tel"
                        autoComplete="tel"
                        placeholder="+61 400 000 000"
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm(p => ({ ...p, mobile: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {profileMsg && (
                      <div className={`flex items-start gap-3 p-3 border rounded-lg text-sm ${
                        profileMsg.kind === 'ok'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {profileMsg.kind === 'ok'
                          ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <span>{profileMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {profileSaving ? 'Saving…' : <><Save className="w-4 h-4" /> Save Profile</>}
                    </button>
                  </div>
                </form>
              )}

              {!loading && activeTab === 'company' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Company</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Your company&apos;s details as they appear on opportunity reports and the finance pack. Only admins can edit.
                  </p>

                  {!company ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                      You&apos;re not part of a company yet. Finish{' '}
                      <Link href="/setup" className="font-medium underline">setting up your account</Link>{' '}
                      to create one.
                    </div>
                  ) : (
                    <form onSubmit={handleCompanySave} className="space-y-6 max-w-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                        <input
                          type="text"
                          value={companyForm.name}
                          onChange={(e) => setCompanyForm(c => ({ ...c, name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          placeholder="Street address"
                          value={companyForm.address}
                          onChange={(e) => setCompanyForm(c => ({ ...c, address: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            value={companyForm.city}
                            onChange={(e) => setCompanyForm(c => ({ ...c, city: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                          <input
                            type="text"
                            value={companyForm.country}
                            onChange={(e) => setCompanyForm(c => ({ ...c, country: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={companyForm.website}
                          onChange={(e) => setCompanyForm(c => ({ ...c, website: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm(c => ({ ...c, phone: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      {company.abn && (
                        <div className="text-sm text-gray-500">
                          ABN: <span className="font-mono text-gray-700">{company.abn}</span> (locked — contact support to change)
                        </div>
                      )}

                      {companyMsg && (
                        <div className={`flex items-start gap-3 p-3 border rounded-lg text-sm ${
                          companyMsg.kind === 'ok'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          {companyMsg.kind === 'ok'
                            ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                          <span>{companyMsg.text}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={companySaving}
                        className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {companySaving ? 'Saving…' : <><Save className="w-4 h-4" /> Save Company</>}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!loading && activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Security</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Change the password you use to sign in to DealFindrs. After saving, your existing
                    session stays active — you won&apos;t be signed out. If you&apos;ve forgotten your
                    current password, sign out and use{' '}
                    <Link href="/forgot-password" className="text-amber-600 hover:underline">
                      Forgot password
                    </Link>{' '}
                    instead.
                  </p>

                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    {pwError && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{pwError}</span>
                      </div>
                    )}

                    {pwSuccess && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Password updated. Use the new password next time you sign in.</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        minLength={8}
                        placeholder="Re-enter the password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {pwLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {!loading && activeTab === 'criteria' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Assessment Criteria</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    The de-risk and risk factors DealFindrs uses to score every opportunity. Tuning these is
                    how you bias the engine toward your own deal-finding thesis.
                  </p>
                  <Link
                    href="/setup"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                  >
                    Edit Assessment Criteria
                  </Link>
                </div>
              )}

              {!loading && activeTab === 'notifications' && (
                <form onSubmit={handleNotifSave} className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Choose how DealFindrs reaches you about new opportunities, assessment results, and team
                    activity. SMS and push are wired but disabled until the delivery channels are connected.
                  </p>

                  <div className="space-y-4 max-w-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifForm.email}
                        onChange={(e) => setNotifForm(n => ({ ...n, email: e.target.checked }))}
                        className="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifForm.sms}
                        onChange={(e) => setNotifForm(n => ({ ...n, sms: e.target.checked }))}
                        className="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">SMS notifications</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifForm.push}
                        onChange={(e) => setNotifForm(n => ({ ...n, push: e.target.checked }))}
                        className="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">Push notifications (in-app)</span>
                    </label>

                    {notifMsg && (
                      <div className={`flex items-start gap-3 p-3 border rounded-lg text-sm ${
                        notifMsg.kind === 'ok'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {notifMsg.kind === 'ok'
                          ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <span>{notifMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={notifSaving}
                      className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {notifSaving ? 'Saving…' : <><Save className="w-4 h-4" /> Save Preferences</>}
                    </button>
                  </div>
                </form>
              )}

              {!loading && activeTab === 'team' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Everyone in your company who can sign in to DealFindrs. Invite, role-change and remove
                    flows ship in the next admin update.
                  </p>

                  {!company ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                      No team yet — your account isn&apos;t linked to a company.{' '}
                      <Link href="/setup" className="font-medium underline">Finish setup</Link> to create one.
                    </div>
                  ) : team.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                      No teammates yet. You are the only member.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {team.map((m) => {
                        const memberInitials = initialsFromProfile(m)
                        const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email || 'Unnamed user'
                        const isYou = m.id === profile?.id
                        return (
                          <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center text-white font-medium">
                                {memberInitials}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {name}{isYou && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                                </p>
                                <p className="text-sm text-gray-500">{m.email}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium capitalize">
                              {m.role || 'member'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {!loading && activeTab === 'billing' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Billing &amp; Plan</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Your DealFindrs plan, renewal date, and how to manage payment details. Billing changes
                    open the Stripe portal in a new step.
                  </p>

                  {!company ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                      No billing record yet — finish account setup to create one.
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-700 font-medium">Current Plan</p>
                            <p className="text-2xl font-bold text-gray-900 capitalize">
                              {company.subscription_tier || 'Free Trial'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Status: <span className="capitalize">{company.subscription_status || 'trial'}</span>
                              {company.subscription_period_end && (
                                <> — renews {new Date(company.subscription_period_end).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                          {company.stripe_customer_id ? (
                            <button
                              onClick={handleOpenPortal}
                              disabled={portalLoading}
                              className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {portalLoading ? 'Opening…' : (<><ExternalLink className="w-4 h-4" /> Manage Subscription</>)}
                            </button>
                          ) : (
                            <Link
                              href="/pricing"
                              className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                            >
                              Upgrade Plan
                            </Link>
                          )}
                        </div>
                      </div>

                      {portalError && (
                        <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{portalError}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
