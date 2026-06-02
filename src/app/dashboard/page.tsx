'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Bell, Mic } from 'lucide-react'
import { CorporateHeader } from '@/components/corporate/CorporateHeader'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'
import { UserMenu } from '@/components/UserMenu'

// Sample deal used in the screenshot tour. The Branscomb V6 deal is the
// engine's known-bad regression case — it MUST surface as RED to match what
// the live engine would return on the same inputs. See
// src/lib/feasibility/__tests__/branscombe-v6.test.ts for the gate.
const mockDeals = [
  {
    id: '1',
    name: 'Branscomb Rd, Claremont',
    location: 'Claremont, TAS',
    status: 'red',
    gm: 'See engine',
    score: 0,
    lots: 37,
    stage: 'Unfunded — equity gap, GRV unevidenced'
  },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [voiceActive, setVoiceActive] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const filteredDeals = mockDeals.filter(deal => {
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         deal.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    green: mockDeals.filter(d => d.status === 'green').length,
    amber: mockDeals.filter(d => d.status === 'amber').length,
    red: mockDeals.filter(d => d.status === 'red').length,
    // Sample only — production pipeline value will be computed from real DB rows.
    pipelineValue: '—',
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'green': return 'bg-emerald-500'
      case 'amber': return 'bg-amber-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="light"
        LinkComponent={Link}
        activePath="/dashboard"
        navItems={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/opportunities', label: 'Opportunities' },
          { href: '/analytics', label: 'Analytics' },
          { href: '/settings', label: 'Settings' },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#22c55e] rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Notifications</span>
                    <button className="text-sm text-[#22c55e] hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                      <p className="text-sm text-gray-900">Branscomb Rd assessment complete</p>
                      <p className="text-xs text-gray-500 mt-1">Result: AMBER (Score: 78)</p>
                      <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-sm text-gray-900">Welcome to DealFindrs!</p>
                      <p className="text-xs text-gray-500 mt-1">Your 14-day free trial has started</p>
                      <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <Link href="/settings" className="text-sm text-[#22c55e] hover:underline">
                      Notification settings
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/opportunities/new"
              className="px-4 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-bold hover:bg-[#4ade80] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Opportunity
            </Link>
            <UserMenu />
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Explanatory Header */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-sm text-gray-600">
            Overview of your property development pipeline. Track deal status, review assessments, and prioritize opportunities.
          </p>
        </div>

        {/* Welcome Banner */}
        <div className="bg-[#22c55e] rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
              <p className="text-white/80">
                {mockDeals.length === 0 
                  ? "Get started by adding your first property development opportunity."
                  : `You have ${stats.amber} opportunity awaiting review. Add more to build your pipeline.`
                }
              </p>
            </div>
            <Link 
              href="/opportunities/new"
              className="px-6 py-3 bg-white text-[#22c55e] rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add New Opportunity
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Green Light', count: stats.green, color: 'emerald', icon: '🟢' },
            { label: 'Amber', count: stats.amber, color: 'amber', icon: '🟡' },
            { label: 'Red', count: stats.red, color: 'red', icon: '🔴' },
            { label: 'Pipeline Value', count: stats.pipelineValue, color: 'blue', icon: '💰' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => stat.label !== 'Pipeline Value' && setStatusFilter(stat.label.toLowerCase().replace(' light', ''))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Opportunities List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Opportunities</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search deals..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] w-64"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                <option value="all">All Status</option>
                <option value="green">Green</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {filteredDeals.map((deal) => (
              <Link 
                key={deal.id} 
                href={`/opportunities/${deal.id}`}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4"
              >
                <div className={`w-4 h-4 rounded-full ${getStatusColor(deal.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{deal.name}</p>
                  <p className="text-sm text-gray-500">{deal.location}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {deal.stage}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{deal.gm}</p>
                  <p className="text-xs text-gray-500">GM</p>
                </div>
                <div className="text-right w-16">
                  <p className="font-semibold text-gray-900">{deal.score}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="text-right w-12">
                  <p className="font-semibold text-gray-900">{deal.lots}</p>
                  <p className="text-xs text-gray-500">Lots</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>

          {filteredDeals.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? "No opportunities found matching your criteria."
                  : "No opportunities yet. Add your first one to get started!"
                }
              </p>
              <Link 
                href="/opportunities/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-bold hover:bg-[#4ade80] hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> Add Your First Opportunity
              </Link>
            </div>
          )}

          {filteredDeals.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link 
                href="/opportunities"
                className="text-[#22c55e] font-medium hover:underline"
              >
                View all opportunities →
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Voice Assistant FAB */}
      <button 
        onClick={() => setVoiceActive(!voiceActive)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          voiceActive 
            ? 'bg-[#22c55e] scale-110' 
            : 'bg-[#22c55e] hover:scale-105'
        }`}
      >
        <Mic className={`w-6 h-6 text-white ${voiceActive ? 'animate-pulse' : ''}`} />
      </button>

      {/* Voice Dialog */}
      {voiceActive && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-[#22c55e] px-4 py-3 flex items-center justify-between">
            <span className="text-white font-medium flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse" /> Voice Assistant
            </span>
            <button onClick={() => setVoiceActive(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              "Hi! I can help you add new opportunities, review your pipeline, or explain assessment results. 
              What would you like to do?"
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link 
                href="/opportunities/new"
                className="px-3 py-2 bg-[#22c55e]/10 text-[#22c55e] rounded-lg text-sm font-medium hover:bg-[#22c55e]/20 transition-colors"
              >
                Add opportunity
              </Link>
              <Link 
                href="/opportunities/1"
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Review Branscomb
              </Link>
            </div>
          </div>
        </div>
      )}

      <CorporateFooter productName="DealFindrs" />
    </div>
  )
}
