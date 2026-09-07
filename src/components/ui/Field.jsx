export default function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] uppercase tracking-wider text-fg-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-fg-subtle mt-1">{hint}</span>}
    </label>
  )
}
