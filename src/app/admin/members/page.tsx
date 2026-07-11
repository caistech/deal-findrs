'use client'

import { useEffect, useState } from 'react'
import { Loader2, Users } from 'lucide-react'

interface Member {
  id: string
  email: string
  company: string
  role: string
  isPrimary: boolean
  joinedAt: string | null
}
interface PendingInvite {
  id: string
  email: string
  role: string
  company: string
  expiresAt: string | null
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/members')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load members')
        setMembers(d.members || [])
        setInvites(d.pendingInvites || [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" /> Members
          </h1>
          <p className="text-gray-600 mt-1">
            Everyone with access across all organisations — their email, the org they belong to, and
            their role. Pending invites are listed below. Add a user from User Management.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-600 p-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading members…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        ) : (
          <>
            {members.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">No members yet.</div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Email</th>
                      <th className="text-left font-medium px-4 py-3">Organisation</th>
                      <th className="text-left font-medium px-4 py-3">Role</th>
                      <th className="text-left font-medium px-4 py-3">Primary</th>
                      <th className="text-left font-medium px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{m.email}</td>
                        <td className="px-4 py-3 text-gray-600">{m.company}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">{m.role}</span></td>
                        <td className="px-4 py-3 text-gray-500">{m.isPrimary ? 'Yes' : '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-AU') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {invites.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending invites</h2>
                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">Email</th>
                        <th className="text-left font-medium px-4 py-3">Organisation</th>
                        <th className="text-left font-medium px-4 py-3">Role</th>
                        <th className="text-left font-medium px-4 py-3">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invites.map((i) => (
                        <tr key={i.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{i.email}</td>
                          <td className="px-4 py-3 text-gray-600">{i.company}</td>
                          <td className="px-4 py-3 text-gray-600">{i.role}</td>
                          <td className="px-4 py-3 text-gray-500">{i.expiresAt ? new Date(i.expiresAt).toLocaleDateString('en-AU') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
