'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, FileText, Check, X, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import {
  EVIDENCE_CATEGORIES,
  CATEGORY_LABELS,
  REQUIRED_CATEGORIES,
  CATEGORY_BACKS,
  type EvidenceCategory,
  type ClaimField,
} from '@/lib/feasibility/evidence/categories'

interface EvidenceRow {
  id: string
  category: EvidenceCategory
  storage_path: string
  original_filename: string | null
  file_size_bytes: number | null
  mime_type: string | null
  verified_by_user: boolean
  received_at: string
}

interface UploadingFile {
  tempId: string
  file: File
  category: EvidenceCategory
  pickedField?: ClaimField
  progress: number
  error?: string
}

interface DocumentUploadProps {
  opportunityId: string
  onEvidenceChange?: (evidence: EvidenceRow[]) => void
  className?: string
}

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.webp'

export function DocumentUpload({ opportunityId, onEvidenceChange, className = '' }: DocumentUploadProps) {
  const [existing, setExisting] = useState<EvidenceRow[]>([])
  const [uploads, setUploads] = useState<UploadingFile[]>([])
  const [activeCategory, setActiveCategory] = useState<EvidenceCategory>('purchase_contract')
  const [pickedField, setPickedField] = useState<ClaimField | undefined>(undefined)
  const [dragActive, setDragActive] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing evidence on mount + whenever opportunityId changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/evidence?opportunity_id=${encodeURIComponent(opportunityId)}`)
        if (!res.ok) {
          setListError('Could not load existing evidence')
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setExisting(data.evidence ?? [])
          onEvidenceChange?.(data.evidence ?? [])
        }
      } catch {
        if (!cancelled) setListError('Could not load existing evidence')
      }
    }
    if (opportunityId) load()
    return () => { cancelled = true }
  }, [opportunityId, onEvidenceChange])

  const uploadOne = useCallback(
    (file: File, category: EvidenceCategory, claimField?: ClaimField) => {
      const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      setUploads(prev => [...prev, { tempId, file, category, pickedField: claimField, progress: 0 }])

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/evidence/upload')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, progress: pct } : u))
        }
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            if (data?.evidence?.id) {
              // Refresh listing
              const listRes = await fetch(`/api/evidence?opportunity_id=${encodeURIComponent(opportunityId)}`)
              if (listRes.ok) {
                const listData = await listRes.json()
                setExisting(listData.evidence ?? [])
                onEvidenceChange?.(listData.evidence ?? [])
              }
            }
          } catch {
            /* ignore parse error, listing refresh will retry next render */
          }
          setUploads(prev => prev.filter(u => u.tempId !== tempId))
        } else {
          let msg = `Upload failed (${xhr.status})`
          try {
            const data = JSON.parse(xhr.responseText)
            msg = data?.error || msg
          } catch { /* keep default */ }
          setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, error: msg, progress: 100 } : u))
        }
      }

      xhr.onerror = () => {
        setUploads(prev => prev.map(u => u.tempId === tempId ? { ...u, error: 'Network error', progress: 100 } : u))
      }

      const fd = new FormData()
      fd.append('file', file)
      fd.append('opportunity_id', opportunityId)
      fd.append('category', category)
      if (claimField) fd.append('claim_field', claimField)
      xhr.send(fd)
    },
    [opportunityId, onEvidenceChange]
  )

  const handleFiles = useCallback(
    (fileList: FileList) => {
      Array.from(fileList).forEach(file => uploadOne(file, activeCategory, pickedField))
    },
    [activeCategory, pickedField, uploadOne]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this document? Any linked claim will revert to ASSERTED.')) return
    try {
      const res = await fetch(`/api/evidence/${id}`, { method: 'DELETE' })
      if (res.ok) {
        const next = existing.filter(e => e.id !== id)
        setExisting(next)
        onEvidenceChange?.(next)
      }
    } catch { /* surface no error UI for v1 */ }
  }

  const dismissUploadError = (tempId: string) => {
    setUploads(prev => prev.filter(u => u.tempId !== tempId))
  }

  // Required-category satisfaction
  const requiredHave = REQUIRED_CATEGORIES.filter(req =>
    existing.some(e => e.category === req)
  )

  const backsFields = CATEGORY_BACKS[activeCategory]
  const needsFieldPick = backsFields.length > 1

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Explanatory header (global UI rule) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Evidence supporting your deal inputs</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload the documents that back each figure on your deal — purchase contract, independent valuation,
          signed offtakes, equity proof. Anything you assert without a document here is stripped, and the engine
          substitutes the conservative defensible figure.
        </p>
      </div>

      {/* Required-evidence progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-900">Required evidence</span>
          <span className="text-slate-600">
            {requiredHave.length}/{REQUIRED_CATEGORIES.length} provided
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={requiredHave.length === REQUIRED_CATEGORIES.length ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'}
            style={{ width: `${(requiredHave.length / REQUIRED_CATEGORIES.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Required: {REQUIRED_CATEGORIES.map(c => CATEGORY_LABELS[c].label).join(', ')}.
          The engine cannot certify a deal without these.
        </p>
      </div>

      {/* Category picker + field picker (responsive) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-900">Document type</label>
          <select
            value={activeCategory}
            onChange={(e) => {
              const next = e.target.value as EvidenceCategory
              setActiveCategory(next)
              setPickedField(undefined)
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {EVIDENCE_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c].label}{REQUIRED_CATEGORIES.includes(c) ? ' (required)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{CATEGORY_LABELS[activeCategory].description}</p>
        </div>

        {needsFieldPick && (
          <div>
            <label className="block text-sm font-medium text-slate-900">This valuation backs</label>
            <select
              value={pickedField ?? backsFields[0]}
              onChange={(e) => setPickedField(e.target.value as ClaimField)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {backsFields.map(f => (
                <option key={f} value={f}>
                  {f === 'land_value' && 'Land value (as-is)'}
                  {f === 'grv_total' && 'Gross realisable value (on-completion)'}
                  {f === 'equity_cash' && 'Cash equity'}
                  {f === 'pre_sales_percent' && 'Pre-sales / demand'}
                  {f === 'construction_cost' && 'Construction cost'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragActive ? 'border-slate-700 bg-slate-50' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <p className="font-medium text-slate-900">
          {dragActive ? 'Drop files to upload' : 'Drag & drop or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">PDF, DOC, JPG, PNG up to 50&nbsp;MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(u => (
            <div key={u.tempId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              {u.error ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{u.file.name}</p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_LABELS[u.category].label}
                  {' · '}
                  {(u.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {u.error ? (
                  <p className="mt-1 text-xs text-red-600">{u.error}</p>
                ) : (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-slate-700 transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
              </div>
              {u.error && (
                <button onClick={() => dismissUploadError(u.tempId)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing evidence list */}
      {listError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</div>
      )}

      {existing.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900">Uploaded documents ({existing.length})</h3>
          {existing.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Check className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {ev.original_filename ?? 'Document'}
                </p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_LABELS[ev.category].label}
                  {ev.file_size_bytes && ` · ${(ev.file_size_bytes / 1024 / 1024).toFixed(2)} MB`}
                  {' · '}
                  {new Date(ev.received_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(ev.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remove document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {existing.length === 0 && uploads.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-600">No documents uploaded yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Without evidence, the engine treats every flattering figure as ASSERTED and substitutes conservative values.
          </p>
        </div>
      )}
    </div>
  )
}

export default DocumentUpload
