import Modal from '../ui/Modal'
import Field from '../ui/Field'
import { formatDate } from '../../lib/utils'
import { ExternalLink } from 'lucide-react'

export default function DetailsModal({ open, onClose, tracking, research }) {
  if (!tracking) return null

  const linkedResearch = tracking.research_id
    ? research.find((r) => r.id === tracking.research_id)
    : null

  return (
    <Modal open={open} onClose={onClose} title={`Details — ${tracking.project_name}`} size="md">
      <div className="space-y-4">
        <Field label="Last interaction">
          <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm font-mono">
            {formatDate(tracking.last_interaction)}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fundraising amount">
            <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm font-mono text-accent">
              {linkedResearch?.fundraising_amount || '—'}
            </div>
          </Field>
          <Field label="Last fundraising date">
            <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm font-mono">
              {formatDate(linkedResearch?.last_fund_date)}
            </div>
          </Field>
        </div>

        <Field label="Project stage">
          <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm font-mono">
            {linkedResearch?.actual_stage || '—'}
          </div>
        </Field>

        {linkedResearch?.category && (
          <Field label="Category">
            <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm">
              {linkedResearch.category}
            </div>
          </Field>
        )}

        {linkedResearch?.short_description && (
          <Field label="Short description">
            <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm leading-relaxed">
              {linkedResearch.short_description}
            </div>
          </Field>
        )}

        {!linkedResearch && (
          <div className="text-xs text-fg-subtle px-3 py-3 border border-dashed border-border rounded-md text-center">
            This tracking entry isn't linked to a research project.
            <br />
            Add it via the Research tab to populate fundraising data here.
          </div>
        )}

        {tracking.link && (
          <a
            href={tracking.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-muted transition-colors"
          >
            Open project link <ExternalLink size={12} />
          </a>
        )}
      </div>
    </Modal>
  )
}
