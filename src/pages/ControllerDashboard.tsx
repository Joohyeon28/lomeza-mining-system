import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

interface ProductionEntry {
  id: string
  machine_id: string
  shift_date: string
  hour: number
  activity: string
  number_of_loads: number
  haul_distance: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  assets: { asset_code: string }[] | null  // joined from foreign key
}

export default function ControllerDashboard() {
  const { user, site } = useAuth()
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchTodayEntries = async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
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

      if (error) console.error(error)
      if (data) {
        setEntries(data)
        setStats({
          total: data.length,
          approved: data.filter(e => e.status === 'APPROVED').length,
          pending: data.filter(e => e.status === 'PENDING').length,
          rejected: data.filter(e => e.status === 'REJECTED').length,
        })
      }
      setLoading(false)
    }

    fetchTodayEntries()
  }, [user])

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
                <tr key={entry.id}>
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
    </Layout>
  )
}