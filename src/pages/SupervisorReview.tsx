import { useState } from 'react'
import { useDb } from '../hooks/useDb'
import Layout from '../components/Layout'

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

  const loadProduction = async () => {
    setLoading(true)
    try {
      const { data, error } = await getDb()
        .from('production_entries')
        .select(
          `
          id,
          shift_date,
          hour,
          shift,
          machine_id,
          assets ( asset_code ),
          activity,
          material_type,
          number_of_loads,
          haul_distance,
          status
        `
        )
        .eq('shift_date', selectedDate)
        .order('hour')

      if (error) throw error

      const formatted = data.map((item: any) => ({
        ...item,
        asset_code: item.assets?.asset_code || item.machine_id,
      }))

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

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await getDb()
        .from('production_entries')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Refresh the list
      await loadProduction()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const bulkAction = async (newStatus: string) => {
    const pendingIds = entries
      .filter((e) => e.status === 'PENDING')
      .map((e) => e.id)
    if (pendingIds.length === 0) return

    try {
      const { error } = await getDb()
        .from('production_entries')
        .update({ status: newStatus })
        .in('id', pendingIds)

      if (error) throw error

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
                  <tr key={entry.id}>
                    <td>{entry.asset_code}</td>
                    <td>{entry.hour}:00</td>
                    <td>{entry.activity}</td>
                    <td>{entry.material_type}</td>
                    <td>{entry.number_of_loads}</td>
                    <td>{entry.haul_distance}</td>
                    <td>
                      <span className={`status-badge ${entry.status.toLowerCase()}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>
                      {entry.status === 'PENDING' && (
                        <div className="action-buttons">
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