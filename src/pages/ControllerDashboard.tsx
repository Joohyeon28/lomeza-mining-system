import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!user || !site) return

    const fetchTodayEntries = async () => {
      const today = new Date().toISOString().split('T')[0]
      let db
      try {
        db = getDb() // get Supabase client with site schema
      } catch (err: unknown) {
        console.error('Unable to get DB client:', err)
        setLoading(false)
        return
      }

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
          assets ( asset_code )
        `)
        .eq('submitted_by', user.id)
        .eq('shift_date', today)
        .order('hour', { ascending: true })

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
      }
      setLoading(false)
    }

    fetchTodayEntries()
  }, [user, site, getDb])

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

  return (
    <Layout activePage="/controller-dashboard">
      <div className="dashboard-header">
        <h1>MY PRODUCTION LOGS</h1>
        <p>
          {site} – {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* METRIC CARDS */}
      <section className="metrics">
        <div className="metric-card">
          <div className="metric-title">TOTAL ENTRIES</div>
          <div className="metric-value">{stats.total}</div>
          <div className="metric-sub">Submitted this shift</div>
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
        <h2>Production History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">No production entries logged today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>MACHINE</th>
                <th>HOUR</th>
                <th>ACTIVITY</th>
                <th>LOADS</th>
                <th>DIST (m)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
                {entries.map(entry => (
                  <tr key={String(entry.id)} onClick={() => handleRowClick(entry)} style={{ cursor: 'pointer' }}>
                    <td className="machine-id">
                      {entry.assets?.[0]?.asset_code || entry.machine_id}
                    </td>
                    <td>{entry.hour}:00</td>
                    <td>{entry.activity}</td>
                    <td>{entry.number_of_loads || '-'}</td>
                    <td>{entry.haul_distance || '-'}</td>
                    <td>
                      <span className={`status-badge ${entry.status.toLowerCase()}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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