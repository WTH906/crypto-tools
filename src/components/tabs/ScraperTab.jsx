import { useState, useRef, useEffect } from 'react'
import { Search, Download, RefreshCw, Send, Trash2, RotateCcw, Plus, X, ExternalLink } from 'lucide-react'

function formatMoney(val) {
  if (val == null) return '—'
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`
  return `$${val}`
}

function formatDate(val) {
  if (!val) return '—'
  return val.slice(0, 10)
}

export default function ScraperTab({ scraper, onToast }) {
  const {
    projects, loading, scanning, scanProgress, sortBy, sortDir, showDeleted,
    handleSort, setShowDeleted,
    scanCryptoRank, scanICO, updateProject, deleteProject, restoreProject, sendToResearch,
  } = scraper

  const [token, setToken] = useState(() => localStorage.getItem('cr_token') || '')
  const [showToken, setShowToken] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(threeMonthsAgo)
  const [dateTo, setDateTo] = useState(today)
  const [maxPages, setMaxPages] = useState(10)

  const handleTokenChange = (val) => {
    setToken(val)
    localStorage.setItem('cr_token', val)
  }

  const handleScanCR = async () => {
    if (!token) { onToast('Paste your Bearer token first', 'error'); return }
    try {
      const r = await scanCryptoRank(token, dateFrom, dateTo, maxPages)
      let msg = `CR: ${r.scanned || r.fetched} scanned, ${r.fetched} in range — ${r.inserted} new, ${r.updated} updated`
      if (r.errors) msg += `, ${r.errors} errors`
      if (r.warning) msg += `. ⚠ ${r.warning}`
      onToast(msg, r.warning ? 'info' : 'success')
    } catch (e) {
      onToast(`CryptoRank scan failed: ${e.message}`, 'error')
    }
  }

  const handleScanICO = async () => {
    try {
      const r = await scanICO(dateFrom, dateTo, maxPages)
      let msg = `ICO: ${r.fetched} rounds — ${r.inserted} new, ${r.merged} merged, ${r.updated} updated`
      if (r.errors) msg += `, ${r.errors} errors`
      if (r.warning) msg += `. ⚠ ${r.warning}`
      onToast(msg, r.warning ? 'info' : 'success')
    } catch (e) {
      onToast(`ICO Analytics scan failed: ${e.message}`, 'error')
    }
  }

  const handleSend = async (p) => {
    try {
      await sendToResearch(p)
      onToast(`Sent "${p.name}" to research`, 'success')
    } catch (e) {
      onToast(`Send failed: ${e.message}`, 'error')
    }
  }

  const COLUMNS = [
    { key: 'name', label: 'Project', sortable: true },
    { key: 'funding_stage', label: 'Stage', sortable: true },
    { key: 'funding_date', label: 'Date', sortable: true },
    { key: 'funding_raise', label: 'Raised', sortable: true },
    { key: 'funding_valuation', label: 'Valuation', sortable: true },
    { key: 'investors_col', label: 'Investors' },
    { key: 'tags_col', label: 'Tags' },
    { key: 'notes_col', label: 'Notes' },
    { key: 'actions', label: '' },
  ]

  return (
    <div className="space-y-4">
      {/* Scan panel */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-wider text-fg-muted shrink-0">Token</label>
          <div className="flex-1 flex items-center gap-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => handleTokenChange(e.target.value)}
              placeholder="CryptoRank Bearer token"
              className="flex-1"
            />
            <button
              onClick={() => setShowToken(s => !s)}
              className="px-2 py-2 text-xs text-fg-muted hover:text-fg transition-colors"
              title={showToken ? 'Hide' : 'Show'}
            >
              {showToken ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <label className="text-xs space-y-1">
            <span className="uppercase tracking-wider text-fg-muted">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </label>
          <label className="text-xs space-y-1">
            <span className="uppercase tracking-wider text-fg-muted">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </label>
          <label className="text-xs space-y-1">
            <span className="uppercase tracking-wider text-fg-muted">Pages</span>
            <input
              type="number" min={1} max={100} value={maxPages}
              onChange={e => setMaxPages(parseInt(e.target.value) || 10)}
              className="w-16"
            />
          </label>
          <button
            onClick={handleScanCR}
            disabled={scanning || !token}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider
                       bg-accent-bg text-accent border border-accent-dark rounded-md
                       hover:bg-accent-dark/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RefreshCw size={12} className={scanning === 'cr' ? 'animate-spin' : ''} />
            {scanning === 'cr' && scanProgress ? `Page ${scanProgress.page}/${scanProgress.maxPages}` : scanning === 'cr' ? 'Scanning...' : 'CryptoRank'}
          </button>
          <button
            onClick={handleScanICO}
            disabled={!!scanning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider
                       bg-bg-elevated text-fg-muted border border-border rounded-md
                       hover:text-fg hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RefreshCw size={12} className={scanning === 'ico' ? 'animate-spin' : ''} />
            {scanning === 'ico' && scanProgress ? `Page ${scanProgress.page}/${scanProgress.maxPages}` : scanning === 'ico' ? 'Scanning...' : 'ICO Analytics'}
          </button>
        </div>

        <p className="text-[10px] text-fg-subtle">
          CryptoRank needs a Bearer token. ICO Analytics is free and also enriches existing projects with tags, raise amounts & investors.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={e => setShowDeleted(e.target.checked)}
          />
          Show deleted
        </label>
        <span className="text-xs text-fg-subtle font-mono">{projects.length} projects</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-fg-subtle text-sm">
          <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse mr-2" />
          Loading...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-fg-subtle text-sm">
          No projects yet. Run a scan to fetch funding rounds.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-semibold text-fg-muted
                      ${col.sortable ? 'cursor-pointer hover:text-fg select-none' : ''}`}
                  >
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <span className="text-accent ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map(p => (
                <ProjectRow
                  key={p.key}
                  project={p}
                  onUpdate={updateProject}
                  onDelete={deleteProject}
                  onRestore={restoreProject}
                  onSend={handleSend}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProjectRow({ project: p, onUpdate, onDelete, onRestore, onSend }) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(p.notes || '')
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const notesRef = useRef(null)
  const tagRef = useRef(null)

  useEffect(() => { setNotes(p.notes || '') }, [p.notes])

  const saveNotes = () => {
    setEditingNotes(false)
    if (notes !== p.notes) onUpdate(p.key, { notes })
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    onUpdate(p.key, { custom_tags: [...(p.custom_tags || []), tag] })
    setTagInput('')
    setShowTagInput(false)
  }

  const removeTag = (idx) => {
    onUpdate(p.key, { custom_tags: p.custom_tags.filter((_, i) => i !== idx) })
  }

  useEffect(() => { if (showTagInput && tagRef.current) tagRef.current.focus() }, [showTagInput])
  useEffect(() => { if (editingNotes && notesRef.current) notesRef.current.focus() }, [editingNotes])

  const isDeleted = p.deleted
  const investors = Array.isArray(p.investors) ? p.investors : []

  return (
    <tr className={`group hover:bg-bg-hover/50 transition-colors ${isDeleted ? 'opacity-40' : ''}`}>
      {/* Project */}
      <td className="px-3 py-2.5 max-w-[200px]">
        <div className="flex items-center gap-2">
          {p.logo_url && (
            <img src={p.logo_url} alt="" className="w-5 h-5 rounded shrink-0"
              onError={e => { e.target.style.display = 'none' }} />
          )}
          <div className="min-w-0">
            <a
              href={p.cryptorank_url || `https://cryptorank.io/ico/${p.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium truncate block"
            >
              {p.name}
            </a>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-fg-subtle">
              {p.symbol && <span className="text-fg-muted">{p.symbol}</span>}
              {p.category && <span>{typeof p.category === 'object' ? p.category.name || '' : p.category}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Stage */}
      <td className="px-3 py-2.5">
        <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase
                         bg-bg-elevated border border-border rounded">
          {p.funding_stage || '—'}
        </span>
      </td>

      {/* Date */}
      <td className="px-3 py-2.5 font-mono text-fg-muted whitespace-nowrap">
        {formatDate(p.funding_date)}
      </td>

      {/* Raised */}
      <td className="px-3 py-2.5 font-mono text-fg-muted whitespace-nowrap">
        {formatMoney(p.funding_raise)}
      </td>

      {/* Valuation */}
      <td className="px-3 py-2.5 font-mono text-fg-muted whitespace-nowrap">
        {formatMoney(p.funding_valuation)}
      </td>

      {/* Investors */}
      <td className="px-3 py-2.5 max-w-[180px]">
        <div className="flex flex-wrap gap-1">
          {investors.slice(0, 3).map((inv, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] text-fg-muted
                                     bg-bg-elevated px-1.5 py-0.5 rounded border border-border">
              {inv.name}
              {inv.isLead && <span className="text-accent text-[8px]">L</span>}
            </span>
          ))}
          {investors.length > 3 && (
            <span className="text-[10px] text-fg-subtle">+{investors.length - 3}</span>
          )}
        </div>
      </td>

      {/* Tags */}
      <td className="px-3 py-2.5 max-w-[160px]">
        <div className="flex flex-wrap gap-1 items-center">
          {(p.original_tags || []).map((tag, i) => (
            <span key={`o-${i}`} className="text-[10px] px-1.5 py-0.5 bg-accent-bg text-accent rounded">
              {tag}
            </span>
          ))}
          {(p.custom_tags || []).map((tag, i) => (
            <span key={`c-${i}`} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5
                                            bg-bg-elevated text-fg-muted rounded border border-border">
              {tag}
              <button onClick={() => removeTag(i)} className="hover:text-red-400"><X size={8} /></button>
            </span>
          ))}
          {showTagInput ? (
            <input
              ref={tagRef}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addTag()
                if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') }
              }}
              onBlur={() => { if (!tagInput) setShowTagInput(false) }}
              className="w-16 !px-1 !py-0.5 text-[10px]"
              placeholder="tag"
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="w-4 h-4 flex items-center justify-center text-fg-subtle hover:text-accent
                         border border-border rounded hover:border-accent-dark transition-colors"
            >
              <Plus size={8} />
            </button>
          )}
        </div>
      </td>

      {/* Notes */}
      <td className="px-3 py-2.5 max-w-[180px]">
        {editingNotes ? (
          <textarea
            ref={notesRef}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={e => { if (e.key === 'Escape') saveNotes() }}
            rows={2}
            className="w-full !text-[10px] !px-2 !py-1"
          />
        ) : (
          <div
            onClick={() => setEditingNotes(true)}
            className="text-[10px] text-fg-muted cursor-pointer hover:text-fg truncate"
            title="Click to edit"
          >
            {notes || <span className="text-fg-subtle italic">add notes...</span>}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDeleted && (
            <button
              onClick={() => onSend(p)}
              title="Send to Research"
              className="p-1 text-fg-subtle hover:text-accent transition-colors"
            >
              <Send size={12} />
            </button>
          )}
          {isDeleted ? (
            <button
              onClick={() => onRestore(p.key)}
              title="Restore"
              className="p-1 text-fg-subtle hover:text-accent transition-colors"
            >
              <RotateCcw size={12} />
            </button>
          ) : (
            <button
              onClick={() => onDelete(p.key)}
              title="Remove"
              className="p-1 text-fg-subtle hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
