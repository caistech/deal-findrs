'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'

interface Opportunity {
  id: string
  name: string
  address: string
  city: string
  state: string
  status: string
  rag_status: string | null
  num_lots: number | null
  num_dwellings: number | null
  land_stage: string | null
  total_project_cost: number | null
  total_revenue: number | null
  gross_margin_percent: number | null
  created_at: string
}

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deals, setDeals] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const response = await fetch('/api/opportunities')
        if (!response.ok) throw new Error('Failed to fetch')
        const { opportunities } = await response.json()
        setDeals(opportunities || [])
      } catch (error) {
        console.error('Error fetching opportunities:', error)
      }
      setLoading(false)
    }
    fetchOpportunities()
  }, [])

  const filteredDeals = deals.filter(deal => {
    const location = [deal.city, deal.state].filter(Boolean).join(', ')
    const matchesSearch = (deal.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         location.toLowerCase().includes(searchQuery.toLowerCase())
    const ragStatus = deal.rag_status || deal.status || 'draft'
    const matchesStatus = statusFilter === 'all' || ragStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'green': return 'bg-emerald-50 border-emerald-200'
      case 'amber': return 'bg-amber-50 border-amber-200'
      case 'red': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Explanatory header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
            <p className="text-gray-600 mt-1 text-base">All your property development opportunities. Click any to view the full assessment.</p>
          </div>
          <Link
            href="/opportunities/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#22c55e] text-white rounded-xl font-bold hover:bg-[#4ade80] hover:shadow-lg transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add New Opportunity
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 text-base border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] min-h-[44px]"
          >
            <option value="all">All Status</option>
            <option value="green">🟢 Green</option>
            <option value="amber">🟡 Amber</option>
            <option value="red">🔴 Red</option>
          </select>
        </div>

        {/* Opportunities */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-base">Loading opportunities...</p>
          </div>
        ) : filteredDeals.length > 0 ? (
          // grid-cols-1 (Tailwind => repeat(1, minmax(0,1fr))) caps the track at
          // the container width; a bare `grid` used an implicit auto track that
          // grew to the widest card's content (~444px) and overflowed at 375px.
          <div className="grid grid-cols-1 gap-4">
            {filteredDeals.map((deal) => {
              const ragStatus = deal.rag_status || 'draft'
              const location = [deal.city, deal.state].filter(Boolean).join(', ')
              const formatCurrency = (v: number | null) => v ? `$${(v / 1_000_000).toFixed(1)}M` : '—'
              const gmPercent = deal.gross_margin_percent != null ? `${deal.gross_margin_percent.toFixed(1)}%` : '—'
              return (
                <Link
                  key={deal.id}
                  href={`/opportunities/${deal.id}`}
                  className={`bg-white rounded-xl border p-5 hover:shadow-lg transition-all flex items-center gap-4 ${getStatusBg(ragStatus)}`}
                >
                  <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg ${
                    ragStatus === 'green' ? 'bg-emerald-100' :
                    ragStatus === 'amber' ? 'bg-amber-100' :
                    ragStatus === 'red' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {ragStatus === 'green' ? '🟢' : ragStatus === 'amber' ? '🟡' : ragStatus === 'red' ? '🔴' : '⚪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{deal.name || 'Untitled'}</h3>
                    <p className="text-sm text-gray-600 truncate">{location || deal.address || 'No location'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        {deal.land_stage || deal.status || 'Draft'}
                      </span>
                      {deal.num_lots && <span className="text-xs text-gray-500">{deal.num_lots} lots</span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Cost</p>
                      <p className="font-bold text-gray-900 text-sm">{formatCurrency(deal.total_project_cost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">GM%</p>
                      <p className="font-bold text-lg text-[#22c55e]">{gmPercent}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-400" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No opportunities found</h3>
            <p className="text-gray-600 mb-6 text-base">
              {searchQuery || statusFilter !== 'all'
                ? "Try adjusting your search or filters"
                : "Get started by adding your first property development opportunity"}
            </p>
            <Link
              href="/opportunities/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-xl font-bold hover:bg-[#4ade80] hover:shadow-lg transition-all min-h-[44px]"
            >
              <Plus className="w-5 h-5" /> Add Your First Opportunity
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
