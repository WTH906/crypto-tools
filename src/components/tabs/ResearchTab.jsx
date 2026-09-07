import { useMemo, useState } from 'react'
import { Search, Plus, Upload, ExternalLink, Pencil, Trash2, X as XIcon } from 'lucide-react'
import Button from '../ui/Button'
import DropdownMenu from '../ui/DropdownMenu'
import EditProjectModal from '../modals/EditProjectModal'
import ImportXlsxModal from '../modals/ImportXlsxModal'
import { formatDate } from '../../lib/utils'

export default function ResearchTab({ store }) {
  const {
    research,
    createResearch,
    updateResearch,
    deleteResearch,
    bulkCreateResearch,
    previewResearchImport,
    addResearchToTracking,
    removeResearchFromTracking
  } = store

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [importOpen, setImportOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return research
    return research.filter((row) =>
      [row.name, row.category, row.short_description, row.actual_stage]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q))
    )
  }, [research, search])

  const handleSave = async (payload) => {
    if (editing && editing !== 'new') {
      await updateResearch(editing.id, payload)
    } else {
      await createResearch(payload)
    }
  }

  const onToggleAddToTracking = async (row) => {
    setBusyId(row.id)
    try {
      if (row.in_working) {
        if (
          confirm(
            `"${row.name}" is in the Working & Tracking tabs.\nUnchecking will remove those linked entries.\n\nProceed?`
          )
        ) {
          await removeResearchFromTracking(row)
        }
      } else {
        await addResearchToTracking(row)
      }
    } catch (err) {
      alert(err.message || String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[280px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, stage…"
            className="w-full pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg p-1"
              aria-label="Clear search"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
        <Button variant="default" onClick={() => setImportOpen(true)}>
          <Upload size={14} /> Import XLSX
        </Button>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={14} /> New project
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-bg-surface/60">
        <div className="grid grid-cols-[80px_2fr_1fr_100px_1fr_2fr_120px_60px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-fg-subtle border-b border-border bg-bg-elevated/40">
          <div>Track</div>
          <div>Name</div>
          <div>Category</div>
          <div>Last Fund</div>
          <div>Stage</div>
          <div>Description</div>
          <div>Fundraising</div>
          <div className="text-right pr-2">Actions</div>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-subtle">
            {research.length === 0
              ? 'No research projects yet — add one with "New project".'
              : 'No matches.'}
          </div>
        )}

        {filtered.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[80px_2fr_1fr_100px_1fr_2fr_120px_60px] px-4 py-3 text-sm border-b border-border/60 last:border-b-0 hover:bg-bg-elevated/40 transition-colors items-start"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!row.in_working}
                disabled={busyId === row.id}
                onChange={() => onToggleAddToTracking(row)}
                aria-label={row.in_working ? 'Remove from tracking' : 'Add to tracking'}
              />
              {busyId === row.id && (
                <span className="text-[10px] text-accent animate-pulse">…</span>
              )}
            </div>
            <div className="pr-3">
              <div className="font-medium">{row.name}</div>
              {row.link && (
                <a
                  href={row.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-muted transition-colors mt-0.5"
                >
                  <span className="truncate max-w-[200px]">{prettyUrl(row.link)}</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div className="text-xs text-fg-muted pr-3 truncate">
              {row.category || <span className="text-fg-subtle">—</span>}
            </div>
            <div className="text-xs text-fg-muted font-mono">
              {formatDate(row.last_fund_date)}
            </div>
            <div className="text-xs text-fg-muted pr-3">
              {row.actual_stage || <span className="text-fg-subtle">—</span>}
            </div>
            <div className="text-xs text-fg-muted pr-3 leading-relaxed line-clamp-2">
              {row.short_description || <span className="text-fg-subtle">—</span>}
            </div>
            <div className="text-xs font-mono text-accent">
              {row.fundraising_amount || <span className="text-fg-subtle">—</span>}
            </div>
            <div className="flex justify-end">
              <DropdownMenu
                items={[
                  {
                    label: 'Edit',
                    icon: <Pencil size={12} />,
                    onClick: () => setEditing(row)
                  },
                  {
                    label: 'Delete',
                    icon: <Trash2 size={12} />,
                    danger: true,
                    onClick: () => {
                      if (
                        confirm(
                          `Delete "${row.name}" from research?${row.in_working ? '\n\nNote: linked Working/Tracking entries will keep their data but lose the link.' : ''}`
                        )
                      ) {
                        deleteResearch(row.id)
                      }
                    }
                  }
                ]}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-fg-subtle font-mono pl-1">
        {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
        {filtered.length !== research.length && ` of ${research.length}`}
      </div>

      <EditProjectModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        initial={editing && editing !== 'new' ? editing : null}
        onSave={handleSave}
        title="Research project"
      />

      <ImportXlsxModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPreview={previewResearchImport}
        onImport={bulkCreateResearch}
      />
    </div>
  )
}

function prettyUrl(url) {
  try {
    const u = new URL(url)
    return u.host.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return url
  }
}
