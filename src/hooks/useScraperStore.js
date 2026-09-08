import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DELAY_MS = 1500

export default function useScraperStore() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(null)
  const [scanProgress, setScanProgress] = useState(null)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('funding_date')
  const [sortDir, setSortDir] = useState('desc')
  const [showDeleted, setShowDeleted] = useState(false)

  const loadProjects = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    try {
      let query = supabase
        .from('scraper_projects')
        .select('*')
        .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false })

      if (!showDeleted) {
        query = query.eq('deleted', false)
      }

      const { data, error: err } = await query
      if (err) throw err
      setProjects(data || [])
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortDir, showDeleted])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const updateProject = async (key, changes) => {
    const patch = { ...changes, last_modified: new Date().toISOString() }
    const { error: err } = await supabase
      .from('scraper_projects')
      .update(patch)
      .eq('key', key)
    if (err) throw err
    setProjects(prev => prev.map(p => p.key === key ? { ...p, ...patch } : p))
  }

  const deleteProject = async (key) => {
    await updateProject(key, { deleted: true })
    if (!showDeleted) {
      setProjects(prev => prev.filter(p => p.key !== key))
    }
  }

  const restoreProject = async (key) => {
    await updateProject(key, { deleted: false })
  }

  const scanCryptoRank = async (token, dateFrom, dateTo, maxPages) => {
    setScanning('cr')
    setScanProgress(null)
    let totalInserted = 0, totalUpdated = 0, totalFetched = 0, totalErrors = 0
    let skip = 0
    let warning = null

    try {
      for (let page = 1; page <= maxPages; page++) {
        setScanProgress({ page, maxPages })

        const resp = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bearer_token: token,
            date_from: dateFrom,
            date_to: dateTo,
            skip,
          }),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.error || resp.statusText)
        }
        const result = await resp.json()
        totalFetched += result.fetched || 0
        totalInserted += result.inserted || 0
        totalUpdated += result.updated || 0
        totalErrors += result.errors || 0
        if (result.warning) warning = result.warning

        if (!result.has_more || result.warning) break
        skip = result.next_skip

        if (page < maxPages) {
          await new Promise(r => setTimeout(r, DELAY_MS))
        }
      }
      await loadProjects()
      return { fetched: totalFetched, inserted: totalInserted, updated: totalUpdated, errors: totalErrors, warning }
    } finally {
      setScanning(null)
      setScanProgress(null)
    }
  }

  const scanICO = async (dateFrom, dateTo, maxPages) => {
    setScanning('ico')
    setScanProgress(null)
    let totalInserted = 0, totalUpdated = 0, totalMerged = 0, totalFetched = 0, totalErrors = 0
    let warning = null

    try {
      for (let page = 1; page <= maxPages; page++) {
        setScanProgress({ page, maxPages })

        const resp = await fetch('/api/scan_ico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date_from: dateFrom,
            date_to: dateTo,
            page,
          }),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.error || resp.statusText)
        }
        const result = await resp.json()
        totalFetched += result.fetched || 0
        totalInserted += result.inserted || 0
        totalUpdated += result.updated || 0
        totalMerged += result.merged || 0
        totalErrors += result.errors || 0
        if (result.warning) warning = result.warning

        if (!result.has_more || result.warning) break

        if (page < maxPages) {
          await new Promise(r => setTimeout(r, DELAY_MS))
        }
      }
      await loadProjects()
      return { fetched: totalFetched, inserted: totalInserted, updated: totalUpdated, merged: totalMerged, errors: totalErrors, warning }
    } finally {
      setScanning(null)
      setScanProgress(null)
    }
  }

  const sendToResearch = async (project) => {
    if (!supabase) throw new Error('Supabase not configured')

    const { data: existing } = await supabase
      .from('research')
      .select('id')
      .eq('cryptorank_key', project.key)

    if (existing && existing.length > 0) {
      throw new Error(`"${project.name}" already exists in research`)
    }

    const investors = (project.investors || []).slice(0, 10)
    const investorNames = investors.map(i => i.name).filter(Boolean).join(', ')

    const raise = project.funding_raise
    let raiseStr = ''
    if (raise != null) {
      if (raise >= 1e9) raiseStr = `$${(raise / 1e9).toFixed(1)}B`
      else if (raise >= 1e6) raiseStr = `$${(raise / 1e6).toFixed(1)}M`
      else if (raise >= 1e3) raiseStr = `$${(raise / 1e3).toFixed(0)}K`
      else raiseStr = `$${raise}`
    }

    const { error: err } = await supabase.from('research').insert({
      cryptorank_key: project.key,
      name: project.name || '',
      category: project.category || '',
      last_fund_date: project.funding_date || null,
      link: project.cryptorank_url || '',
      short_description: investorNames,
      actual_stage: project.funding_stage || '',
      fundraising_amount: raiseStr,
      how_to_farm: '',
      additional_notes: project.notes || '',
    })
    if (err) throw err
  }

  return {
    projects, loading, scanning, scanProgress, error,
    sortBy, sortDir, showDeleted,
    handleSort, setShowDeleted,
    loadProjects, updateProject, deleteProject, restoreProject,
    scanCryptoRank, scanICO, sendToResearch,
  }
}
