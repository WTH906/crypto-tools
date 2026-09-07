import { useState } from 'react'
import { Plus, Trash2, Check, Pencil, X as XIcon, Wallet } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Field from '../ui/Field'

export default function DailyWalletManagerModal({
  open,
  onClose,
  wallets,
  onCreate,
  onUpdate,
  onDelete
}) {
  const [label, setLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [error, setError] = useState(null)

  const reset = () => {
    setLabel('')
    setError(null)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!label.trim()) return
    try {
      await onCreate({ label: label.trim() })
      reset()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const startEdit = (w) => {
    setEditingId(w.id)
    setEditLabel(w.label)
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
  }
  const saveEdit = async () => {
    if (!editLabel.trim()) return
    try {
      await onUpdate(editingId, { label: editLabel.trim() })
      cancelEdit()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage daily wallets" size="md">
      <p className="text-[11px] text-fg-subtle mb-4 leading-relaxed">
        Each wallet adds a checkbox column to the Daily table. Deleting a wallet
        removes its check history.
      </p>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-[1fr_auto] gap-2 mb-5 items-end"
      >
        <Field label="Wallet label" hint="e.g. 0xb, 0xe, main, hot">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="0xb"
            className="w-full"
          />
        </Field>
        <Button type="submit" variant="primary" size="md" disabled={!label.trim()}>
          <Plus size={14} /> Add
        </Button>
      </form>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        {wallets.length === 0 && (
          <div className="text-xs text-fg-subtle py-6 text-center border border-dashed border-border rounded-md">
            No wallets yet — add your first one above.
          </div>
        )}
        {wallets.map((w) => {
          const editing = editingId === w.id
          return (
            <div
              key={w.id}
              className="flex items-center gap-2 px-3 py-2 bg-bg-elevated/40 border border-border rounded-md hover:border-border-strong transition-colors"
            >
              <Wallet size={14} className="text-accent shrink-0" />
              {editing ? (
                <>
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 !py-1.5 text-xs"
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={saveEdit}>
                    <Check size={12} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <XIcon size={12} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-mono">{w.label}</span>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(w)}>
                    <Pencil size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete wallet "${w.label}"?\nAll check history for this wallet will be lost.`
                        )
                      ) {
                        onDelete(w.id)
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
