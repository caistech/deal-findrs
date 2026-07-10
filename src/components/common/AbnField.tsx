'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { validateAbn, formatAbn, type AbnLookupResult } from '@/lib/abn'

interface AbnFieldProps {
  value: string
  onChange: (value: string) => void
  /** Fired when a valid ABN resolves to a registered entity — e.g. to autofill a name field. */
  onResolved?: (result: AbnLookupResult) => void
  label?: string
  placeholder?: string
  className?: string
}

/**
 * ABN input with live ABR lookup (PRODUCT_STANDARDS: ABN fields use a lookup, never a plain
 * text input). Validates the checksum on 11 digits, debounces a call to /api/abn-lookup, and
 * surfaces the registered entity name (or a clear error). Degrades to plain entry on lookup
 * failure — it never blocks submit.
 */
export function AbnField({
  value,
  onChange,
  onResolved,
  label = 'ABN',
  placeholder = 'e.g. 99 691 530 426',
  className = '',
}: AbnFieldProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AbnLookupResult | null>(null)
  const [error, setError] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raw = value.replace(/\s/g, '')
    setResult(null)
    setError('')

    if (!/^\d{11}$/.test(raw)) {
      // Not yet a full ABN — show a checksum hint only once 11 digits are present.
      if (raw.length === 11) setError('ABN must be 11 digits')
      return
    }

    const validationError = validateAbn(raw)
    if (validationError) {
      setError(validationError)
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/abn-lookup?abn=${raw}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'ABN lookup failed')
        } else {
          setResult(data as AbnLookupResult)
          onResolved?.(data as AbnLookupResult)
        }
      } catch {
        // Degrade, don't fake — allow the typed ABN through if the service is unreachable.
        setError('')
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const raw = value.replace(/\s/g, '')
            if (/^\d{11}$/.test(raw) && !validateAbn(raw)) onChange(formatAbn(raw))
          }}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : result
              ? 'border-emerald-400 focus:ring-emerald-400'
              : 'border-gray-300 focus:ring-amber-500'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : result ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : null}
        </span>
      </div>
      {result && (
        <p className="mt-1 text-xs text-emerald-700">
          {result.entityName}
          {result.abnStatus ? ` · ${result.abnStatus}` : ''}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
