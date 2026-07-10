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
  // A neutral "format is valid but we couldn't verify against the register" note. This is the
  // degrade-don't-fake path: when the ABR lookup is unavailable (service down, or ABR_GUID not
  // configured) we accept a checksum-valid ABN silently rather than surfacing a raw server error.
  const [note, setNote] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const raw = value.replace(/\s/g, '')
    setResult(null)
    setError('')
    setNote('')

    if (!/^\d{11}$/.test(raw)) {
      // Not yet a full ABN — show a checksum hint only once 11 digits are present.
      if (raw.length === 11) setError('ABN must be 11 digits')
      return
    }

    const validationError = validateAbn(raw)
    if (validationError) {
      // Only a genuine client-side checksum failure is a hard error.
      setError(validationError)
      return
    }

    // Valid format — provisionally accept it, then try to enrich with the registered entity name.
    setNote('Valid ABN format')

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/abn-lookup?abn=${raw}`)
        const data = res.ok ? await res.json() : null
        if (data && data.entityName) {
          setResult(data as AbnLookupResult)
          setNote('')
          onResolved?.(data as AbnLookupResult)
        }
        // Any non-resolving outcome (unconfigured lookup, ABN not found, network/service error)
        // leaves the neutral "Valid ABN format" note — we NEVER surface the raw server error or
        // red-flag a checksum-valid ABN. Real name resolution auto-enables once ABR_GUID is set.
      } catch {
        // Degrade, don't fake — the typed ABN stays accepted.
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
          ) : note ? (
            <Check className="w-4 h-4 text-gray-400" />
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
      {!result && note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
