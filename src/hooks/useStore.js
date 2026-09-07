import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getTodayCheckDate, msUntilNextReset } from '../lib/utils'

/**
 * Centralized store hook. Loads all data once, then exposes mutators
 * that optimistically update local state and persist to Supabase.
 */
export default function useStore() {
  const [tags, setTags] = useState([])
  const [stages, setStages] = useState([])
  const [research, setResearch] = useState([])
  const [working, setWorking] = useState([])
  const [tracking, setTracking] = useState([])
  const [dailyWallets, setDailyWallets] = useState([])
  const [dailyTasks, setDailyTasks] = useState([])
  const [dailyChecks, setDailyChecks] = useState([]) // only for today
  const [today, setToday] = useState(getTodayCheckDate())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const todayDate = getTodayCheckDate()
      setToday(todayDate)
      const [t, r, w, tr, st, dw, dt, dc] = await Promise.all([
        supabase.from('tags').select('*').order('created_at', { ascending: true }),
        supabase.from('research').select('*').order('created_at', { ascending: false }),
        supabase.from('working').select('*').order('created_at', { ascending: false }),
        supabase.from('tracking').select('*').order('created_at', { ascending: false }),
        supabase.from('stages').select('*').order('created_at', { ascending: true }),
        supabase.from('daily_wallets').select('*').order('sort_order', { ascending: true }),
        supabase.from('daily_tasks').select('*').order('sort_order', { ascending: true }),
        supabase.from('daily_checks').select('*').eq('check_date', todayDate)
      ])
      if (t.error) throw t.error
      if (r.error) throw r.error
      if (w.error) throw w.error
      if (tr.error) throw tr.error
      if (st.error) throw st.error
      if (dw.error) throw dw.error
      if (dt.error) throw dt.error
      if (dc.error) throw dc.error
      setTags(t.data || [])
      setResearch(r.data || [])
      setWorking(w.data || [])
      setTracking(tr.data || [])
      setStages(st.data || [])
      setDailyWallets(dw.data || [])
      setDailyTasks(dt.data || [])
      setDailyChecks(dc.data || [])
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Schedule a silent refresh at the next 1am boundary so leaving the
  // tab open overnight rolls the day over automatically.
  useEffect(() => {
    if (!supabase) return
    let timeout
    const schedule = () => {
      timeout = setTimeout(async () => {
        const newToday = getTodayCheckDate()
        setToday(newToday)
        const { data, error } = await supabase
          .from('daily_checks')
          .select('*')
          .eq('check_date', newToday)
        if (!error) setDailyChecks(data || [])
        schedule()
      }, msUntilNextReset() + 1000) // +1s safety margin
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  // ---------- TAGS ----------
  const createTag = async ({ name, color }) => {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, color })
      .select()
      .single()
    if (error) throw error
    setTags((prev) => [...prev, data])
    return data
  }

  const updateTag = async (id, patch) => {
    const { data, error } = await supabase
      .from('tags')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTags((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const deleteTag = async (id) => {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
    setTags((prev) => prev.filter((t) => t.id !== id))
    // also strip the id from any tracking rows
    setTracking((prev) =>
      prev.map((row) => ({
        ...row,
        tag_ids: (row.tag_ids || []).filter((x) => x !== id)
      }))
    )
  }

  // ---------- STAGES ----------
  const createStage = async ({ name, color }) => {
    const { data, error } = await supabase
      .from('stages')
      .insert({ name, color })
      .select()
      .single()
    if (error) throw error
    setStages((prev) => [...prev, data])
    return data
  }

  const updateStage = async (id, patch) => {
    const { data, error } = await supabase
      .from('stages')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setStages((prev) => prev.map((s) => (s.id === id ? data : s)))
    return data
  }

  const deleteStage = async (id) => {
    const { error } = await supabase.from('stages').delete().eq('id', id)
    if (error) throw error
    setStages((prev) => prev.filter((s) => s.id !== id))
    // The DB sets stage_id to null automatically (ON DELETE SET NULL),
    // so reflect that in local state.
    setTracking((prev) =>
      prev.map((row) =>
        row.stage_id === id ? { ...row, stage_id: null } : row
      )
    )
  }

  // ---------- DAILY WALLETS ----------
  const createDailyWallet = async ({ label }) => {
    const maxOrder = dailyWallets.reduce((m, w) => Math.max(m, w.sort_order || 0), -1)
    const { data, error } = await supabase
      .from('daily_wallets')
      .insert({ label: label.trim(), sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    setDailyWallets((prev) => [...prev, data])
    return data
  }

  const updateDailyWallet = async (id, patch) => {
    const { data, error } = await supabase
      .from('daily_wallets')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setDailyWallets((prev) => prev.map((w) => (w.id === id ? data : w)))
    return data
  }

  const deleteDailyWallet = async (id) => {
    const { error } = await supabase.from('daily_wallets').delete().eq('id', id)
    if (error) throw error
    setDailyWallets((prev) => prev.filter((w) => w.id !== id))
    // Cascade in DB removes any checks for this wallet; mirror locally.
    setDailyChecks((prev) => prev.filter((c) => c.wallet_id !== id))
  }

  // ---------- DAILY TASKS ----------
  const createDailyTask = async (payload) => {
    const maxOrder = dailyTasks.reduce((m, t) => Math.max(m, t.sort_order || 0), -1)
    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({ ...payload, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    setDailyTasks((prev) => [...prev, data])
    return data
  }

  const updateDailyTask = async (id, patch) => {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setDailyTasks((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }

  const deleteDailyTask = async (id) => {
    const { error } = await supabase.from('daily_tasks').delete().eq('id', id)
    if (error) throw error
    setDailyTasks((prev) => prev.filter((t) => t.id !== id))
    setDailyChecks((prev) => prev.filter((c) => c.task_id !== id))
  }

  // ---------- DAILY CHECKS ----------
  /**
   * Toggle a (task, wallet) checkbox for the current check_date. Optimistic:
   * we update local state immediately, then sync to Supabase. If the write
   * fails, we roll back so the UI stays consistent with the DB.
   */
  const toggleDailyCheck = async (taskId, walletId) => {
    const checkDate = getTodayCheckDate()
    const existing = dailyChecks.find(
      (c) =>
        c.task_id === taskId &&
        c.wallet_id === walletId &&
        c.check_date === checkDate
    )

    if (existing) {
      setDailyChecks((prev) => prev.filter((c) => c.id !== existing.id))
      const { error } = await supabase
        .from('daily_checks')
        .delete()
        .eq('id', existing.id)
      if (error) {
        setDailyChecks((prev) => [...prev, existing])
        throw error
      }
    } else {
      const tempId = `temp-${crypto.randomUUID()}`
      const optimistic = {
        id: tempId,
        task_id: taskId,
        wallet_id: walletId,
        check_date: checkDate,
        created_at: new Date().toISOString()
      }
      setDailyChecks((prev) => [...prev, optimistic])
      const { data, error } = await supabase
        .from('daily_checks')
        .insert({
          task_id: taskId,
          wallet_id: walletId,
          check_date: checkDate
        })
        .select()
        .single()
      if (error) {
        setDailyChecks((prev) => prev.filter((c) => c.id !== tempId))
        throw error
      }
      setDailyChecks((prev) => prev.map((c) => (c.id === tempId ? data : c)))
    }
  }

  /**
   * Refetch today's checks. Called by the Daily tab when the 1am rollover
   * fires so the checkboxes flip back to unchecked.
   */
  const refreshDailyChecks = useCallback(async () => {
    if (!supabase) return
    const checkDate = getTodayCheckDate()
    const { data, error: err } = await supabase
      .from('daily_checks')
      .select('*')
      .eq('check_date', checkDate)
    if (err) {
      setError(err.message || String(err))
      return
    }
    setDailyChecks(data || [])
  }, [])

  // ---------- RESEARCH ----------
  const createResearch = async (payload) => {
    const { data, error } = await supabase
      .from('research')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setResearch((prev) => [data, ...prev])
    return data
  }

  const updateResearch = async (id, patch) => {
    const { data, error } = await supabase
      .from('research')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setResearch((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }

  const deleteResearch = async (id) => {
    const { error } = await supabase.from('research').delete().eq('id', id)
    if (error) throw error
    setResearch((prev) => prev.filter((r) => r.id !== id))
  }

  /**
   * Bulk insert research rows. Returns { inserted, updated, skipped }.
   * Dedup: rows with a `cryptorank_key` collide with existing rows on that key
   * (unique index in DB); rows without one fall back to case-insensitive
   * name match.
   *
   * @param {Array} rows  payloads from xlsx-parse mapRow
   * @param {'skip'|'update'} mode  what to do on collision
   */
  const bulkCreateResearch = async (rows, mode = 'skip') => {
    if (!rows || rows.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 }
    }

    // Build a lookup of existing rows for collision detection.
    const byKey = new Map()
    const byName = new Map()
    for (const r of research) {
      if (r.cryptorank_key) byKey.set(r.cryptorank_key, r)
      if (r.name) byName.set(r.name.toLowerCase().trim(), r)
    }

    const toInsert = []
    const toUpdate = []
    let skipped = 0
    const seenInBatch = new Set() // dedup within the file itself

    for (const row of rows) {
      const dedupKey =
        row.cryptorank_key || `name:${row.name.toLowerCase().trim()}`
      if (seenInBatch.has(dedupKey)) {
        skipped++
        continue
      }
      seenInBatch.add(dedupKey)

      const existing =
        (row.cryptorank_key && byKey.get(row.cryptorank_key)) ||
        byName.get(row.name.toLowerCase().trim())

      if (existing) {
        if (mode === 'update') {
          toUpdate.push({ id: existing.id, patch: row })
        } else {
          skipped++
        }
      } else {
        toInsert.push(row)
      }
    }

    let insertedRows = []
    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from('research')
        .insert(toInsert)
        .select()
      if (error) throw error
      insertedRows = data || []
    }

    let updatedRows = []
    if (toUpdate.length > 0) {
      // Supabase has no native bulk-update-by-id, so fire them in parallel.
      const results = await Promise.all(
        toUpdate.map(({ id, patch }) =>
          supabase.from('research').update(patch).eq('id', id).select().single()
        )
      )
      const firstError = results.find((r) => r.error)
      if (firstError) throw firstError.error
      updatedRows = results.map((r) => r.data).filter(Boolean)
    }

    setResearch((prev) => {
      let next = [...prev]
      const updatedById = new Map(updatedRows.map((r) => [r.id, r]))
      next = next.map((r) => updatedById.get(r.id) || r)
      next = [...insertedRows, ...next]
      return next
    })

    return {
      inserted: insertedRows.length,
      updated: updatedRows.length,
      skipped
    }
  }

  /**
   * Lightweight collision report used by the import modal preview.
   * Returns counts without mutating anything.
   */
  const previewResearchImport = (rows) => {
    const byKey = new Map()
    const byName = new Map()
    for (const r of research) {
      if (r.cryptorank_key) byKey.set(r.cryptorank_key, r)
      if (r.name) byName.set(r.name.toLowerCase().trim(), r)
    }
    let isNew = 0
    let exists = 0
    let dupesInFile = 0
    const seen = new Set()
    for (const row of rows || []) {
      if (!row.name) continue
      const dedupKey =
        row.cryptorank_key || `name:${row.name.toLowerCase().trim()}`
      if (seen.has(dedupKey)) {
        dupesInFile++
        continue
      }
      seen.add(dedupKey)
      const hit =
        (row.cryptorank_key && byKey.get(row.cryptorank_key)) ||
        byName.get(row.name.toLowerCase().trim())
      if (hit) exists++
      else isNew++
    }
    return { isNew, exists, dupesInFile, total: (rows || []).length }
  }

  // ---------- WORKING ----------
  const createWorking = async (payload) => {
    const { data, error } = await supabase
      .from('working')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setWorking((prev) => [data, ...prev])
    return data
  }

  const updateWorking = async (id, patch) => {
    const { data, error } = await supabase
      .from('working')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setWorking((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }

  const deleteWorking = async (id) => {
    const { error } = await supabase.from('working').delete().eq('id', id)
    if (error) throw error
    setWorking((prev) => prev.filter((r) => r.id !== id))
  }

  // ---------- TRACKING ----------
  const createTracking = async (payload) => {
    const { data, error } = await supabase
      .from('tracking')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    setTracking((prev) => [data, ...prev])
    return data
  }

  const updateTracking = async (id, patch) => {
    const { data, error } = await supabase
      .from('tracking')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTracking((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }

  const deleteTracking = async (id) => {
    const { error } = await supabase.from('tracking').delete().eq('id', id)
    if (error) throw error
    setTracking((prev) => prev.filter((r) => r.id !== id))
  }

  /**
   * Adds a research entry to BOTH the tracking and working tables.
   * Marks the research row as in_working = true.
   * If already added, no-op.
   */
  const addResearchToTracking = async (researchRow) => {
    if (researchRow.in_working) return
    // create working row (copy of research)
    const workingPayload = {
      research_id: researchRow.id,
      name: researchRow.name,
      category: researchRow.category || '',
      last_fund_date: researchRow.last_fund_date || null,
      link: researchRow.link || '',
      short_description: researchRow.short_description || '',
      actual_stage: researchRow.actual_stage || '',
      fundraising_amount: researchRow.fundraising_amount || '',
      how_to_farm: researchRow.how_to_farm || '',
      additional_notes: researchRow.additional_notes || ''
    }
    const trackingPayload = {
      research_id: researchRow.id,
      project_name: researchRow.name,
      link: researchRow.link || '',
      notes: researchRow.how_to_farm || '',
      wallet_notes: [],
      tag_ids: [],
      last_interaction: null
    }
    const [w, t, r] = await Promise.all([
      supabase.from('working').insert(workingPayload).select().single(),
      supabase.from('tracking').insert(trackingPayload).select().single(),
      supabase
        .from('research')
        .update({ in_working: true })
        .eq('id', researchRow.id)
        .select()
        .single()
    ])
    if (w.error) throw w.error
    if (t.error) throw t.error
    if (r.error) throw r.error
    setWorking((prev) => [w.data, ...prev])
    setTracking((prev) => [t.data, ...prev])
    setResearch((prev) => prev.map((row) => (row.id === r.data.id ? r.data : row)))
  }

  const removeResearchFromTracking = async (researchRow) => {
    // delete the linked working & tracking entries, mark research in_working = false
    const ops = [
      supabase.from('working').delete().eq('research_id', researchRow.id),
      supabase.from('tracking').delete().eq('research_id', researchRow.id),
      supabase
        .from('research')
        .update({ in_working: false })
        .eq('id', researchRow.id)
        .select()
        .single()
    ]
    const [w, t, r] = await Promise.all(ops)
    if (w.error) throw w.error
    if (t.error) throw t.error
    if (r.error) throw r.error
    setWorking((prev) => prev.filter((row) => row.research_id !== researchRow.id))
    setTracking((prev) => prev.filter((row) => row.research_id !== researchRow.id))
    setResearch((prev) => prev.map((row) => (row.id === r.data.id ? r.data : row)))
  }

  return {
    // state
    tags,
    stages,
    research,
    working,
    tracking,
    dailyWallets,
    dailyTasks,
    dailyChecks,
    today,
    loading,
    error,
    // actions
    refresh: loadAll,
    createTag,
    updateTag,
    deleteTag,
    createStage,
    updateStage,
    deleteStage,
    createResearch,
    updateResearch,
    deleteResearch,
    bulkCreateResearch,
    previewResearchImport,
    createWorking,
    updateWorking,
    deleteWorking,
    createTracking,
    updateTracking,
    deleteTracking,
    addResearchToTracking,
    removeResearchFromTracking,
    createDailyWallet,
    updateDailyWallet,
    deleteDailyWallet,
    createDailyTask,
    updateDailyTask,
    deleteDailyTask,
    toggleDailyCheck,
    refreshDailyChecks
  }
}
