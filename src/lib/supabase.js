import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // We don't throw – the app still renders a config screen, but warn loudly.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = url && anon ? createClient(url, anon) : null
export const isSupabaseConfigured = Boolean(url && anon)
