'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Users, Mic, CreditCard, ArrowLeft, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AdminLayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/elevenlabs', label: 'Voice Agent', icon: Mic },
  { href: '/admin/stripe', label: 'Billing', icon: CreditCard },
]

/**
 * Persistent admin chrome — the admin-portal counterpart of AuthLayout, so every /admin route
 * (except /admin/login) carries a left navbar + Sign Out instead of a lone Back link
 * (PRODUCT_STANDARDS §4). Admins are also users, so a "Back to App" link returns to /dashboard.
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/admin/login')
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'))

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all min-h-[44px] ${
              isActive(href)
                ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-[18px] h-[18px] ${isActive(href) ? 'text-[#22c55e]' : 'text-slate-400'}`} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all min-h-[44px]"
        >
          <ArrowLeft className="w-[18px] h-[18px] text-slate-400" />
          Back to App
        </Link>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all min-h-[44px] disabled:opacity-50"
        >
          <LogOut className="w-[18px] h-[18px] text-slate-400" />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-100">
          <Link href="/admin" className="flex items-center gap-3 no-underline group">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm group-hover:bg-slate-700 transition-colors">
              DF
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">DealFindrs</p>
              <p className="text-xs text-slate-400 leading-tight">Admin</p>
            </div>
          </Link>
        </div>
        <NavList />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-2xl overflow-y-auto">
            <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-between">
              <Link href="/admin" className="flex items-center gap-3 no-underline" onClick={() => setDrawerOpen(false)}>
                <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm">DF</div>
                <p className="font-bold text-slate-900 text-sm">Admin</p>
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
            <NavList onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
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
          <Link href="/admin" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">DF</div>
            <span className="font-semibold text-slate-900 text-sm">Admin</span>
          </Link>
          <span className="w-11" />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
