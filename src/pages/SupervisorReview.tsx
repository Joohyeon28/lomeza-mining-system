import { useState } from 'react'

function displayMaterial(material: string) {
  if (material === 'OB (Rehabilitation)' || material === 'OB (Mining)' || material === 'Coal' || material === 'Manganese') return material;
  if (material === 'OB_REHAB') return 'OB (Rehabilitation)';
  if (material === 'OB') return 'OB (Mining)';
  if (material === 'COAL') return 'Coal';
  return material;
}
import { useDb } from '../hooks/useDb'
import { useAuth } from '../contexts/AuthContext'
import { queryAllSchemas, DEFAULT_MULTI_SCHEMAS } from '../lib/multiSchema'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import LogDetailModal from '../components/LogDetailModal'
import { useEffect as useReactEffect } from 'react'

interface ProductionEntry {
  id: string
  shift_date: string
  hour: number
  shift: string
  machine_id: string
  asset_code: string
  activity: string
  material_type: string
  number_of_loads: number
  haul_distance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  _schema?: string
}

interface Summary {
  totalLoads: number
  totalVolume: number
  pending: number
  approved: number
  rejected: number
}

export default function SupervisorReview() {
  const getDb = useDb()
  const { role, site } = useAuth()
  const isAdmin = role && String(role).toLowerCase() === 'admin'
  const [siteFilter, setSiteFilter] = useState<string>(() => (isAdmin ? 'all' : site || ''))
  const formatSite = (s?: string) => {
    if (!s) return s
    return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary>({
    totalLoads: 0,
    totalVolume: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  // Log detail modal state
  const [viewEntry, setViewEntry] = useState<ProductionEntry | null>(null)
  const [breakdownDetails, setBreakdownDetails] = useState<any | null>(null)

  // Fetch breakdown details if viewing a breakdown entry
  useReactEffect(() => {
    const fetchBreakdown = async () => {
      if (viewEntry && viewEntry.activity === 'Breakdown') {
        try {
          const db = isAdmin && viewEntry._schema ? getClientForSchema(viewEntry._schema) : getDb()
          const { data, error } = await db.from('breakdowns').select('*').eq('asset_id', viewEntry.machine_id).gte('breakdown_start', `${viewEntry.shift_date}T00:00:00`).lte('breakdown_start', `${viewEntry.shift_date}T23:59:59.999`).order('breakdown_start', { ascending: false }).limit(1)
          if (!error && data && data.length) {
            setBreakdownDetails(data[0])
          } else {
            setBreakdownDetails(null)
          }
        } catch (err) {
          setBreakdownDetails(null)
        }
      } else {
        setBreakdownDetails(null)
      }
    }
    fetchBreakdown()
  }, [viewEntry])

  const loadProduction = async () => {
    setLoading(true)
    try {
      let data: any[] = []
      if (isAdmin) {
        // ...existing code...
        // Only query sileko and kalagadi schemas for production_entries
        const SCHEMAS = ['sileko', 'kalagadi']
        if (siteFilter === 'all') {
          let all: any[] = []
          for (const schema of SCHEMAS) {
            // ...existing code...
            try {
              const client = getClientForSchema(schema)
              const res = await client
                .from('production_entries')
                .select(`id,shift_date,hour,shift,machine_id,activity,material_type,number_of_loads,haul_distance,status,assets(asset_code)`)
                .eq('shift_date', selectedDate)
                .order('hour')
              if (res.error) {
                console.error(`Error fetching from ${schema}:`, res.error)
                continue
              }
              // ...existing code...
              all = [...all, ...(res.data || []).map((d: any) => ({ ...d, _schema: schema }))]
            } catch (err) {
              console.error(`Exception fetching from ${schema}:`, err)
            }
          }
          data = all
        } else {
          const schema = SCHEMAS.includes(siteFilter) ? siteFilter : SCHEMAS[0]
          const client = getClientForSchema(schema)
          const res = await client
            .from('production_entries')
            .select(`id,shift_date,hour,shift,machine_id,activity,material_type,number_of_loads,haul_distance,status,assets(asset_code)`)
            .eq('shift_date', selectedDate)
            .order('hour')
          if (res.error) {
            console.error(`Error fetching from ${schema}:`, res.error)
            data = []
          } else {
            // ...existing code...
            data = (res.data || []).map((d: any) => ({ ...d, _schema: schema }))
          }
        }
      } else {
        const { data: _data, error } = await getDb()
          .from('production_entries')
          .select(
            `id,shift_date,hour,shift,machine_id,assets ( asset_code ),activity,material_type,number_of_loads,haul_distance,status`
          )
          .eq('shift_date', selectedDate)
          .order('hour')
        if (error) throw error
        data = _data || []
      }

      // ...existing code...
      const formatted = (data || []).map((item: any) => ({
        ...item,
        asset_code: item.assets?.asset_code || item.asset_code || '',
        machine_id: item.machine_id || '',
        submitted_by: item.submitted_by || '',
        created_at: item.created_at || '',
      }))
      // ...existing code...

      setEntries(formatted)

      // Calculate summary
      const totalLoads = formatted.reduce(
        (acc, e) => acc + (e.number_of_loads || 0),
        0
      )
      const totalVolume = formatted.reduce(
        (acc, e) => acc + (e.number_of_loads || 0) * (e.haul_distance || 0),
        0
      )
      const pending = formatted.filter((e) => e.status === 'PENDING').length
      const approved = formatted.filter((e) => e.status === 'APPROVED').length
      const rejected = formatted.filter((e) => e.status === 'REJECTED').length

      setSummary({ totalLoads, totalVolume, pending, approved, rejected })
    } catch (err) {
      console.error('Error loading production:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string, schema?: string) => {
    try {
      if (schema) {
        const client = getClientForSchema(schema)
        const { error } = await client.from('production_entries').update({ status: newStatus }).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await getDb()
          .from('production_entries')
          .update({ status: newStatus })
          .eq('id', id)
        if (error) throw error
      }

      // Refresh the list
      await loadProduction()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const bulkAction = async (newStatus: string) => {
    const pending = entries.filter((e) => e.status === 'PENDING')
    if (pending.length === 0) return

    try {
      if (isAdmin) {
        // group by schema
        const bySchema: Record<string, string[]> = {}
        for (const e of pending) {
          const schema = e._schema || (site || '')
          if (!bySchema[schema]) bySchema[schema] = []
          bySchema[schema].push(e.id)
        }
        await Promise.all(Object.entries(bySchema).map(async ([schema, ids]) => {
          const client = getClientForSchema(schema)
          return client.from('production_entries').update({ status: newStatus }).in('id', ids)
        }))
      } else {
        const ids = pending.map(e => e.id)
        const { error } = await getDb().from('production_entries').update({ status: newStatus }).in('id', ids)
        if (error) throw error
      }

      await loadProduction()
    } catch (err) {
      console.error(`Error bulk ${newStatus}:`, err)
    }
  }

  return (
    <Layout activePage="/supervisor-review">
      <div className="review-page">
        <header className="review-header">
          <h1>Supervisor Review</h1>
          <p className="subtext">Daily Production Verification & Approval</p>
        </header>

        <div className="review-bar">
          <div className="review-controls">
            <label htmlFor="review-date">Select Date</label>
            <input
              type="date"
              id="review-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {isAdmin && (
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={{ marginLeft: 8, padding: '6px 8px' }}>
                <option value="all">All Sites</option>
                <option value="sileko">Sileko</option>
                <option value="kalagadi">Kalagadi</option>
              </select>
            )}
            <button className="submit-btn" onClick={loadProduction}>
              Load Production
            </button>
          </div>
          <div className={`status-badge ${summary.pending > 0 ? 'pending' : 'approved'}`}>
            {summary.pending} PENDING
          </div>
        </div>

        <section className="review-section">
          <h2>Production Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <span>Total Loads</span>
              <strong>{summary.totalLoads}</strong>
            </div>
            <div className="summary-card">
              <span>Total Volume</span>
              <strong>{summary.totalVolume.toFixed(1)}</strong>
            </div>
            <div className="summary-card">
              <span>Approved</span>
              <strong className="positive">{summary.approved}</strong>
            </div>
            <div className="summary-card">
              <span>Rejected</span>
              <strong className="danger">{summary.rejected}</strong>
            </div>
          </div>
        </section>

        <section className="review-section">
          <h2>Production Details</h2>
          {loading ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p className="empty-state">No production entries for this date.</p>
          ) : (
            <table className="review-table">
              <thead>
                  <tr>
                    {isAdmin && <th>Site</th>}
                    <th>Machine</th>
                    <th>Hour</th>
                    <th>Activity</th>
                    <th>Material</th>
                    <th>Loads</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => setViewEntry(entry)}>
                    {isAdmin && <td>{formatSite(entry._schema)}</td>}
                    <td>{entry.asset_code ? entry.asset_code : entry.machine_id}</td>
                    <td>{entry.hour}:00</td>
                    <td>{entry.activity}</td>
                    <td>{displayMaterial(entry.material_type)}</td>
                    <td>{entry.number_of_loads}</td>
                    <td>{entry.haul_distance}</td>
                    <td>
                      <span className={`status-badge ${entry.status.toLowerCase()}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>
                      {entry.status === 'PENDING' && (
                        <div className="action-buttons" onClick={e => e.stopPropagation()}>
                          <button
                            className="approve-btn"
                            onClick={() => updateStatus(entry.id, 'APPROVED')}
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => updateStatus(entry.id, 'REJECTED')}
                            title="Reject"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Log Detail Modal (must be outside table/tbody) */}
        {viewEntry && (
          <LogDetailModal entry={viewEntry} breakdown={breakdownDetails} onClose={() => setViewEntry(null)} />
        )}

        {summary.pending > 0 && (
          <div className="action-bar">
            <button
              className="submit-btn success"
              onClick={() => bulkAction('APPROVED')}
            >
              Approve All Pending
            </button>
            <button
              className="submit-btn danger"
              onClick={() => bulkAction('REJECTED')}
            >
              Reject All Pending
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}