import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import LogDetailModal from '../components/LogDetailModal'

interface ProductionEntry {
  id: string | number
  machine_id: string
  shift_date: string
  hour: number
  activity: string
  number_of_loads: number
  haul_distance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  material_type?: string | null
  assets: { asset_code: string }[] | null  // joined from foreign key
}

interface Stats {
  total: number
  approved: number
  pending: number
  rejected: number
}

export default function ControllerDashboard() {
  const { user, site } = useAuth()
  const getDb = useDb()
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [viewEntry, setViewEntry] = useState<any | null>(null)
  const [viewBreakdown, setViewBreakdown] = useState<any | null>(null)
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})
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
    const w = getISOWeek(new Date())
    return w
  })
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })

  const getISOWeek = (dt: Date) => {
    const tmp = new Date(dt.getTime())
    tmp.setHours(0, 0, 0, 0)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${tmp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }

  const parseISOWeekToRange = (isoWeek: string) => {
    // isoWeek: "YYYY-Www" e.g. 2026-W07
    const m = isoWeek.match(/(\d{4})-W(\d{2})/)
    if (!m) return { start: new Date(0), end: new Date(0) }
    const year = Number(m[1])
    const week = Number(m[2])

    // Find Monday of ISO week 1 (the week with Jan 4)
    const jan4 = new Date(year, 0, 4)
    const jan4Day = (jan4.getDay() + 6) % 7 // Monday=0
    const mondayWeek1 = new Date(year, 0, 4 - jan4Day)

    const start = new Date(mondayWeek1)
    start.setDate(mondayWeek1.getDate() + (week - 1) * 7)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const localToday = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
  })()

  const isInTimeframe = (e: ProductionEntry) => {
    if (timeframe === 'all') return true

    // parse shift_date as local date parts
    const [ey, em, ed] = e.shift_date.split('-').map(Number)
    const d = new Date(ey, (em || 1) - 1, ed || 1)

    if (timeframe === 'shift') {
      // support full day, explicit shifts, or the 'current' shift
      const hour = Number(e.hour)
      if (shiftMode === 'full') return e.shift_date === selectedDate
      if (shiftMode === 'shiftA') return e.shift_date === selectedDate && hour >= 6 && hour < 18
      if (shiftMode === 'shiftB') return e.shift_date === selectedDate && (hour >= 18 || hour < 6)
      // 'current' shift: determine current local shift and match
      if (shiftMode === 'current') {
        const now = new Date()
        const h = now.getHours()
        if (h >= 6 && h < 18) return e.shift_date === selectedDate && hour >= 6 && hour < 18
        return e.shift_date === selectedDate && (hour >= 18 || hour < 6)
      }
      return e.shift_date === selectedDate
    }
    if (timeframe === 'week') {
      // compare by ISO-week date range (Monday - Sunday)
      const { start, end } = parseISOWeekToRange(selectedWeek)
      return d >= start && d <= end
    }
    if (timeframe === 'month') {
      const monthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      return monthStr === selectedMonth
    }
    return true
  }

  useEffect(() => {
    if (!user || !site) return

    // fetchEntries moved to top-level useCallback (see below)
    fetchEntries()

    const onEntryUpdated = (ev: Event) => {
      try {
        fetchEntries()
      } catch (e) {
        // ignore
      }
    }

    window.addEventListener('entry-updated', onEntryUpdated as EventListener)
    return () => window.removeEventListener('entry-updated', onEntryUpdated as EventListener)
  }, [user, site, getDb])

  // Top-level fetch function so UI can call Refresh and other effects can reuse it
  const fetchEntries = useCallback(async () => {
    if (!user || !site) return
    setLoading(true)
    let db
    try {
      db = getDb() // get Supabase client with site schema
    } catch (err: unknown) {
      console.error('Unable to get DB client:', err)
      setLoading(false)
      return
    }

    // Fetch recent production entries for this user (include past shifts)
    const { data, error } = await db
      .from('production_entries')
      .select(`
        id,
        machine_id,
        shift_date,
        hour,
        activity,
        number_of_loads,
        haul_distance,
        status,
        material_type,
        assets ( asset_code )
      `)
      .eq('submitted_by', user.id)
      .order('shift_date', { ascending: false })
      .order('hour', { ascending: true })
      .limit(1000)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (data) {
      // Cast data to ProductionEntry[] to avoid implicit any in filters
      const typedData = data as ProductionEntry[]

      // If embedded `assets` is missing, try to resolve asset_code from candidate schemas
      const missingIds = Array.from(new Set(
        typedData.filter(e => !(e.assets && e.assets.length)).map(e => e.machine_id).filter(Boolean)
      ))

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
            // ignore schema errors and continue
          }
        }

        filled = typedData.map(entry => ({
          ...entry,
          assets: entry.assets && entry.assets.length ? entry.assets : (assetsById[String(entry.machine_id)] ? [assetsById[String(entry.machine_id)]] : null),
        }))
      }

      setEntries(filled)
      setStats({
        total: filled.length,
        approved: filled.filter(e => e.status === 'APPROVED').length,
        pending: filled.filter(e => e.status === 'PENDING').length,
        rejected: filled.filter(e => e.status === 'REJECTED').length,
      })

      // Initialize collapsed state: expand today's group, collapse others
      const dates = Array.from(new Set(filled.map(e => e.shift_date))).sort((a, b) => b.localeCompare(a))
      const initCollapsed: Record<string, boolean> = {}
      for (const d of dates) initCollapsed[d] = d !== localToday
      setCollapsedDates(initCollapsed)
    }
    setLoading(false)
  }, [getDb, user, site, localToday])

  useEffect(() => {
    if (!entries || entries.length === 0) return
    const filtered = entries.filter(isInTimeframe)
    setStats({
      total: filtered.length,
      approved: filtered.filter(e => e.status === 'APPROVED').length,
      pending: filtered.filter(e => e.status === 'PENDING').length,
      rejected: filtered.filter(e => e.status === 'REJECTED').length,
    })
  }, [entries, timeframe, selectedDate, selectedWeek, selectedMonth, shiftMode])

  const handleRowClick = async (entry: ProductionEntry) => {
    const db = getDb()
    try {
      // Query breakdowns for the whole shift_date (day) to be robust to timezone/storage differences
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

      // Debug fetched entry + breakdown for troubleshooting
      // eslint-disable-next-line no-console
      console.debug('Controller view entry', entry, 'breakdownCandidate', data && (data as any[])[0], 'error', error)

      setViewEntry(entry)
      // If no breakdown found in the day-range, try a fallback to the latest breakdown for this asset
      if (data && (data as any[]).length) {
        let bd = (data as any[])[0]
        // resolve reporter name if possible
        if (bd.reported_by) {
          try {
            const selectedSite = site?.toLowerCase() || ''
            const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
            for (const schema of candidateSchemas) {
              try {
                const client = getClientForSchema(schema)
                const { data: udata } = await client.from('users').select('id,name,email').eq('id', bd.reported_by).limit(1)
                if (udata && (udata as any[]).length > 0) {
                  const u = (udata as any[])[0]
                  bd.reporter_name = u.name || u.email || u.id
                  break
                }
              } catch (e) {
                // ignore and continue
              }
            }
          } catch (e) {
            // ignore
          }
        }
        setViewBreakdown(bd)
      } else {
        try {
          const { data: latestData, error: latestError } = await db
            .from('breakdowns')
            .select('*')
            .eq('asset_id', entry.machine_id)
            .order('breakdown_start', { ascending: false })
            .limit(1)

          if (latestError) console.warn('Latest breakdown fallback failed', latestError)
          let latest = latestData && (latestData as any[]).length ? (latestData as any[])[0] : null
          if (latest && latest.reported_by) {
            try {
              const selectedSite = site?.toLowerCase() || ''
              const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
              for (const schema of candidateSchemas) {
                try {
                  const client = getClientForSchema(schema)
                  const { data: udata } = await client.from('users').select('id,name,email').eq('id', latest.reported_by).limit(1)
                  if (udata && (udata as any[]).length > 0) {
                    const u = (udata as any[])[0]
                    latest.reporter_name = u.name || u.email || u.id
                    break
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }
          }
          setViewBreakdown(latest)
        } catch (e) {
          console.error('Failed to run latest-breakdown fallback', e)
          setViewBreakdown(null)
        }
      }
    } catch (e) {
      console.error('Failed to load breakdown', e)
      setViewEntry(entry)
      setViewBreakdown(null)
    }
  }

  const goToCurrent = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const monthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    setTimeframe('shift')
    setShiftMode('current')
    setSelectedDate(dateStr)
    setSelectedWeek(getISOWeek(now))
    setSelectedMonth(monthStr)

    // expand today's group and collapse others
    const dates = Array.from(new Set(entries.map(e => e.shift_date)))
    const newCollapsed: Record<string, boolean> = {}
    for (const d of dates) newCollapsed[d] = d !== dateStr
    setCollapsedDates(newCollapsed)
  }

  const filteredEntries = entries.filter(isInTimeframe)

  const materialDisplay = (mt?: string | null) => {
    if (!mt) return '-'
    const key = String(mt).toLowerCase()
    if (key.includes('rehab') || key.includes('rehabilitation')) return 'OB (Rehabilitation)'
    if (key.includes('min') || key.includes('mining')) return 'OB (Mining)'
    if (key.includes('coal')) return 'Coal'
    return mt
  }

  return (
    <Layout activePage="/controller-dashboard">
      <div className="dashboard-header">
        <h1>MY PRODUCTION LOGS</h1>
        <p>
          {site} – {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* METRIC CARDS */}
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
        <button onClick={goToCurrent} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }} aria-label="Go to today and current shift">Today & Current Shift</button>
      </div>
      <section className="metrics">
        <div className="metric-card">
          <div className="metric-title">TOTAL ENTRIES</div>
          <div className="metric-value">{stats.total}</div>
          <div className="metric-sub">{timeframe === 'shift' ? 'This shift' : timeframe === 'week' ? 'Last 7 days' : timeframe === 'month' ? 'Last 30 days' : 'All time'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">APPROVED</div>
          <div className="metric-value positive">{stats.approved}</div>
          <div className="metric-sub">Supervisor approved</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">PENDING</div>
          <div className="metric-value">{stats.pending}</div>
          <div className="metric-sub">Awaiting review</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">REJECTED</div>
          <div className="metric-value">{stats.rejected}</div>
          <div className="metric-sub">Rejected entries</div>
        </div>
      </section>

      {/* PRODUCTION HISTORY TABLE */}
      <section className="performance">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Production History</h2>
          <div>
            <button onClick={() => fetchEntries()} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }} aria-label="Refresh production history">Refresh</button>
          </div>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="empty-state">{timeframe === 'shift' ? 'No production entries logged today.' : 'No production entries for the selected timeframe.'}</p>
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
                  return (
                    <div key={date} className="date-group">
                      <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button
                            onClick={() => setCollapsedDates(s => ({ ...s, [date]: !isCollapsed }))}
                            aria-expanded={!isCollapsed}
                            style={{
                              cursor: 'pointer',
                              border: 'none',
                              background: 'transparent',
                              padding: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 6,
                            }}
                            aria-label={isCollapsed ? `Expand ${date}` : `Collapse ${date}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{
                                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                                transition: 'transform 160ms ease',
                                display: 'block',
                                color: '#444'
                              }}
                              aria-hidden
                            >
                              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
                            </svg>
                          </button>
                          <strong>{date}</strong>
                          <span style={{ color: '#666' }}>— {group.length} entries</span>
                        </div>
                        <div style={{ color: '#666' }}>{date === todayStr ? 'Today' : ''}</div>
                      </div>

                      {!isCollapsed && (
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
                            {group.map(entry => (
                              <tr key={String(entry.id)} onClick={() => handleRowClick(entry)} style={{ cursor: 'pointer' }}>
                                <td className="machine-id">{entry.assets?.[0]?.asset_code || entry.machine_id}</td>
                                <td>{materialDisplay(entry.material_type)}</td>
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
              </div>
            )
          })()
        )}
      </section>
        {viewEntry && (
          <LogDetailModal
            entry={viewEntry}
            breakdown={viewBreakdown || undefined}
            onClose={() => {
              setViewEntry(null)
              setViewBreakdown(null)
            }}
          />
        )}
    </Layout>
  )
}