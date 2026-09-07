import { useState } from 'react'
import { Plus, Trash2, Check, Pencil, X as XIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Field from '../ui/Field'
import Tag from '../ui/Tag'

const DEFAULT_COLOR = '#4ade80'

export default function TagManagerModal({ open, onClose, tags, onCreate, onUpdate, onDelete }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(DEFAULT_COLOR)
  const [error, setError] = useState(null)

  const reset = () => {
    setName('')
    setColor(DEFAULT_COLOR)
    setError(null)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await onCreate({ name: name.trim(), color })
      reset()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditColor(t.color)
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor(DEFAULT_COLOR)
  }
  const saveEdit = async () => {
    if (!editName.trim()) return
    try {
      await onUpdate(editingId, { name: editName.trim(), color: editColor })
      cancelEdit()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Tags" size="md">
      <form onSubmit={handleCreate} className="grid grid-cols-[1fr_auto_auto] gap-2 mb-5 items-end">
        <Field label="Tag name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. bridge, perps, testnet"
            className="w-full"
          />
        </Field>
        <Field label="Color (hex)">
          <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-md pl-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer rounded"
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-24 border-0 bg-transparent !p-1.5 text-xs"
              placeholder="#4ade80"
            />
          </div>
        </Field>
        <Button type="submit" variant="primary" size="md" disabled={!name.trim()}>
          <Plus size={14} /> Add
        </Button>
      </form>

      {error && (
        <div className="mb-3 px-3 py-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        {tags.length === 0 && (
          <div className="text-xs text-fg-subtle py-6 text-center border border-dashed border-border rounded-md">
            No tags yet — add your first one above.
          </div>
        )}
        {tags.map((t) => {
          const editing = editingId === t.id
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 px-3 py-2 bg-bg-elevated/40 border border-border rounded-md hover:border-border-strong transition-colors"
            >
              {editing ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer rounded shrink-0"
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 !py-1.5 text-xs"
                  />
                  <input
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-24 !py-1.5 text-xs"
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
                  <div className="flex-1">
                    <Tag name={t.name} color={t.color} />
                  </div>
                  <span className="text-[10px] text-fg-subtle font-mono">{t.color}</span>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                    <Pencil size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Delete tag "${t.name}"?`)) onDelete(t.id)
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
