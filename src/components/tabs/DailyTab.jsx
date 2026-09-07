import { useMemo, useState } from 'react'
import {
  Plus,
  Wallet as WalletIcon,
  ExternalLink,
  Pencil,
  Trash2
} from 'lucide-react'
import Button from '../ui/Button'
import DropdownMenu from '../ui/DropdownMenu'
import EditDailyTaskModal from '../modals/EditDailyTaskModal'
import DailyWalletManagerModal from '../modals/DailyWalletManagerModal'

export default function DailyTab({ store }) {
  const {
    dailyWallets,
    dailyTasks,
    dailyChecks,
    today,
    createDailyWallet,
    updateDailyWallet,
    deleteDailyWallet,
    createDailyTask,
    updateDailyTask,
    deleteDailyTask,
    toggleDailyCheck
  } = store

  const [editing, setEditing] = useState(null) // null | 'new' | row
  const [walletManagerOpen, setWalletManagerOpen] = useState(false)

  // Fast lookup: which (task, wallet) pairs are checked today
  const checkedSet = useMemo(() => {
    const s = new Set()
    for (const c of dailyChecks) {
      if (c.check_date === today) {
        s.add(`${c.task_id}:${c.wallet_id}`)
      }
    }
    return s
  }, [dailyChecks, today])

  // Per-row progress: how many wallets ticked vs total
  const progressByTask = useMemo(() => {
    const m = new Map()
    for (const t of dailyTasks) {
      let done = 0
      for (const w of dailyWallets) {
        if (checkedSet.has(`${t.id}:${w.id}`)) done++
      }
      m.set(t.id, { done, total: dailyWallets.length })
    }
    return m
  }, [dailyTasks, dailyWallets, checkedSet])

  // Total daily completion across all tasks/wallets
  const totalChecks = dailyTasks.length * dailyWallets.length
  const doneChecks = checkedSet.size
  const pct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0

  const handleSave = async (payload) => {
    if (editing && editing !== 'new') {
      await updateDailyTask(editing.id, payload)
    } else {
      await createDailyTask(payload)
    }
  }

  // Grid template: link | notes | other_notes | N wallet cols | actions
  const gridTemplate = `minmax(220px, 2fr) minmax(160px, 1.5fr) minmax(140px, 1fr) ${dailyWallets
    .map(() => '88px')
    .join(' ')} 56px`

  // Pretty date label for the header
  const dateLabel = useMemo(() => {
    const d = new Date(today + 'T12:00:00') // noon to avoid TZ edge cases
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'short'
    })
  }, [today])

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
              {dateLabel}
            </div>
            <div className="text-xs font-mono text-fg-muted">
              <span className="text-accent">{doneChecks}</span> / {totalChecks} ticked
              {totalChecks > 0 && (
                <span className="text-fg-subtle ml-2">· {pct}%</span>
              )}
            </div>
          </div>
          {totalChecks > 0 && (
            <div className="flex-1 max-w-[260px] h-1 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
        <Button variant="default" onClick={() => setWalletManagerOpen(true)}>
          <WalletIcon size={14} /> Manage wallets
        </Button>
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={14} /> New task
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-bg-surface/60">
        {/* Header */}
        <div
          className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-fg-subtle border-b border-border bg-bg-elevated/40 grid items-center gap-x-2"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div>Link</div>
          <div>Notes</div>
          <div>Other notes</div>
          {dailyWallets.map((w) => (
            <div
              key={w.id}
              className="text-center font-mono text-fg-muted normal-case tracking-normal"
              title={w.label}
            >
              {w.label}
            </div>
          ))}
          <div className="text-right pr-2">Actions</div>
        </div>

        {/* Rows */}
        {dailyTasks.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-fg-subtle">
            No daily tasks yet — add one with "New task".
            {dailyWallets.length === 0 && (
              <div className="mt-2 text-[11px]">
                Start by adding at least one wallet via "Manage wallets".
              </div>
            )}
          </div>
        )}

        {dailyTasks.map((task) => {
          const progress = progressByTask.get(task.id)
          const allDone =
            progress && progress.total > 0 && progress.done === progress.total
          return (
            <div
              key={task.id}
              className={`px-4 py-3 text-sm border-b border-border/60 last:border-b-0 hover:bg-bg-elevated/40 transition-colors grid items-center gap-x-2 ${
                allDone ? 'opacity-60' : ''
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {/* Link */}
              <div className="pr-3 truncate">
                {task.link ? (
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:text-accent-muted transition-colors text-xs truncate max-w-full"
                  >
                    <span className={`truncate ${allDone ? 'line-through' : ''}`}>
                      {prettyUrl(task.link)}
                    </span>
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-fg-subtle text-xs">—</span>
                )}
              </div>

              {/* Notes */}
              <div className="text-xs text-fg-muted pr-3 leading-snug line-clamp-2">
                {task.notes || <span className="text-fg-subtle">—</span>}
              </div>

              {/* Other notes */}
              <div className="text-xs text-fg-muted pr-3 leading-snug line-clamp-2">
                {task.other_notes || <span className="text-fg-subtle">—</span>}
              </div>

              {/* Wallet checkboxes */}
              {dailyWallets.map((wallet) => {
                const key = `${task.id}:${wallet.id}`
                const checked = checkedSet.has(key)
                return (
                  <div key={wallet.id} className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        toggleDailyCheck(task.id, wallet.id).catch((err) =>
                          alert(err.message || String(err))
                        )
                      }}
                      aria-label={`Check ${wallet.label} for this task`}
                      className="w-5 h-5"
                    />
                  </div>
                )
              })}

              {/* Actions */}
              <div className="flex justify-end">
                <DropdownMenu
                  items={[
                    {
                      label: 'Edit',
                      icon: <Pencil size={12} />,
                      onClick: () => setEditing(task)
                    },
                    {
                      label: 'Delete',
                      icon: <Trash2 size={12} />,
                      danger: true,
                      onClick: () => {
                        if (
                          confirm(
                            `Delete this daily task?\nAll historical checks for it will be removed.`
                          )
                        ) {
                          deleteDailyTask(task.id)
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
        {dailyTasks.length} {dailyTasks.length === 1 ? 'task' : 'tasks'}
        {dailyWallets.length > 0 && ` · ${dailyWallets.length} wallets`}
        <span className="text-fg-subtle ml-2">
          · resets at 01:00 local · today: {today}
        </span>
      </div>

      <EditDailyTaskModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        initial={editing && editing !== 'new' ? editing : null}
        onSave={handleSave}
      />

      <DailyWalletManagerModal
        open={walletManagerOpen}
        onClose={() => setWalletManagerOpen(false)}
        wallets={dailyWallets}
        onCreate={createDailyWallet}
        onUpdate={updateDailyWallet}
        onDelete={deleteDailyWallet}
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
