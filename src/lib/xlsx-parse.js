/**
 * Parse a cryptorank-tracker XLSX export into a payload ready for the
 * `research` table.
 *
 * The XLSX library (`xlsx` aka SheetJS) is dynamically imported so it
 * only ships to the user's browser when they actually open the import
 * modal — keeps the main bundle small.
 */

export async function parseCryptorankXlsx(file) {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) {
    throw new Error('No sheet found in the XLSX file.')
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return rows.map(mapRow).filter((r) => r.name)
}

/**
 * Maps one row from the XLSX (header-keyed) to a research insert payload.
 * Header names match `backend/export.py` exactly.
 */
function mapRow(row) {
  const cryptorankUrl = String(row['CryptoRank URL'] || '').trim()
  return {
    name: String(row['Project'] || '').trim(),
    category: String(row['Category'] || '').trim(),
    last_fund_date: parseDate(row['Funding Date']),
    link: cryptorankUrl,
    short_description: '',
    actual_stage: normalizeStage(row['Funding Stage']),
    fundraising_amount: formatRaise(row['Raise ($)']),
    how_to_farm: '',
    additional_notes: combineNotes(row['Notes'], row['Personal Notes']),
    cryptorank_key: extractCryptorankKey(cryptorankUrl)
  }
}

/**
 * The export.py writes funding_date as a "YYYY-MM-DD" string but openpyxl
 * may coerce it to a Date object on read. Handle both, plus Excel serials.
 */
function parseDate(v) {
  if (!v) return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    return v.toISOString().slice(0, 10)
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    return s.slice(0, 10)
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial: days since 1899-12-30 (the leap-year bug epoch)
    const epoch = Date.UTC(1899, 11, 30)
    const ms = epoch + v * 86_400_000
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  return null
}

/**
 * Format a raw USD number as the human shorthand the user already uses
 * in their sheet ("4M", "52M", "1.5B"). Empty for missing/zero/non-numeric.
 */
export function formatRaise(v) {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1e9) return trim(n / 1e9) + 'B'
  if (n >= 1e6) return trim(n / 1e6) + 'M'
  if (n >= 1e3) return trim(n / 1e3) + 'K'
  return String(Math.round(n))
}

function trim(x) {
  // 4 → "4", 4.5 → "4.5", 4.567 → "4.6"
  if (x % 1 === 0) return String(x)
  return x.toFixed(1).replace(/\.0$/, '')
}

const STAGE_MAP = {
  'pre-seed': 'Pre Seed',
  'preseed': 'Pre Seed',
  'pre seed': 'Pre Seed',
  seed: 'Seed',
  'seed extension': 'Seed',
  'series a': 'Series A',
  'series a1': 'Series A',
  'series a2': 'Series A',
  'series b': 'Series B',
  'series c': 'Series C',
  'series d': 'Series C',
  strategic: 'Strategic',
  'strategic round': 'Strategic'
}

function normalizeStage(v) {
  if (!v) return ''
  const k = String(v).toLowerCase().trim()
  return STAGE_MAP[k] || String(v).trim()
}

function combineNotes(notes, personalNotes) {
  const parts = []
  if (notes && String(notes).trim()) parts.push(String(notes).trim())
  if (personalNotes && String(personalNotes).trim())
    parts.push(String(personalNotes).trim())
  return parts.join('\n\n')
}

/**
 * Extract the cryptorank slug from a URL like
 * `https://cryptorank.io/ico/some-project` so we can dedupe imports
 * even if the project name differs across sources.
 */
export function extractCryptorankKey(url) {
  if (!url) return null
  const m = String(url).match(/cryptorank\.io\/ico\/([a-z0-9-]+)/i)
  return m ? m[1].toLowerCase() : null
}
