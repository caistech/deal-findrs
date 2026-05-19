// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, AlertCircle, Trash2, Plus, RefreshCw, Copy, CreditCard } from 'lucide-react'

interface Product {
  id: string
  name: string
  tier: string
}

interface Price {
  id: string
  nickname: string
  amount: number
  interval: string
  tier: string
  billing: string
}

export default function AdminStripePage() {
  const [status, setStatus] = useState<'loading' | 'idle' | 'creating' | 'deleting'>('loading')
  const [products, setProducts] = useState<Product[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [configured, setConfigured] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const checkStatus = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/setup-stripe')
      const data = await res.json()
      setConfigured(!data.error)
      setProducts(data.products || [])
      setPrices(data.prices || [])
      if (data.error) setError(data.error)
    } catch (err) {
      setError('Failed to check status')
    }
    setStatus('idle')
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const createProducts = async () => {
    setStatus('creating')
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/setup-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })

      const data = await res.json()

      if (data.success) {
        setResult(data)
        await checkStatus()
      } else {
        setError(data.error || 'Failed to create products')
      }
    } catch (err) {
      setError('Failed to create products')
    }

    setStatus('idle')
  }

  const deleteProducts = async () => {
    if (!confirm('Archive all DealFindrs products in Stripe?')) return

    setStatus('deleting')
    setError(null)

    try {
      const res = await fetch('/api/admin/setup-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })

      await checkStatus()
    } catch (err) {
      setError('Failed to archive products')
    }

    setStatus('idle')
  }

  const copyEnv = () => {
    if (!result?.env) return

    const envText = Object.entries(result.env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    navigator.clipboard.writeText(envText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount / 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        <Link href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Stripe Products Setup</h1>
          </div>
          <p className="text-gray-600 mb-6">
            Automatically create subscription products and prices in your Stripe account.
          </p>

          {/* Status */}
          <div className={`p-4 rounded-xl mb-6 ${configured ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-3">
              {configured ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">Stripe API configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800 font-medium">{error || 'STRIPE_SECRET_KEY not set'}</span>
                </>
              )}
            </div>
          </div>

          {/* Current Products */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Products ({products.length})</h2>
              <button onClick={checkStatus} disabled={status !== 'idle'} className="text-gray-500 hover:text-gray-700">
                <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{product.id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.tier === 'premium' ? 'bg-violet-100 text-violet-700' :
                        product.tier === 'standard' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {product.tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No products created yet.</p>
            )}
          </div>

          {/* Prices */}
          {prices.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">Prices ({prices.length})</h2>
              <div className="grid grid-cols-2 gap-2">
                {prices.map((price) => (
                  <div key={price.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium">{price.nickname}</p>
                    <p className="text-gray-600">
                      {formatPrice(price.amount)}/{price.interval}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{price.id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={createProducts}
              disabled={!configured || status !== 'idle'}
              className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'creating' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Products...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Products & Prices
                </>
              )}
            </button>

            {products.length > 0 && (
              <button
                onClick={deleteProducts}
                disabled={status !== 'idle'}
                className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
              >
                {status === 'deleting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Archive
              </button>
            )}
          </div>

          {/* Error */}
          {error && status === 'idle' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-emerald-800">✅ Products Created!</h3>
                <button
                  onClick={copyEnv}
                  className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Env'}
                </button>
              </div>

              <p className="text-sm text-emerald-700 mb-3">
                Add these price IDs to your .env.local and Vercel:
              </p>

              <pre className="bg-emerald-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {Object.entries(result.env).map(([key, value]) => (
                  <div key={key}>{key}={value as string}</div>
                ))}
              </pre>
            </div>
          )}

          {/* Webhook Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-800 mb-2">🔗 Webhook Setup</h3>
            <p className="text-sm text-blue-700 mb-2">
              Add this webhook URL in Stripe Dashboard → Developers → Webhooks:
            </p>
            <code className="block bg-blue-100 p-2 rounded text-xs font-mono break-all">
              https://deal-findrs.vercel.app/api/stripe/webhook
            </code>
            <p className="text-sm text-blue-600 mt-2">
              Events to listen for: <code className="bg-blue-100 px-1 rounded">checkout.session.completed</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">customer.subscription.*</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">invoice.payment_*</code>
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Then add <code className="bg-blue-100 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> to Vercel env vars.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
