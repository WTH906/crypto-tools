import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { parseCryptorankXlsx } from '../../lib/xlsx-parse'

/**
 * Three states: 'idle' (drop file), 'preview' (show counts + confirm),
 * 'done' (show result).
 */
export default function ImportXlsxModal({ open, onClose, onImport, onPreview }) {
  const [state, setState] = useState('idle')
  const [filename, setFilename] = useState('')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [mode, setMode] = useState('skip') // 'skip' | 'update'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const reset = () => {
    setState('idle')
    setFilename('')
    setRows([])
    setStats(null)
    setMode('skip')
    setError(null)
    setResult(null)
    setBusy(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file) => {
    if (!file) return
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Please select a .xlsx file from cryptorank-tracker.')
      return
    }
    setError(null)
    setBusy(true)
    setFilename(file.name)
    try {
      const parsed = await parseCryptorankXlsx(file)
      if (parsed.length === 0) {
        setError('No rows with a project name were found in this file.')
        setBusy(false)
        return
      }
      const preview = onPreview(parsed)
      setRows(parsed)
      setStats(preview)
      setState('preview')
    } catch (e) {
      setError(`Could not parse the file: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleImport = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await onImport(rows, mode)
      setResult(r)
      setState('done')
    } catch (e) {
      setError(`Import failed: ${e.message || e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import from cryptorank-tracker"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-fg-subtle font-mono">
            {state === 'preview' && stats && `${rows.length} rows in file`}
            {state === 'done' && 'Done'}
          </div>
          <div className="flex items-center gap-2">
            {state === 'idle' && (
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            )}
            {state === 'preview' && (
              <>
                <Button variant="ghost" onClick={reset} disabled={busy}>
                  Pick another file
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={busy || (stats?.isNew === 0 && mode === 'skip')}
                >
                  {busy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Importing…
                    </>
                  ) : (
                    <>Import</>
                  )}
                </Button>
              </>
            )}
            {state === 'done' && (
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 px-3 py-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {state === 'idle' && (
        <div>
          <p className="text-xs text-fg-muted mb-3 leading-relaxed">
            Export an XLSX from{' '}
            <span className="text-accent font-mono">cryptorank-tracker</span> using
            its date range filter, then drop the file here. Rows that already
            exist (matched by CryptoRank slug, then by name) are skipped — you
            can safely re-import overlapping date ranges week-to-week.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`w-full border-2 border-dashed rounded-lg py-12 px-6 flex flex-col items-center gap-3 transition-all ${
              dragOver
                ? 'border-accent bg-accent-bg/40'
                : 'border-border hover:border-border-strong hover:bg-bg-elevated/40'
            } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {busy ? (
              <Loader2 size={28} className="text-accent animate-spin" />
            ) : (
              <Upload size={28} className="text-accent" />
            )}
            <div className="text-sm font-medium">
              {busy ? 'Parsing…' : 'Drop XLSX here, or click to browse'}
            </div>
            <div className="text-[11px] text-fg-subtle">
              Expects the cryptorank-tracker export format
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {state === 'preview' && stats && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-elevated/40 border border-border rounded-md">
            <FileSpreadsheet size={14} className="text-accent" />
            <span className="text-xs text-fg-muted truncate">{filename}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="New" value={stats.isNew} accent />
            <Stat label="Already exist" value={stats.exists} />
            <Stat label="Dupes in file" value={stats.dupesInFile} />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-fg-muted">
              On collision
            </div>
            <div className="flex gap-2">
              <ModeOption
                active={mode === 'skip'}
                onClick={() => setMode('skip')}
                label="Skip existing"
                hint="Safe re-import. Recommended."
              />
              <ModeOption
                active={mode === 'update'}
                onClick={() => setMode('update')}
                label="Update existing"
                hint="Overwrite with XLSX data. Loses your edits on those rows."
              />
            </div>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-fg-muted bg-bg-elevated/40 border-b border-border">
              Preview · first {Math.min(rows.length, 8)} rows
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_100px_90px_80px] text-[11px]">
              <div className="px-3 py-1.5 text-fg-subtle border-b border-border/40">
                Name
              </div>
              <div className="px-2 py-1.5 text-fg-subtle border-b border-border/40">
                Category
              </div>
              <div className="px-2 py-1.5 text-fg-subtle border-b border-border/40">
                Stage
              </div>
              <div className="px-2 py-1.5 text-fg-subtle border-b border-border/40">
                Date
              </div>
              <div className="px-2 py-1.5 text-fg-subtle border-b border-border/40">
                Raise
              </div>
              {rows.slice(0, 8).map((r, i) => (
                <PreviewRow key={i} row={r} />
              ))}
            </div>
            {rows.length > 8 && (
              <div className="px-3 py-1.5 text-[10px] text-fg-subtle bg-bg-elevated/40 border-t border-border">
                + {rows.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {state === 'done' && result && (
        <div className="text-center py-8">
          <CheckCircle2 size={36} className="text-accent mx-auto mb-3" />
          <div className="text-sm font-medium mb-1">Import complete</div>
          <div className="text-xs text-fg-muted font-mono">
            {result.inserted} inserted · {result.updated} updated ·{' '}
            {result.skipped} skipped
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div
      className={`px-3 py-2 border rounded-md ${
        accent
          ? 'border-accent-dark bg-accent-bg/40'
          : 'border-border bg-bg-elevated/40'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      <div
        className={`text-xl font-bold font-mono mt-0.5 ${
          accent ? 'text-accent' : 'text-fg'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function ModeOption({ active, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left px-3 py-2 rounded-md border text-xs transition-all ${
        active
          ? 'bg-accent-bg/40 border-accent-dark text-fg'
          : 'bg-bg-elevated/40 border-border text-fg-muted hover:text-fg hover:border-border-strong'
      }`}
    >
      <div className="font-medium">{label}</div>
      <div
        className={`text-[10px] mt-0.5 ${active ? 'text-fg-muted' : 'text-fg-subtle'}`}
      >
        {hint}
      </div>
    </button>
  )
}

function PreviewRow({ row }) {
  return (
    <>
      <div className="px-3 py-1.5 truncate font-medium">{row.name}</div>
      <div className="px-2 py-1.5 truncate text-fg-muted">{row.category || '—'}</div>
      <div className="px-2 py-1.5 truncate text-fg-muted">
        {row.actual_stage || '—'}
      </div>
      <div className="px-2 py-1.5 truncate text-fg-muted font-mono">
        {row.last_fund_date || '—'}
      </div>
      <div className="px-2 py-1.5 truncate font-mono text-accent">
        {row.fundraising_amount || '—'}
      </div>
    </>
  )
}
