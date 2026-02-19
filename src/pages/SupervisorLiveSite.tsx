import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import Layout from '../components/Layout'

interface Machine {
  id: string
  asset_code: string
  asset_type: string
  site: string
  location: string
  status: string
  assigned_to?: string
}

export default function SupervisorLiveSite() {
  const { site } = useAuth()
  const getDb = useDb()
  const formatSite = (s?: string | null) => {
    if (!s) return s
    return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMachines = async () => {
    setLoading(true)
    try {
      const { data, error } = await getDb()
        .from('assets')
        .select('id, asset_code, asset_type, site, location, status, assigned_to')
        .eq('site', site)
        .order('asset_code')

      if (error) throw error
      setMachines(data || [])
    } catch (err) {
      console.error('Error fetching machines:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [getDb, site])

  return (
    <Layout activePage="/supervisor-live-site">
      <div className="live-header">
        <div>
          <h1>LIVE SITE VIEW</h1>
          <p>Real-time machine status</p>
        </div>
        <button className="refresh-btn" onClick={fetchMachines}>
          ⟳ Refresh
        </button>
      </div>

      <div className="live-grid">
        {loading ? (
          <p>Loading machines...</p>
        ) : machines.length === 0 ? (
          <p className="empty-state">No machines found for {formatSite(site)}.</p>
        ) : (
          machines.map((machine) => (
            <div key={machine.id} className="machine-card">
              <div className="card-header">
                <span className="machine-id">{machine.asset_code}</span>
                <span className={`status ${machine.status?.toLowerCase()}`}>
                  {machine.status}
                </span>
              </div>
              <div className="card-body">
                <div>
                  <span>Type:</span> {machine.asset_type}
                </div>
                <div>
                  <span>Site:</span> {formatSite(machine.site)}
                </div>
                <div>
                  <span>Location:</span> {machine.location}
                </div>
                <div>
                  <span>Assigned:</span> {machine.assigned_to || '—'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}