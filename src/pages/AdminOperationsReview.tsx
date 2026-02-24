  function displayMaterial(material: string) {
    if (material === 'OB (Rehabilitation)' || material === 'OB (Mining)' || material === 'Coal' || material === 'Manganese') return material;
    if (material === 'OB_REHAB') return 'OB (Rehabilitation)';
    if (material === 'OB') return 'OB (Mining)';
    if (material === 'COAL') return 'Coal';
    return material;
  }
import { useEffect, useState } from 'react'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import LogDetailModal from '../components/LogDetailModal'
import { useEffect as useReactEffect } from 'react'
import { getClientForSchema as getSchemaClient } from '../lib/supabaseClient'

interface ProductionEntry {
  id: string
  shift_date: string
  hour: number
  machine_id: string
  asset_code: string
  activity: string
  material_type: string
  number_of_loads: number
  haul_distance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  site: string
}

interface Summary {
  totalLoads: number
  totalVolume: number
  pending: number
  approved: number
  rejected: number
}

export default function AdminOperationsReview() {
  const formatSite = (s?: string) => {
    if (!s) return s
    return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [siteFilter, setSiteFilter] = useState<string>('all')
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
          const db = viewEntry.site ? getSchemaClient(viewEntry.site.toLowerCase()) : getSchemaClient('public')
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

  useEffect(() => {
    // console.debug('AdminOperationsReview mounted');
  }, []);

  useEffect(() => {
    // console.debug('Entries updated:', entries);
  }, [entries]);

  // Only query sileko and kalagadi schemas for production_entries
  const fetchFromSchema = async (schema: string, date: string): Promise<ProductionEntry[]> => {
    const client = getClientForSchema(schema)
    const { data, error } = await client
      .from('production_entries')
      .select(`
        id,
        shift_date,
        hour,
        machine_id,
        activity,
        material_type,
        number_of_loads,
        haul_distance,
        status,
        assets(asset_code)
      `)
      .eq('shift_date', date)

    if (error) {
      console.error(`Error fetching from ${schema}:`, error)
      return []
    }
    // console.debug(`Fetched from ${schema}:`, data)
    return (data || []).map((item: any) => ({
      ...item,
      asset_code: item.assets?.asset_code || item.asset_code || '',
      machine_id: item.machine_id || '',
      site: schema === 'sileko' ? 'Sileko' : 'Kalagadi',
      submitted_by: item.submitted_by || '',
      created_at: item.created_at || '',
    }))
  }

  const loadProduction = async () => {
    // console.debug('Calling loadProduction', { selectedDate, siteFilter });
    setLoading(true)
    try {
      let siteEntries: ProductionEntry[] = []
      // Only query sileko and kalagadi schemas for production_entries
      if (siteFilter === 'all' || siteFilter === 'sileko') {
        const sileko = await fetchFromSchema('sileko', selectedDate)
        siteEntries = [...siteEntries, ...sileko]
      }
      if (siteFilter === 'all' || siteFilter === 'kalagadi') {
        const kalagadi = await fetchFromSchema('kalagadi', selectedDate)
        siteEntries = [...siteEntries, ...kalagadi]
      }

      // Sort by hour and site
      siteEntries.sort((a, b) => a.hour - b.hour)
      // console.debug('Combined siteEntries:', siteEntries)
      setEntries(siteEntries)

      // Calculate summary
      const totalLoads = siteEntries.reduce(
        (acc, e) => acc + (e.number_of_loads || 0),
        0
      )
      const totalVolume = siteEntries.reduce(
        (acc, e) => acc + (e.number_of_loads || 0) * (e.haul_distance || 0),
        0
      )
      const pending = siteEntries.filter((e) => e.status === 'PENDING').length
      const approved = siteEntries.filter((e) => e.status === 'APPROVED').length
      const rejected = siteEntries.filter((e) => e.status === 'REJECTED').length

      setSummary({ totalLoads, totalVolume, pending, approved, rejected })
    } catch (err) {
      console.error('Error loading production:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string, site: string) => {
    const schema = site.toLowerCase() === 'sileko' ? 'sileko' : 'kalagadi'
    const client = getClientForSchema(schema)
    try {
      const { error } = await client
        .from('production_entries')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      await loadProduction() // refresh
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const bulkAction = async (newStatus: string) => {
    const pendingEntries = entries.filter((e) => e.status === 'PENDING')
    // Group by site to update per schema
    const bySite: Record<string, ProductionEntry[]> = {}
    pendingEntries.forEach((e) => {
      const site = e.site.toLowerCase() === 'sileko' ? 'sileko' : 'kalagadi'
      if (!bySite[site]) bySite[site] = []
      bySite[site].push(e)
    })

    try {
      await Promise.all(
        Object.entries(bySite).map(async ([schema, list]) => {
          const client = getClientForSchema(schema)
          const ids = list.map((e) => e.id)
          return client
            .from('production_entries')
            .update({ status: newStatus })
            .in('id', ids)
        })
      )
      await loadProduction()
    } catch (err) {
      console.error('Bulk action error:', err)
    }
  }

  useEffect(() => {
    // Optionally load default data on mount
    loadProduction()
  }, [])

  return (
    <Layout activePage="/admin-operations-review">
      <div className="review-page">
        <header className="review-header">
          <h1>Operations Review</h1>
          <p className="subtext">Global production oversight</p>
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
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              style={{ marginLeft: '10px', padding: '8px' }}
            >
              <option value="all">All Sites</option>
              <option value="sileko">Sileko</option>
              <option value="kalagadi">Kalagadi</option>
            </select>
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
                  <th>Site</th>
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
                  <tr key={`${entry.site}-${entry.id}`} style={{ cursor: 'pointer' }} onClick={() => setViewEntry(entry)}>
                    <td>{formatSite(entry.site)}</td>
                    <td className="machine-id">{entry.asset_code ? entry.asset_code : entry.machine_id}</td>
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
                            onClick={() => updateStatus(entry.id, 'APPROVED', entry.site)}
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => updateStatus(entry.id, 'REJECTED', entry.site)}
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