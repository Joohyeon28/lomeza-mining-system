import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { getClientForSchema, supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import LogDetailModal from '../components/LogDetailModal'

interface DashboardMetrics {
  total_loads: number
  total_volume: number
  pending_reviews: number
  active_exceptions: number
}

interface ShiftSummary {
  material: string
  loads: number
  volume: number
  status: string
}

interface ProductionEntry {
  id: string | number
  machine_id: string
  shift_date: string
  hour: number
    material_type?: string
    rejection_reason?: string | null
  activity: string
  number_of_loads: number
  haul_distance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXCEPTION'
  assets: { asset_code: string }[] | null
}

// Stats interface intentionally omitted for supervisor view

export default function SupervisorDashboard() {
  const { site } = useAuth()
  const getDb = useDb()
  const navigate = useNavigate()
  const pad = (n: number) => String(n).padStart(2, '0')
  const getISOWeek = (dt: Date) => {
    const tmp = new Date(dt.getTime())
    tmp.setHours(0, 0, 0, 0)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${tmp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }
  const parseISOWeekToRange = (isoWeek: string) => {
    const m = isoWeek.match(/(\d{4})-W(\d{2})/)
    if (!m) return { start: new Date(0), end: new Date(0) }
    const year = Number(m[1])
    const week = Number(m[2])
    const jan4 = new Date(year, 0, 4)
    const jan4Day = (jan4.getDay() + 6) % 7
    const mondayWeek1 = new Date(year, 0, 4 - jan4Day)
    const start = new Date(mondayWeek1)
    start.setDate(mondayWeek1.getDate() + (week - 1) * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  const localToday = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
  })()
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [viewEntry, setViewEntry] = useState<any | null>(null)
  const [viewBreakdown, setViewBreakdown] = useState<any | null>(null)
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})
  const [collapsedMaterials, setCollapsedMaterials] = useState<Record<string, boolean>>({})
  const materialCategories = ['OB (Mining)', 'OB (Rehabilitation)', 'Coal']
  const [timeframe, setTimeframe] = useState<'shift' | 'week' | 'month' | 'all'>('shift')
  const [shiftMode, setShiftMode] = useState<'full' | 'shiftA' | 'shiftB' | 'current'>('current')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const getISOWeek = (dt: Date) => {
      const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
      tmp.setUTCDate(tmp.getUTCDate() + 3 - ((tmp.getUTCDay() + 6) % 7))
      const week1 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4))
      const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7)
      return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    }
    return getISOWeek(new Date())
  })
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })

  const STORAGE_KEY = 'supervisor:pageState'

  // Restore persisted page state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.timeframe) setTimeframe(parsed.timeframe)
      if (parsed.shiftMode) setShiftMode(parsed.shiftMode)
      if (parsed.selectedDate) setSelectedDate(parsed.selectedDate)
      if (parsed.selectedWeek) setSelectedWeek(parsed.selectedWeek)
      if (parsed.selectedMonth) setSelectedMonth(parsed.selectedMonth)
      if (parsed.collapsedDates) setCollapsedDates(parsed.collapsedDates)
      if (parsed.collapsedMaterials) setCollapsedMaterials(parsed.collapsedMaterials)
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist page state when filters or collapse state change
  useEffect(() => {
    try {
      const toSave = {
        timeframe,
        shiftMode,
        selectedDate,
        selectedWeek,
        selectedMonth,
        collapsedDates,
        collapsedMaterials,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      // ignore
    }
  }, [timeframe, shiftMode, selectedDate, selectedWeek, selectedMonth, collapsedDates, collapsedMaterials])
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_loads: 0,
    total_volume: 0,
    pending_reviews: 0,
    active_exceptions: 0,
  })
  const [summaryDate, setSummaryDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [summary, setSummary] = useState<ShiftSummary[]>([])
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  const [pendingEntriesList, setPendingEntriesList] = useState<ProductionEntry[]>([])
  const [loadingPending, setLoadingPending] = useState(false)
  

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Active exceptions: include explicit exceptions table and also production entries logged as Breakdowns
        const { count: exceptions, error: exceptionsError } = await getDb()
          .from('exceptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'])

        const { count: breakdownEntriesCount, error: breakdownError } = await getDb()
          .from('production_entries')
          .select('*', { count: 'exact', head: true })
          .eq('activity', 'Breakdown')

        const activeExceptionsTotal = (exceptions || 0) + (breakdownEntriesCount || 0)

        if (exceptionsError) throw exceptionsError

        // Only update active_exceptions here to avoid overwriting load/volume metrics
        setMetrics(m => ({ ...m, active_exceptions: activeExceptionsTotal || 0 }))
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err)
      }
    }

    fetchMetrics()
  }, [getDb])

  

  const isInTimeframe = (e: ProductionEntry) => {
    if (timeframe === 'all') return true
    const [ey, em, ed] = e.shift_date.split('-').map(Number)
    const d = new Date(ey, (em || 1) - 1, ed || 1)
    if (timeframe === 'shift') {
      const hour = Number(e.hour)
      if (shiftMode === 'full') return e.shift_date === selectedDate
      if (shiftMode === 'shiftA') return e.shift_date === selectedDate && hour >= 6 && hour < 18
      if (shiftMode === 'shiftB') return e.shift_date === selectedDate && (hour >= 18 || hour < 6)
      if (shiftMode === 'current') {
        const now = new Date()
        const h = now.getHours()
        if (h >= 6 && h < 18) return e.shift_date === selectedDate && hour >= 6 && hour < 18
        return e.shift_date === selectedDate && (hour >= 18 || hour < 6)
      }
      return e.shift_date === selectedDate
    }
    if (timeframe === 'week') {
      const { start, end } = parseISOWeekToRange(selectedWeek)
      return d >= start && d <= end
    }
    if (timeframe === 'month') {
      const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      return monthStr === selectedMonth
    }
    return true
  }
  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const db = getDb()
      const { data, error } = await db
        .from('production_entries')
        .select(`
          id,
          machine_id,
          shift_date,
          hour,
          material_type,
          rejection_reason,
          activity,
          number_of_loads,
          haul_distance,
          status,
          assets ( asset_code )
        `)
        .eq('site', site)
        .order('shift_date', { ascending: false })
        .order('hour', { ascending: true })

      if (error) {
        console.error('Error fetching supervisor entries:', error)
        setLoadingEntries(false)
        return
      }

      if (data) {
        const typedData = data as ProductionEntry[]
        const missingIds = Array.from(new Set(typedData.filter(e => !(e.assets && e.assets.length)).map(e => e.machine_id).filter(Boolean)))
        let filled = typedData
        if (missingIds.length > 0) {
          const selectedSite = site?.toLowerCase() || ''
          const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
          const assetsById: Record<string, any> = {}
          for (const schema of candidateSchemas) {
            if (Object.keys(assetsById).length === missingIds.length) break
            try {
              const client = getClientForSchema(schema)
              const { data: assets } = await client
                .from('assets')
                .select('id, asset_code')
                .in('id', missingIds)
              if (assets && (assets as any[]).length > 0) {
                for (const a of assets as any[]) assetsById[String(a.id)] = a
              }
            } catch (e) {
              // ignore
            }
          }
          filled = typedData.map(entry => ({
            ...entry,
            assets: entry.assets && entry.assets.length ? entry.assets : (assetsById[String(entry.machine_id)] ? [assetsById[String(entry.machine_id)]] : null),
          }))
        }

        // Normalize: show breakdown rows as EXCEPTION in the production history
        let normalized = (filled || []).map((en) => ({ ...en, status: en.activity === 'Breakdown' ? 'EXCEPTION' : en.status }))
        // If breakdowns exist that have been acknowledged, reflect that here
        try {
          const bdCandidates = (filled || []).filter((e: any) => String(e.activity).toLowerCase() === 'breakdown')
          if (bdCandidates.length > 0) {
            const machineIds = Array.from(new Set(bdCandidates.map((e: any) => String(e.machine_id)).filter(Boolean)))
            const dates = Array.from(new Set(bdCandidates.map((e: any) => e.shift_date))).filter(Boolean)
            if (machineIds.length > 0 && dates.length > 0) {
              const starts = dates.map((d: string) => new Date(d + 'T00:00:00').toISOString())
              const ends = dates.map((d: string) => new Date(d + 'T23:59:59.999').toISOString())
              const earliest = starts.reduce((a, b) => a < b ? a : b, starts[0])
              const latest = ends.reduce((a, b) => a > b ? a : b, ends[0])

              const { data: bds, error: bdErr } = await db
                .from('breakdowns')
                .select('id,asset_id,breakdown_start,status')
                .in('asset_id', machineIds)
                .gte('breakdown_start', earliest)
                .lte('breakdown_start', latest)

              if (!bdErr && bds) {
                const bdMap: Record<string, any[]> = {}
                ;(bds as any[]).forEach((r: any) => {
                  const dateKey = String(r.breakdown_start || '').split('T')[0]
                  const key = `${r.asset_id}|${dateKey}`
                  bdMap[key] = bdMap[key] || []
                  bdMap[key].push(r)
                })

                normalized = normalized.map((ent: any) => {
                  if (String(ent.activity).toLowerCase() !== 'breakdown') return ent
                  const key = `${ent.machine_id}|${ent.shift_date}`
                  const matches = bdMap[key]
                  if (matches && matches.some((m: any) => String(m.status).toUpperCase() === 'ACKNOWLEDGED')) {
                    return { ...ent, status: 'ACKNOWLEDGED' }
                  }
                  return ent
                })
              }
            }
          }
        } catch (e) {
          // ignore breakdown lookup errors
        }

        setEntries(normalized)

        // Recompute active exceptions so the card reflects current data immediately
        try {
          const { count: exceptions, error: exceptionsError } = await getDb()
            .from('exceptions')
            .select('*', { count: 'exact', head: true })
            .in('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'])

          const { count: breakdownEntriesCount, error: breakdownError } = await getDb()
            .from('production_entries')
            .select('*', { count: 'exact', head: true })
            .eq('activity', 'Breakdown')

          const activeExceptionsTotal = (exceptions || 0) + (breakdownEntriesCount || 0)
          if (!exceptionsError && !breakdownError) {
            setMetrics(m => ({ ...m, active_exceptions: activeExceptionsTotal || 0 }))
          }
        } catch (err) {
          console.error('Error updating active exceptions:', err)
        }

        const dates = Array.from(new Set(filled.map(e => e.shift_date))).sort((a, b) => b.localeCompare(a))
        const initCollapsed: Record<string, boolean> = {}
        for (const d of dates) initCollapsed[d] = d !== localToday
        setCollapsedDates(initCollapsed)
        // initialize per-date material collapse state (default: expanded)
        const initMat: Record<string, boolean> = {}
        for (const d of dates) {
          for (const c of materialCategories) initMat[`${d}|${c}`] = false
          initMat[`${d}|Other`] = false
        }
        setCollapsedMaterials(initMat)
      }
    } catch (err) {
      console.error('Error loading supervisor entries:', err)
    } finally {
      setLoadingEntries(false)
    }
  }, [getDb, site, localToday])

  useEffect(() => {
    if (!site) return
    // Initial load
    fetchEntries()
    return
  }, [site, getDb, fetchEntries])

  // Refresh the list when an entry is updated elsewhere in the app
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        // ev may be a CustomEvent with detail about the update
        const ce = ev as CustomEvent
        // Only refresh when an id/status is provided or simply refresh anyway
        if (ce && ce.detail) {
          fetchEntries()
        } else {
          fetchEntries()
        }
      } catch (e) {
        // swallow errors
        fetchEntries()
      }
    }
    window.addEventListener('entry-updated', handler as EventListener)
    return () => window.removeEventListener('entry-updated', handler as EventListener)
  }, [fetchEntries])

  const filteredEntries = entries.filter(isInTimeframe)

  const displayMaterial = (mt?: string) => {
    if (!mt) return '-'
    const raw = String(mt).trim()
    const key = raw.toLowerCase().replace(/[_\-\s\(\)]+/g, ' ').trim()
    // Rehabilitation first (covers OB_REHAB, OB_REHABILITATION, rehab, etc.)
    if (key.includes('rehab') || key.includes('rehabilit')) return 'OB (Rehabilitation)'
    // Coal
    if (key.includes('coal')) return 'Coal'
    // Mining/OB (but avoid mapping rehab again)
    if (key === 'ob' || key.includes(' min') || key.includes('mining') || key.startsWith('ob ')) return 'OB (Mining)'
    // Fallback: normalize common separators and upper-case known abbreviations
    if (key === 'ob mining') return 'OB (Mining)'
    if (key === 'ob rehabilitation') return 'OB (Rehabilitation)'
    // Preserve original casing for other materials
    return raw
  }

  useEffect(() => {
    // Derive metrics from the currently filtered entries so cards reflect the selected view.
    // Depend on the primitive inputs that determine `filteredEntries` to avoid running
    // on every render (since `entries.filter(...)` creates a new array each time).
    try {
      const currentFiltered = entries.filter(isInTimeframe)
      const approved = currentFiltered.filter(e => e.status === 'APPROVED')
      const total_loads = approved.reduce((sum: number, entry: any) => sum + (entry.number_of_loads || 0), 0)
      const total_volume = approved.reduce((sum: number, entry: any) => sum + (entry.number_of_loads || 0) * (entry.haul_distance || 0), 0)
      const pending = currentFiltered.filter(e => e.status === 'PENDING' && e.activity !== 'Breakdown').length

      setMetrics(prev => {
        if (prev.total_loads === total_loads && prev.total_volume === total_volume && prev.pending_reviews === pending) return prev
        return { ...prev, total_loads, total_volume, pending_reviews: pending }
      })
    } catch (e) {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, timeframe, shiftMode, selectedDate, selectedWeek, selectedMonth])

  const handleRowClick = async (entry: ProductionEntry) => {
    try {
      const db = getDb()
      const dayStart = new Date(entry.shift_date + 'T00:00:00').toISOString()
      const dayEnd = new Date(entry.shift_date + 'T23:59:59.999').toISOString()
      const { data, error } = await db
        .from('breakdowns')
        .select('*')
        .eq('asset_id', entry.machine_id)
        .gte('breakdown_start', dayStart)
        .lte('breakdown_start', dayEnd)
        .order('breakdown_start', { ascending: false })
        .limit(1)

      if (error) console.warn('Breakdown lookup failed', error)
      setViewEntry(entry)
      if (data && (data as any[]).length) {
        setViewBreakdown((data as any[])[0])
      } else {
        setViewBreakdown(null)
      }
    } catch (err) {
      console.error('Failed to load breakdown', err)
      setViewEntry(entry)
      setViewBreakdown(null)
    }
  }

  const loadShiftSummary = async () => {
    try {
      const { data, error } = await getDb()
        .from('production_entries')
        .select('material_type, number_of_loads, haul_distance, status')
        .eq('shift_date', summaryDate)

      if (error) throw error

      // Group by material_type
      const grouped: Record<string, ShiftSummary> = {}
      const rows = (data ?? []) as any[]
      rows.forEach((entry: any) => {
        const material = displayMaterial(entry.material_type) || 'Unknown'
        if (!grouped[material]) {
          grouped[material] = {
            material,
            loads: 0,
            volume: 0,
            status: entry.status || 'UNKNOWN',
          }
        }
        grouped[material].loads += entry.number_of_loads || 0
        grouped[material].volume +=
          (entry.number_of_loads || 0) * (entry.haul_distance || 0)
      })

      setSummary(Object.values(grouped))
    } catch (err) {
      console.error('Error loading shift summary:', err)
    }
  }

  const exportCSV = () => {
    const headers = ['Material', 'Loads', 'Volume', 'Status']
    const rows = summary.map((s) => [s.material, s.loads, s.volume, s.status])
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shift-summary-${summaryDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const loadPendingReviews = async () => {
    setPendingModalOpen(true)
    try {
      setLoadingPending(true)
      const db = getDb()
      const { data, error } = await db
        .from('production_entries')
        .select(`
          id,
          machine_id,
          shift_date,
          hour,
          material_type,
          rejection_reason,
          activity,
          number_of_loads,
          haul_distance,
          status,
          assets ( asset_code )
        `)
        .eq('site', site)
        .eq('status', 'PENDING')
        .neq('activity', 'Breakdown')
        .order('shift_date', { ascending: false })
        .order('hour', { ascending: true })

      if (error) {
        console.error('Error loading pending reviews:', error)
        setPendingEntriesList([])
      } else {
        const typed = (data ?? []) as ProductionEntry[]
        const missingIds = Array.from(new Set(typed.filter(e => !(e.assets && e.assets.length)).map(e => e.machine_id).filter(Boolean)))
        let filled = typed
        if (missingIds.length > 0) {
          const selectedSite = site?.toLowerCase() || ''
          const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
          const assetsById: Record<string, any> = {}
          for (const schema of candidateSchemas) {
            if (Object.keys(assetsById).length === missingIds.length) break
            try {
              const client = getClientForSchema(schema)
              const { data: assets } = await client
                .from('assets')
                .select('id, asset_code')
                .in('id', missingIds)
              if (assets && (assets as any[]).length > 0) {
                for (const a of assets as any[]) assetsById[String(a.id)] = a
              }
            } catch (e) {
              // ignore schema errors and continue
            }
          }

          filled = typed.map(entry => ({
            ...entry,
            assets: entry.assets && entry.assets.length ? entry.assets : (assetsById[String(entry.machine_id)] ? [assetsById[String(entry.machine_id)]] : null),
          }))
        }

        setPendingEntriesList(filled)
      }
    } catch (err) {
      console.error('Failed to fetch pending reviews:', err)
      setPendingEntriesList([])
    } finally {
      setLoadingPending(false)
    }
  }

  return (
    <Layout activePage="/supervisor-dashboard">
      <div className="dashboard-header">
        <h1>CONTROL CENTER</h1>
        <p>{site} Operations</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <label style={{ color: '#333', fontSize: 14 }}>View:</label>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6 }}>
          <option value="shift">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="all">All Time</option>
        </select>

        {timeframe === 'shift' && (
          <>
            <select value={shiftMode} onChange={e => setShiftMode(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6 }}>
              {selectedDate === localToday && <option value="current">Current Shift</option>}
              <option value="full">Full Day</option>
              <option value="shiftA">Day Shift (06:00–17:59)</option>
              <option value="shiftB">Night Shift (18:00–05:59)</option>
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6 }}
            />
          </>
        )}

        {timeframe === 'week' && (
          <input
            type="week"
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 6 }}
          />
        )}

        {timeframe === 'month' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 6 }}
          />
        )}
        <button onClick={() => {
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
          const monthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
          setTimeframe('shift'); setShiftMode('current'); setSelectedDate(dateStr); setSelectedWeek(getISOWeek(now)); setSelectedMonth(monthStr);
          const dates = Array.from(new Set(entries.map(e => e.shift_date)))
          const newCollapsed: Record<string, boolean> = {}
          for (const d of dates) newCollapsed[d] = d !== dateStr
          setCollapsedDates(newCollapsed)
        }} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }} aria-label="Go to today and current shift">Today & Current Shift</button>
        <button onClick={() => { fetchEntries() }} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }} aria-label="Refresh entries">Refresh</button>
      </div>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-title">TOTAL LOADS</div>
          <div className="metric-value">{metrics.total_loads}</div>
          <div className="metric-sub">Approved production</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">TOTAL VOLUME</div>
          <div className="metric-value">{metrics.total_volume.toFixed(1)}</div>
          <div className="metric-sub">Load × Distance</div>
        </div>
        <div
          className="metric-card"
          role="button"
          tabIndex={0}
          onClick={() => loadPendingReviews()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              loadPendingReviews()
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-title">PENDING REVIEWS</div>
          <div className="metric-value">{metrics.pending_reviews}</div>
          <div className="metric-sub">Awaiting approval — click to view</div>
        </div>
        <div
          className="metric-card"
          role="button"
          tabIndex={0}
          onClick={() => { navigate('/exceptions') }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/exceptions')
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="metric-title">ACTIVE EXCEPTIONS</div>
          <div className="metric-value">{metrics.active_exceptions}</div>
          <div className="metric-sub">Require attention</div>
        </div>
      </section>

      {/* PRODUCTION HISTORY */}
      <section className="performance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Production History</h2>
          <button onClick={() => fetchEntries()} disabled={loadingEntries} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }} aria-label="Refresh production history">{loadingEntries ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        {loadingEntries ? (
          <p>Loading...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="empty-state">No production entries for the selected timeframe.</p>
        ) : (
          (() => {
            const grouped = filteredEntries.reduce((acc: Record<string, ProductionEntry[]>, e) => {
              ;(acc[e.shift_date] = acc[e.shift_date] || []).push(e)
              return acc
            }, {})
            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
            const todayStr = new Date().toISOString().split('T')[0]

            return (
              <div>
                {sortedDates.map(date => {
                      const group = grouped[date]
                      const isCollapsed = collapsedDates[date] ?? (date !== todayStr)
                              const categories = ['OB (Mining)', 'OB (Rehabilitation)', 'Coal']
                              const others = group.filter(e => !categories.includes(displayMaterial(e.material_type)))
                      return (
                        <div key={date} className="date-group">
                          <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setCollapsedDates(s => ({ ...s, [date]: !isCollapsed }))}
                                aria-expanded={!isCollapsed}
                                title={isCollapsed ? `Expand ${date}` : `Collapse ${date}`}
                                style={{
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: 'transparent',
                                  padding: 8,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 8,
                                  minWidth: 36,
                                }}
                                aria-label={isCollapsed ? `Expand ${date}` : `Collapse ${date}`}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 160ms ease', display: 'block', color: '#444' }} aria-hidden>
                                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
                                  </svg>
                                  <span style={{position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0}}>{isCollapsed ? `Expand ${date}` : `Collapse ${date}`}</span>
                              </button>
                              <strong>{date}</strong>
                              <span style={{ color: '#666' }}>— {group.length} entries</span>
                            </div>
                            <div style={{ color: '#666' }}>{date === todayStr ? 'Today' : ''}</div>
                          </div>

                          {!isCollapsed && (
                            <div>
                              {materialCategories.map(cat => {
                                const rows = group.filter(e => displayMaterial(e.material_type) === cat)
                                if (!rows.length) return null
                                const catKey = `${date}|${cat}`
                                const isCatCollapsed = !!collapsedMaterials[catKey]
                                return (
                                  <div key={cat} style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button
                                          type="button"
                                          onClick={() => setCollapsedMaterials(s => ({ ...s, [catKey]: !isCatCollapsed }))}
                                          aria-expanded={!isCatCollapsed}
                                          title={isCatCollapsed ? `Expand ${cat}` : `Collapse ${cat}`}
                                          style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: 6, borderRadius: 8, minWidth: 36 }}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isCatCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 160ms ease', display: 'block', color: '#444' }} aria-hidden>
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
                                          </svg>
                                          <span style={{position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0}}>{isCatCollapsed ? `Expand ${cat}` : `Collapse ${cat}`}</span>
                                        </button>
                                        <div style={{ fontWeight: 700 }}>{cat}</div>
                                      </div>
                                    </div>
                                    {!isCatCollapsed && (
                                      <table>
                                        <thead>
                                          <tr>
                                              <th>MACHINE</th>
                                              <th>MATERIAL</th>
                                              <th>HOUR</th>
                                              <th>ACTIVITY</th>
                                            <th>LOADS</th>
                                            <th>DIST (m)</th>
                                            <th>STATUS</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rows.map(entry => (
                                            <tr key={String(entry.id)} onClick={() => handleRowClick(entry)} style={{ cursor: 'pointer' }}>
                                                <td className="machine-id">{entry.assets?.[0]?.asset_code || entry.machine_id}</td>
                                                <td>{displayMaterial(entry.material_type)}</td>
                                                <td>{entry.hour}:00</td>
                                              <td>{entry.activity}</td>
                                              <td>{entry.number_of_loads || '-'}</td>
                                              <td>{entry.haul_distance || '-'}</td>
                                              <td>
                                                <span className={`status-badge ${entry.status.toLowerCase()}`}>{entry.status}</span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                )
                              })}

                              {others.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  {(() => {
                                    const otherKey = `${date}|Other`
                                    const isOtherCollapsed = !!collapsedMaterials[otherKey]
                                    return (
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                              type="button"
                                              onClick={() => setCollapsedMaterials(s => ({ ...s, [otherKey]: !isOtherCollapsed }))}
                                              aria-expanded={!isOtherCollapsed}
                                              title={isOtherCollapsed ? 'Expand Other' : 'Collapse Other'}
                                              style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: 6, borderRadius: 8, minWidth: 36 }}
                                            >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isOtherCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 160ms ease', display: 'block', color: '#444' }} aria-hidden>
                                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
                                              </svg>
                                              <span style={{position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0}}>{isOtherCollapsed ? 'Expand Other' : 'Collapse Other'}</span>
                                            </button>
                                            <div style={{ fontWeight: 700 }}>Other</div>
                                          </div>
                                        </div>
                                        {!isOtherCollapsed && (
                                          <table>
                                            <thead>
                                              <tr>
                                                  <th>MACHINE</th>
                                                  <th>MATERIAL</th>
                                                  <th>HOUR</th>
                                                  <th>ACTIVITY</th>
                                                <th>LOADS</th>
                                                <th>DIST (m)</th>
                                                <th>STATUS</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {others.map(entry => (
                                                <tr key={String(entry.id)} onClick={() => handleRowClick(entry)} style={{ cursor: 'pointer' }}>
                                                    <td className="machine-id">{entry.assets?.[0]?.asset_code || entry.machine_id}</td>
                                                    <td>{displayMaterial(entry.material_type)}</td>
                                                    <td>{entry.hour}:00</td>
                                                  <td>{entry.activity}</td>
                                                  <td>{entry.number_of_loads || '-'}</td>
                                                  <td>{entry.haul_distance || '-'}</td>
                                                  <td>
                                                    <span className={`status-badge ${entry.status.toLowerCase()}`}>{entry.status}</span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
              </div>
            )
          })()
        )}
      </section>

      {viewEntry && (
        <LogDetailModal
          entry={viewEntry}
          breakdown={viewBreakdown || undefined}
          onClose={() => { setViewEntry(null); setViewBreakdown(null) }}
        />
      )}

      {pendingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: '#fff', borderRadius: 8, maxWidth: 1000, width: '95%', maxHeight: '80%', overflow: 'auto', padding: 16 }} role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Pending Reviews</h3>
              <div>
                <button onClick={() => { setPendingModalOpen(false); setPendingEntriesList([]) }} style={{ marginRight: 8 }}>Close</button>
              </div>
            </div>

            {loadingPending ? (
              <p>Loading...</p>
            ) : pendingEntriesList.length === 0 ? (
              <p className="empty-state">No pending reviews.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 8 }}>MACHINE</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>MATERIAL</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>HOUR</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>ACTIVITY</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>LOADS</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>DIST (m)</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingEntriesList.map((entry) => (
                        <tr key={String(entry.id)} onClick={() => { handleRowClick(entry); setPendingModalOpen(false); }} style={{ cursor: 'pointer' }}>
                          <td style={{ padding: 8 }}>{entry.assets?.[0]?.asset_code || entry.machine_id}</td>
                          <td style={{ padding: 8 }}>{displayMaterial(entry.material_type)}</td>
                          <td style={{ padding: 8 }}>{entry.hour}:00</td>
                          <td style={{ padding: 8 }}>{entry.activity}</td>
                          <td style={{ padding: 8 }}>{entry.number_of_loads ?? '-'}</td>
                          <td style={{ padding: 8 }}>{entry.haul_distance ?? '-'}</td>
                          <td style={{ padding: 8 }}>
                            <span className={`status-badge ${entry.status.toLowerCase()}`}>{entry.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <section className="shift-summary-card">
        <div className="shift-summary-header">
          <h2>Shift Summary</h2>
          <p className="muted">Daily production overview by material</p>
        </div>

        <div className="shift-summary-controls">
          <div className="control-group">
            <label htmlFor="summary-date">Date</label>
            <input
              type="date"
              id="summary-date"
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
            />
          </div>

          <div className="control-actions">
            <button className="submit-btn" onClick={loadShiftSummary}>
              Load Summary
            </button>
            <button className="secondary-btn" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <div className="summary-results">
          {summary.length === 0 ? (
            <p className="empty-state">
              Select a date and click <strong>Load Summary</strong>.
            </p>
          ) : (
            <table className="review-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Loads</th>
                  <th>Volume</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr key={item.material}>
                    <td>{item.material}</td>
                    <td>{item.loads}</td>
                    <td>{item.volume.toFixed(1)}</td>
                    <td>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Layout>
  )
}