'use client'

import { BarChart3, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'

export default function AnalyticsPage() {
  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Explanatory header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1 text-base">
            Track your deal flow and pipeline performance. Metrics update as you assess more opportunities.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Pipeline', value: '—', icon: DollarSign, color: 'emerald' },
            { label: 'Avg. Gross Margin', value: '—', icon: TrendingUp, color: 'blue' },
            { label: 'Deals Assessed', value: '0', icon: BarChart3, color: 'violet' },
            { label: 'Avg. Assessment Time', value: '—', icon: Clock, color: 'amber' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Deal Flow Over Time</h3>
            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400 text-sm">Chart will appear when you have more data</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">RAG Status Distribution</h3>
            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-gray-600">Green: 0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-gray-600">Amber: 0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Red: 0</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Add opportunities to see trends</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">More Analytics Coming Soon</h3>
          <p className="text-gray-600 mb-4 text-base">
            We&apos;re building advanced analytics including conversion rates, source tracking, and predictive insights.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
