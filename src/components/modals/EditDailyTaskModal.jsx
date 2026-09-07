import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Field from '../ui/Field'

const empty = () => ({ link: '', notes: '', other_notes: '' })

export default function EditDailyTaskModal({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(empty())
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              link: initial.link || '',
              notes: initial.notes || '',
              other_notes: initial.other_notes || ''
            }
          : empty()
      )
      setError(null)
    }
  }, [open, initial])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.link.trim() && !form.notes.trim()) {
      setError('Add at least a link or a note.')
      return
    }
    try {
      await onSave({
        link: form.link.trim(),
        notes: form.notes,
        other_notes: form.other_notes
      })
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit daily task' : 'New daily task'}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} type="button">
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-3">
        <Field label="Link">
          <input
            value={form.link}
            onChange={(e) => update({ link: e.target.value })}
            className="w-full"
            placeholder="https://"
            autoFocus
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={2}
            className="w-full resize-y"
            placeholder="Quick reminder, what to do…"
          />
        </Field>

        <Field label="Other notes">
          <textarea
            value={form.other_notes}
            onChange={(e) => update({ other_notes: e.target.value })}
            rows={2}
            className="w-full resize-y"
          />
        </Field>

        {error && (
          <div className="px-3 py-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
