'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuthLayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/opportunities',
    label: 'Opportunities',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/setup',
    label: 'Criteria Setup',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93A10 10 0 1 0 4.93 19.07M19.07 4.93A10 10 0 0 1 21 12" />
      </svg>
    ),
  },
]

const BOTTOM_ITEMS = [
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
]

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 no-underline group">
            <div className="w-9 h-9 bg-[#22c55e] rounded-xl flex items-center justify-center text-white font-bold text-sm group-hover:bg-[#4ade80] transition-colors">
              DF
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">DealFindrs</p>
              <p className="text-xs text-slate-400 leading-tight">by CAS</p>
            </div>
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all min-h-[44px] ${
                isActive(item.href)
                  ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={isActive(item.href) ? 'text-[#22c55e]' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom: Settings + Sign Out */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-1">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all min-h-[44px] ${
                isActive(item.href)
                  ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={isActive(item.href) ? 'text-[#22c55e]' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all min-h-[44px] disabled:opacity-50"
          >
            <svg className="text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ─────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-2xl overflow-y-auto">
            <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3 no-underline" onClick={() => setDrawerOpen(false)}>
                <div className="w-8 h-8 bg-[#22c55e] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  DF
                </div>
                <p className="font-bold text-slate-900 text-sm">DealFindrs</p>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-all min-h-[44px] ${
                    isActive(item.href)
                      ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive(item.href) ? 'text-[#22c55e]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-slate-100 space-y-1">
              {BOTTOM_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-all min-h-[44px] ${
                    isActive(item.href)
                      ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive(item.href) ? 'text-[#22c55e]' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all min-h-[44px] disabled:opacity-50"
              >
                <svg className="text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 bg-[#22c55e] rounded-lg flex items-center justify-center text-white font-bold text-xs">
              DF
            </div>
            <span className="font-semibold text-slate-900 text-sm">DealFindrs</span>
          </Link>

          <Link
            href="/opportunities/new"
            aria-label="New Opportunity"
            className="flex items-center justify-center w-11 h-11 bg-[#22c55e] text-white rounded-xl hover:bg-[#4ade80] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
