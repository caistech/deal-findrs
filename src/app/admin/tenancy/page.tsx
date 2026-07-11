'use client'

import { useEffect, useState } from 'react'
import { Loader2, Building2 } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  abn: string | null
  subscription_tier: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  created_at: string | null
  memberCount: number
}

export default function AdminTenancyPage() {
  const [tenancy, setTenancy] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/tenancy')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load tenancy')
        setTenancy(d.tenancy || [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-violet-600" /> Tenancy
          </h1>
          <p className="text-gray-600 mt-1">
            Every organisation on the platform — its subscription tier and status, and how many members
            it has. Use this to see who your tenants are and which plans they're on.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-600 p-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading tenancy…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        ) : tenancy.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">No organisations yet.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Organisation</th>
                  <th className="text-left font-medium px-4 py-3">ABN</th>
                  <th className="text-left font-medium px-4 py-3">Tier</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Members</th>
                  <th className="text-left font-medium px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenancy.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.abn || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">{t.subscription_tier || 'free'}</span></td>
                    <td className="px-4 py-3 text-gray-600">{t.subscription_status || 'trialing'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{t.memberCount}</td>
                    <td className="px-4 py-3 text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
