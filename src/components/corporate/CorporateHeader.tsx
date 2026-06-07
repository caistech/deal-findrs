'use client'
import React, { useState } from 'react'

interface NavItem {
  href: string
  label: string
}

interface CorporateHeaderProps {
  productName: string
  productAcronym?: string
  navItems?: NavItem[]
  activePath?: string
  rightContent?: React.ReactNode
  theme?: 'light' | 'dark'
  LinkComponent?: React.ElementType
}

export function CorporateHeader({
  productName,
  productAcronym,
  navItems = [],
  activePath,
  rightContent,
  theme = 'light',
  LinkComponent = 'a',
}: CorporateHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isDark = theme === 'dark'
  const acronym = productAcronym || productName.slice(0, 2).toUpperCase()
  const Link = LinkComponent

  return (
    <>
      <header
        className={`border-b sticky top-0 z-50 ${
          isDark
            ? 'border-slate-800 bg-slate-950/90 backdrop-blur-xl'
            : 'border-slate-200 bg-white/90 backdrop-blur-xl'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group no-underline flex-shrink-0">
              <div className="w-8 h-8 bg-[#22c55e] rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:bg-[#4ade80] transition-colors">
                {acronym}
              </div>
              <div className="flex items-center">
                <span className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {productName}
                </span>
                <span className={`text-xs ml-2 hidden lg:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  by Corporate AI Solutions
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            {navItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors no-underline whitespace-nowrap ${
                      activePath === item.href
                        ? isDark
                          ? 'text-white bg-slate-800'
                          : 'text-slate-900 bg-slate-100'
                        : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Right content + hamburger */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Right content: hidden on very small screens to prevent overflow */}
              {rightContent && (
                <div className="hidden sm:flex items-center gap-2">{rightContent}</div>
              )}

              {/* Hamburger — visible on mobile when there are nav items */}
              {navItems.length > 0 && (
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                  aria-expanded={menuOpen}
                  className={`md:hidden flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {menuOpen ? (
                    /* X icon */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    /* Hamburger icon */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  )}
                </button>
              )}

              {/* Right content on mobile (below hamburger) */}
              {rightContent && (
                <div className="sm:hidden flex items-center gap-2">{rightContent}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && navItems.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav
            className={`md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 flex flex-col shadow-2xl ${
              isDark ? 'bg-slate-900' : 'bg-white'
            }`}
          >
            {/* Drawer header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#22c55e] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  {acronym}
                </div>
                <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {productName}
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium no-underline mb-1 min-h-[44px] transition-colors ${
                    activePath === item.href
                      ? isDark
                        ? 'text-white bg-slate-800'
                        : 'text-slate-900 bg-slate-100'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right content at bottom of drawer */}
            {rightContent && (
              <div className={`px-4 py-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                {rightContent}
              </div>
            )}
          </nav>
        </>
      )}
    </>
  )
}
