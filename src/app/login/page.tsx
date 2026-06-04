// @explanatory-header-exempt — auth surface (login / signup / password flows are self-explanatory by web convention)
'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, AlertCircle, Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next') || '/dashboard'
  // Only honour same-origin relative paths — refuse open-redirect attempts.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Login failed. Please check your credentials.')
        setLoading(false)
        return
      }

      // Successful login. Move into a deterministic "Redirecting…" state and
      // perform a HARD navigation. A soft router.push left the form stuck on
      // the spinner because the client component stayed mounted and the fresh
      // session cookie wasn't always seen by middleware on the soft nav. A
      // full-page assign guarantees the cookie is sent and middleware runs.
      setRedirecting(true)
      setLoading(false)
      window.location.assign(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error during login')
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setMagicSent(false)

    if (!email) {
      setError('Enter your email above, then click Email me a magic link.')
      return
    }

    setMagicLoading(true)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

      if (otpError) {
        setError(otpError.message || 'Could not send magic link. Please try again.')
        setMagicLoading(false)
        return
      }

      setMagicSent(true)
      setMagicLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error sending magic link')
      setMagicLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">DF</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">DealFindrs</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Log in to your account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {redirecting && (
            <div className="mb-4 flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Signed in — redirecting you now. If this doesn&apos;t happen automatically,{' '}
                <a href={next} className="font-semibold underline">go to your dashboard →</a>
              </span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="john@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-12 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-sm text-amber-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || magicLoading || redirecting}
            className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading || redirecting ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                {redirecting ? 'Redirecting…' : 'Logging in...'}
              </>
            ) : (
              <>
                Log In <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {magicSent ? (
            <div className="mt-4 flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Magic link sent to <span className="font-semibold">{email}</span>. Open it in this browser
                to sign in. The link expires in one hour.
              </span>
            </div>
          ) : (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
                <div className="flex-1 h-px bg-gray-200" />
                <span>OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading || magicLoading}
                className="w-full py-4 bg-white border border-gray-300 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {magicLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                    Sending magic link...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Email me a magic link
                  </>
                )}
              </button>
            </>
          )}

          <p className="text-center text-gray-600 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-amber-600 font-medium hover:underline">
              Start free trial
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50" />}>
      <LoginForm />
    </Suspense>
  )
}
