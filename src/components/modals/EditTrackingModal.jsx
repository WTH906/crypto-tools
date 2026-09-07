import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Field from '../ui/Field'
import Tag from '../ui/Tag'
import { nanoid } from '../../lib/utils'

const emptyForm = () => ({
  project_name: '',
  link: '',
  notes: '',
  wallet_notes: [{ id: nanoid(), wallet: '', note: '' }],
  tag_ids: [],
  stage_id: null,
  last_interaction: ''
})

export default function EditTrackingModal({ open, onClose, initial, tags, stages, onSave }) {
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          project_name: initial.project_name || '',
          link: initial.link || '',
          notes: initial.notes || '',
          wallet_notes:
            Array.isArray(initial.wallet_notes) && initial.wallet_notes.length > 0
              ? initial.wallet_notes.map((w) => ({
                  id: w.id || nanoid(),
                  wallet: w.wallet || '',
                  note: w.note || ''
                }))
              : [{ id: nanoid(), wallet: '', note: '' }],
          tag_ids: initial.tag_ids || [],
          stage_id: initial.stage_id || null,
          last_interaction: initial.last_interaction || ''
        })
      } else {
        setForm(emptyForm())
      }
      setError(null)
    }
  }, [open, initial])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const addWallet = () =>
    update({
      wallet_notes: [...form.wallet_notes, { id: nanoid(), wallet: '', note: '' }]
    })

  const removeWallet = (id) => {
    if (form.wallet_notes.length === 1) return
    update({ wallet_notes: form.wallet_notes.filter((w) => w.id !== id) })
  }

  const updateWallet = (id, key, value) =>
    update({
      wallet_notes: form.wallet_notes.map((w) =>
        w.id === id ? { ...w, [key]: value } : w
      )
    })

  const toggleTag = (tagId) => {
    update({
      tag_ids: form.tag_ids.includes(tagId)
        ? form.tag_ids.filter((id) => id !== tagId)
        : [...form.tag_ids, tagId]
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.project_name.trim()) {
      setError('Project name is required')
      return
    }
    try {
      const payload = {
        project_name: form.project_name.trim(),
        link: form.link.trim(),
        notes: form.notes,
        wallet_notes: form.wallet_notes.filter((w) => w.wallet || w.note),
        tag_ids: form.tag_ids,
        stage_id: form.stage_id || null,
        last_interaction: form.last_interaction || null
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const selectedTags = tags.filter((t) => form.tag_ids.includes(t.id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit tracking entry' : 'New tracking entry'}
      size="lg"
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
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project name">
            <input
              value={form.project_name}
              onChange={(e) => update({ project_name: e.target.value })}
              className="w-full"
              autoFocus
            />
          </Field>
          <Field label="Link">
            <input
              value={form.link}
              onChange={(e) => update({ link: e.target.value })}
              placeholder="https://"
              className="w-full"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Last interaction">
            <input
              type="date"
              value={form.last_interaction || ''}
              onChange={(e) => update({ last_interaction: e.target.value })}
              className="w-full"
            />
          </Field>
          <Field label="Stage" hint={stages.length === 0 ? 'No stages yet — create some via "Manage stages".' : undefined}>
            <select
              value={form.stage_id || ''}
              onChange={(e) => update({ stage_id: e.target.value || null })}
              className="w-full"
              disabled={stages.length === 0}
            >
              <option value="">— None —</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tags">
          <div className="relative">
            <button
              type="button"
              onClick={() => setTagPickerOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm hover:border-border-strong transition-colors"
            >
              <span className="flex flex-wrap gap-1 items-center">
                {selectedTags.length === 0 ? (
                  <span className="text-fg-subtle text-xs">Select tags…</span>
                ) : (
                  selectedTags.map((t) => <Tag key={t.id} name={t.name} color={t.color} size="sm" />)
                )}
              </span>
              <ChevronDown size={14} className="text-fg-muted" />
            </button>
            {tagPickerOpen && (
              <div className="absolute z-20 mt-1 w-full bg-bg-surface border border-border rounded-md shadow-xl max-h-56 overflow-y-auto p-2">
                {tags.length === 0 && (
                  <div className="text-xs text-fg-subtle p-2 text-center">
                    No tags yet — create some via "Manage tags".
                  </div>
                )}
                {tags.map((t) => {
                  const checked = form.tag_ids.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        checked ? 'bg-accent-bg/50' : 'hover:bg-bg-elevated'
                      }`}
                    >
                      <input type="checkbox" checked={checked} readOnly />
                      <Tag name={t.name} color={t.color} size="sm" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={3}
            className="w-full resize-y"
            placeholder="General notes about this project…"
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-fg-muted">
              Wallets & per-wallet notes
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={addWallet}>
              <Plus size={12} /> Add wallet
            </Button>
          </div>
          <div className="space-y-2">
            {form.wallet_notes.map((w, i) => (
              <div
                key={w.id}
                className="grid grid-cols-[120px_1fr_auto] gap-2 items-start"
              >
                <input
                  value={w.wallet}
                  onChange={(e) => updateWallet(w.id, 'wallet', e.target.value)}
                  placeholder={i === 0 ? 'main' : '0xb…'}
                  className="w-full"
                />
                <input
                  value={w.note}
                  onChange={(e) => updateWallet(w.id, 'note', e.target.value)}
                  placeholder="Wallet-specific notes…"
                  className="w-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => removeWallet(w.id)}
                  disabled={form.wallet_notes.length === 1}
                  aria-label="Remove wallet"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
