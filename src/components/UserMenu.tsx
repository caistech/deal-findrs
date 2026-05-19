'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type MiniProfile = {
  first_name: string | null
  last_name: string | null
  email: string | null
}

function initials(p: MiniProfile | null): string {
  if (!p) return '?'
  const f = p.first_name?.[0] ?? ''
  const l = p.last_name?.[0] ?? ''
  if (f || l) return (f + l).toUpperCase()
  return p.email?.[0]?.toUpperCase() ?? '?'
}

function fullName(p: MiniProfile | null): string {
  if (!p) return ''
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || p.email || ''
}

export function UserMenu() {
  const [profile, setProfile] = useState<MiniProfile | null>(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()
      // Even if the profile row is missing or RLS hides it, fall back to the
      // auth user's email so the avatar still shows something meaningful.
      if (!cancelled) {
        setProfile(
          data
            ? { first_name: data.first_name, last_name: data.last_name, email: data.email ?? user.email ?? null }
            : { first_name: null, last_name: null, email: user.email ?? null }
        )
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    // signOut() clears the local session AND the auth cookies (via the
    // @supabase/ssr cookie callbacks bound to the browser client). The
    // hard navigation to /login forces middleware to re-run on a fresh
    // request with no cookie, so any cached server-component data tied
    // to the previous user is dropped too.
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={fullName(profile) || 'Account'}
        className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium hover:opacity-90 transition-opacity"
      >
        {initials(profile)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fullName(profile) || 'Signed in'}
            </p>
            {profile?.email && profile.email !== fullName(profile) && (
              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            )}
          </div>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <SettingsIcon className="w-4 h-4 text-gray-500" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
