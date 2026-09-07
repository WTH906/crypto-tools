import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Field from '../ui/Field'

const STAGES = [
  '',
  'Pre Seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Strategic',
  'Already has a token',
  'Unknown'
]

const emptyForm = () => ({
  name: '',
  category: '',
  last_fund_date: '',
  link: '',
  short_description: '',
  actual_stage: '',
  fundraising_amount: '',
  how_to_farm: '',
  additional_notes: ''
})

export default function EditProjectModal({ open, onClose, initial, onSave, title = 'Project' }) {
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name || '',
          category: initial.category || '',
          last_fund_date: initial.last_fund_date || '',
          link: initial.link || '',
          short_description: initial.short_description || '',
          actual_stage: initial.actual_stage || '',
          fundraising_amount: initial.fundraising_amount || '',
          how_to_farm: initial.how_to_farm || '',
          additional_notes: initial.additional_notes || ''
        })
      } else {
        setForm(emptyForm())
      }
      setError(null)
    }
  }, [open, initial])

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category.trim(),
        last_fund_date: form.last_fund_date || null,
        link: form.link.trim(),
        short_description: form.short_description,
        actual_stage: form.actual_stage,
        fundraising_amount: form.fundraising_amount.trim(),
        how_to_farm: form.how_to_farm,
        additional_notes: form.additional_notes
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
      title={initial ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`}
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
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full"
              autoFocus
            />
          </Field>
          <Field label="Category" hint="Free text — e.g. DEX, Staking, Bridge…">
            <input
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="w-full"
              placeholder="e.g. DEX, Bridge, Launchpad"
            />
          </Field>
        </div>

        <Field label="Link">
          <input
            value={form.link}
            onChange={(e) => update({ link: e.target.value })}
            className="w-full"
            placeholder="https://"
          />
        </Field>

        <Field label="Short description">
          <textarea
            value={form.short_description}
            onChange={(e) => update({ short_description: e.target.value })}
            rows={2}
            className="w-full resize-y"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Actual stage">
            <select
              value={form.actual_stage}
              onChange={(e) => update({ actual_stage: e.target.value })}
              className="w-full"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s || '—'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fundraising amount">
            <input
              value={form.fundraising_amount}
              onChange={(e) => update({ fundraising_amount: e.target.value })}
              className="w-full"
              placeholder="e.g. 4M, 52M, N/A"
            />
          </Field>
          <Field label="Last fund date">
            <input
              type="date"
              value={form.last_fund_date || ''}
              onChange={(e) => update({ last_fund_date: e.target.value })}
              className="w-full"
            />
          </Field>
        </div>

        <Field label="How to farm?">
          <textarea
            value={form.how_to_farm}
            onChange={(e) => update({ how_to_farm: e.target.value })}
            rows={2}
            className="w-full resize-y"
          />
        </Field>

        <Field label="Additional notes">
          <textarea
            value={form.additional_notes}
            onChange={(e) => update({ additional_notes: e.target.value })}
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
