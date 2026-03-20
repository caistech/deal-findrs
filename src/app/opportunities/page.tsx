'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Filter, ArrowUpDown, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, name, address, city, state, status, rag_status, num_lots, num_dwellings, land_stage, total_project_cost, total_revenue, gross_margin_percent, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching opportunities:', error)
      } else {
        setDeals(data || [])
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'green': return 'bg-emerald-500'
      case 'amber': return 'bg-amber-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'green': return 'bg-emerald-50 border-emerald-200'
      case 'amber': return 'bg-amber-50 border-amber-200'
      case 'red': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
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
                { name: 'Opportunities', href: '/opportunities', active: true },
                { name: 'Analytics', href: '/analytics', active: false },
                { name: 'Settings', href: '/settings', active: false },
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
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
              UJ
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
            <p className="text-gray-600 mt-1">Manage and track all your property development opportunities</p>
          </div>
          <Link 
            href="/opportunities/new"
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add New Opportunity
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search opportunities..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="green">🟢 Green</option>
            <option value="amber">🟡 Amber</option>
            <option value="red">🔴 Red</option>
          </select>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" /> More Filters
          </button>
          <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Sort
          </button>
        </div>

        {/* Opportunities Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading opportunities...</p>
          </div>
        ) : filteredDeals.length > 0 ? (
          <div className="grid gap-4">
            {filteredDeals.map((deal) => {
              const ragStatus = deal.rag_status || 'draft'
              const location = [deal.city, deal.state].filter(Boolean).join(', ')
              const formatCurrency = (v: number | null) => v ? `$${(v / 1_000_000).toFixed(1)}M` : '—'
              const gmPercent = deal.gross_margin_percent != null ? `${deal.gross_margin_percent.toFixed(1)}%` : '—'
              return (
              <Link
                key={deal.id}
                href={`/opportunities/${deal.id}`}
                className={`bg-white rounded-xl border p-6 hover:shadow-lg transition-all ${getStatusBg(ragStatus)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      ragStatus === 'green' ? 'bg-emerald-100' :
                      ragStatus === 'amber' ? 'bg-amber-100' :
                      ragStatus === 'red' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {ragStatus === 'green' ? '🟢' : ragStatus === 'amber' ? '🟡' : ragStatus === 'red' ? '🔴' : '⚪'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{deal.name || 'Untitled'}</h3>
                      <p className="text-gray-600">{location || deal.address || 'No location'}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          {deal.land_stage || deal.status || 'Draft'}
                        </span>
                        {deal.num_lots && <span className="text-sm text-gray-500">{deal.num_lots} lots</span>}
                        <span className="text-sm text-gray-500">Added {new Date(deal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="font-bold text-gray-900">{formatCurrency(deal.total_project_cost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Revenue</p>
                      <p className="font-bold text-gray-900">{formatCurrency(deal.total_revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">GM%</p>
                      <p className="font-bold text-xl text-amber-600">{gmPercent}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
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
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your search or filters"
                : "Get started by adding your first property development opportunity"}
            </p>
            <Link 
              href="/opportunities/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" /> Add Your First Opportunity
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
