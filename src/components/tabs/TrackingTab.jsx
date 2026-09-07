import { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Tag as TagIcon,
  Layers,
  ExternalLink,
  Pencil,
  Info,
  Trash2,
  X as XIcon
} from 'lucide-react'
import Button from '../ui/Button'
import Tag from '../ui/Tag'
import DropdownMenu from '../ui/DropdownMenu'
import EditTrackingModal from '../modals/EditTrackingModal'
import DetailsModal from '../modals/DetailsModal'
import TagManagerModal from '../modals/TagManagerModal'
import StageManagerModal from '../modals/StageManagerModal'
import { formatDate } from '../../lib/utils'

export default function TrackingTab({ store }) {
  const {
    tags,
    stages,
    tracking,
    research,
    createTag,
    updateTag,
    deleteTag,
    createStage,
    updateStage,
    deleteStage,
    createTracking,
    updateTracking,
    deleteTracking
  } = store

  const [search, setSearch] = useState('')
  const [activeTagFilters, setActiveTagFilters] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [detailsRow, setDetailsRow] = useState(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [stageManagerOpen, setStageManagerOpen] = useState(false)

  const tagsById = useMemo(() => {
    const m = new Map()
    tags.forEach((t) => m.set(t.id, t))
    return m
  }, [tags])

  const stagesById = useMemo(() => {
    const m = new Map()
    stages.forEach((s) => m.set(s.id, s))
    return m
  }, [stages])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tracking.filter((row) => {
      // tag filter
      if (activeTagFilters.length > 0) {
        const has = activeTagFilters.every((id) => (row.tag_ids || []).includes(id))
        if (!has) return false
      }
      if (!q) return true
      // search by name, notes, tag name, or stage name
      if (row.project_name?.toLowerCase().includes(q)) return true
      if (row.notes?.toLowerCase().includes(q)) return true
      if ((row.tag_ids || []).some((id) => tagsById.get(id)?.name?.toLowerCase().includes(q)))
        return true
      if (row.stage_id && stagesById.get(row.stage_id)?.name?.toLowerCase().includes(q))
        return true
      return false
    })
  }, [tracking, search, activeTagFilters, tagsById, stagesById])

  const toggleTagFilter = (id) =>
    setActiveTagFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handleSave = async (payload) => {
    if (editing && editing !== 'new') {
      await updateTracking(editing.id, payload)
    } else {
      await createTracking(payload)
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
            placeholder="Search by project, note, or tag…"
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
        <Button variant="default" onClick={() => setStageManagerOpen(true)}>
          <Layers size={14} /> Manage stages
        </Button>
        <Button variant="default" onClick={() => setTagManagerOpen(true)}>
          <TagIcon size={14} /> Manage tags
        </Button>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={14} /> New entry
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-fg-subtle mr-1">
            Filter:
          </span>
          {tags.map((t) => {
            const active = activeTagFilters.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTagFilter(t.id)}
                className={`transition-opacity ${active ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
              >
                <Tag name={t.name} color={t.color} size="sm" />
              </button>
            )
          })}
          {activeTagFilters.length > 0 && (
            <button
              onClick={() => setActiveTagFilters([])}
              className="text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg ml-1"
            >
              clear
            </button>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-bg-surface/60">
        <div className="grid grid-cols-[2fr_2fr_1.5fr_2fr_120px_60px] px-4 py-2.5 text-[10px] uppercase tracking-wider text-fg-subtle border-b border-border bg-bg-elevated/40">
          <div>Project</div>
          <div>Link</div>
          <div>Tags</div>
          <div>Notes</div>
          <div>Last interaction</div>
          <div className="text-right pr-2">Actions</div>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-subtle">
            {tracking.length === 0
              ? 'No tracking entries yet — add one with "New entry".'
              : 'No matches.'}
          </div>
        )}

        {filtered.map((row) => {
          const rowTags = (row.tag_ids || []).map((id) => tagsById.get(id)).filter(Boolean)
          const stage = row.stage_id ? stagesById.get(row.stage_id) : null
          const wallets = Array.isArray(row.wallet_notes) ? row.wallet_notes : []
          return (
            <div
              key={row.id}
              className="grid grid-cols-[2fr_2fr_1.5fr_2fr_120px_60px] px-4 py-3 text-sm border-b border-border/60 last:border-b-0 hover:bg-bg-elevated/40 transition-colors items-start"
            >
              <div className="font-medium pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{row.project_name}</span>
                  {stage && <Tag name={stage.name} color={stage.color} size="sm" />}
                </div>
                {wallets.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {wallets.map((w, i) => (
                      <div key={w.id || i} className="text-[11px] text-fg-muted leading-snug">
                        <span className="text-accent font-mono">{w.wallet || '—'}</span>
                        {w.note && <span className="ml-1.5 text-fg-subtle">{w.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pr-3 truncate">
                {row.link ? (
                  <a
                    href={row.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:text-accent-muted transition-colors text-xs truncate max-w-full"
                  >
                    <span className="truncate">{prettyUrl(row.link)}</span>
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-fg-subtle text-xs">—</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pr-3">
                {rowTags.length > 0 ? (
                  rowTags.map((t) => <Tag key={t.id} name={t.name} color={t.color} size="sm" />)
                ) : (
                  <span className="text-fg-subtle text-xs">—</span>
                )}
              </div>
              <div className="pr-3 text-xs text-fg-muted leading-relaxed line-clamp-3">
                {row.notes || <span className="text-fg-subtle">—</span>}
              </div>
              <div className="text-xs text-fg-muted font-mono">
                {formatDate(row.last_interaction)}
              </div>
              <div className="flex justify-end">
                <DropdownMenu
                  items={[
                    {
                      label: 'Details',
                      icon: <Info size={12} />,
                      onClick: () => setDetailsRow(row)
                    },
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
                        if (confirm(`Delete "${row.project_name}" from tracking?`)) {
                          deleteTracking(row.id)
                        }
                      }
                    }
                  ]}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-[10px] text-fg-subtle font-mono pl-1">
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        {filtered.length !== tracking.length && ` of ${tracking.length}`}
      </div>

      <EditTrackingModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        initial={editing && editing !== 'new' ? editing : null}
        tags={tags}
        stages={stages}
        onSave={handleSave}
      />

      <DetailsModal
        open={Boolean(detailsRow)}
        onClose={() => setDetailsRow(null)}
        tracking={detailsRow}
        research={research}
      />

      <TagManagerModal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        tags={tags}
        onCreate={createTag}
        onUpdate={updateTag}
        onDelete={deleteTag}
      />

      <StageManagerModal
        open={stageManagerOpen}
        onClose={() => setStageManagerOpen(false)}
        stages={stages}
        onCreate={createStage}
        onUpdate={updateStage}
        onDelete={deleteStage}
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
