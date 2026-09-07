export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value) {
  if (!value) return '—'
  try {
    const d = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return '—'
  }
}

export function toDateInput(value) {
  if (!value) return ''
  try {
    const d = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function isLightHex(hex) {
  if (!hex || typeof hex !== 'string') return false
  const h = hex.replace('#', '')
  if (h.length !== 6 && h.length !== 3) return false
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  // perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55
}

export function nanoid(size = 8) {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] % alphabet.length]
  return id
}

/**
 * Returns YYYY-MM-DD for the current "check day", where the day rolls over
 * at 1am local time. Implemented by subtracting 1 hour from `now` before
 * taking the local date — so 00:00–00:59 still counts as the previous day.
 */
export function getTodayCheckDate() {
  const shifted = new Date(Date.now() - 60 * 60 * 1000)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const d = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Milliseconds until the next 1am local-time boundary. Used to schedule a
 * silent refresh of the Daily tab so leaving the tab open overnight still
 * shows the new day correctly.
 */
export function msUntilNextReset() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(1, 0, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

/**
 * Display version of getTodayCheckDate for the header (e.g. "Mon 22 May").
 */
export function formatTodayLabel() {
  const shifted = new Date(Date.now() - 60 * 60 * 1000)
  return shifted.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}
