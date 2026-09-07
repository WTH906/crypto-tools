import { useMemo, useState } from 'react'
import { Search, Plus, ExternalLink, Pencil, Trash2, X as XIcon } from 'lucide-react'
import Button from '../ui/Button'
import DropdownMenu from '../ui/DropdownMenu'
import EditProjectModal from '../modals/EditProjectModal'
import { formatDate } from '../../lib/utils'

export default function WorkingTab({ store }) {
  const { working, createWorking, updateWorking, deleteWorking } = store

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return working
    return working.filter((row) =>
      [row.name, row.category, row.short_description, row.actual_stage]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(q))
    )
  }, [working, search])

  const handleSave = async (payload) => {
    if (editing && editing !== 'new') {
      await updateWorking(editing.id, payload)
    } else {
      await createWorking(payload)
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
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={14} /> New project
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-bg-surface/60">
        <div className="grid grid-cols-[2fr_1fr_100px_1fr_2fr_2fr_120px_60px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-fg-subtle border-b border-border bg-bg-elevated/40">
          <div>Name</div>
          <div>Category</div>
          <div>Last Fund</div>
          <div>Stage</div>
          <div>How to farm</div>
          <div>Notes</div>
          <div>Fundraising</div>
          <div className="text-right pr-2">Actions</div>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-subtle">
            {working.length === 0
              ? 'No working projects yet — tick "Track" on a research project, or add one directly.'
              : 'No matches.'}
          </div>
        )}

        {filtered.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[2fr_1fr_100px_1fr_2fr_2fr_120px_60px] px-4 py-3 text-sm border-b border-border/60 last:border-b-0 hover:bg-bg-elevated/40 transition-colors items-start"
          >
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
            <div className="text-xs text-fg-muted pr-3 leading-relaxed line-clamp-3">
              {row.how_to_farm || <span className="text-fg-subtle">—</span>}
            </div>
            <div className="text-xs text-fg-muted pr-3 leading-relaxed line-clamp-3">
              {row.additional_notes || <span className="text-fg-subtle">—</span>}
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
                      if (confirm(`Delete "${row.name}" from working?`)) {
                        deleteWorking(row.id)
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
        {filtered.length !== working.length && ` of ${working.length}`}
      </div>

      <EditProjectModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        initial={editing && editing !== 'new' ? editing : null}
        onSave={handleSave}
        title="Working project"
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
