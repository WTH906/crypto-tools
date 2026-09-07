import { isLightHex } from '../../lib/utils'

export default function Tag({ name, color, onClick, removable, onRemove, size = 'md' }) {
  const light = isLightHex(color)
  const sizeCls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded font-medium tracking-wide uppercase border ${sizeCls} ${
        onClick ? 'cursor-pointer hover:brightness-110' : ''
      }`}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}55`,
        color: light ? color : color
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-0.5 opacity-60 hover:opacity-100"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
