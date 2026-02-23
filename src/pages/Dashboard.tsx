import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { queryAllSchemas } from '../lib/multiSchema'
import Layout from '../components/Layout'

interface MetricData {
  totalLoads: number
  totalVolume: number
  pendingReviews: number
  activeExceptions: number
}

interface MachinePerformance {
  asset_code: string
  total_loads: number
  hours_logged: number
  avg_loads_per_hour: number
}

interface ProductionMetricRow {
  number_of_loads: number | null
  haul_distance: number | null
  status: string | null
}

interface PerformanceRow {
  number_of_loads: number | null
  hour: number | null
  machine_id?: string | null
  assets?: { asset_code?: string | null } | { asset_code?: string | null }[] | null
}

export default function Dashboard() {
  const { role, site } = useAuth()
  const getDb = useDb()
  const [metrics, setMetrics] = useState<MetricData>({
    totalLoads: 0,
    totalVolume: 0,
    pendingReviews: 0,
    activeExceptions: 0,
  })
  const [machinePerformance, setMachinePerformance] = useState<MachinePerformance[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = role?.toLowerCase() === 'admin'

  const toMachinePerformance = (rows: PerformanceRow[]): MachinePerformance[] => {
    const perfMap = new Map<string, { loads: number; hours: Set<number> }>()

    rows.forEach((entry) => {
      const assetsValue = entry.assets
      const assetCode = Array.isArray(assetsValue)
        ? assetsValue[0]?.asset_code
        : assetsValue?.asset_code
      const code = assetCode || entry.machine_id
      if (!code) return

      if (!perfMap.has(code)) {
        perfMap.set(code, { loads: 0, hours: new Set<number>() })
      }

      const rec = perfMap.get(code)
      if (!rec) return
      rec.loads += entry.number_of_loads || 0
      if (typeof entry.hour === 'number') rec.hours.add(entry.hour)
    })

    return Array.from(perfMap.entries()).map(([code, val]) => ({
      asset_code: code,
      total_loads: val.loads,
      hours_logged: val.hours.size,
      avg_loads_per_hour: val.hours.size > 0 ? val.loads / val.hours.size : 0,
    }))
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isAdmin) {
          const schemas = ['sileko', 'kalagadi']
          const [loadsData, exceptionsData, perfData] = await Promise.all([
            queryAllSchemas<ProductionMetricRow>(
              async (client) => client.from('production_entries').select('number_of_loads, haul_distance, status'),
              schemas,
            ),
            queryAllSchemas<{ count: number }>(
              async (client) => {
                const { count, error } = await client
                  .from('exceptions')
                  .select('*', { count: 'exact', head: true })
                  .in('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'])
                return { data: [{ count: count || 0 }], error }
              },
              schemas,
            ),
            queryAllSchemas<PerformanceRow>(
              async (client) =>
                client
                  .from('production_entries')
                  .select('number_of_loads, hour, machine_id, assets ( asset_code )'),
              schemas,
            ),
          ])

          const totalLoads = loadsData.reduce((sum: number, item) => sum + (item.number_of_loads || 0), 0)
          const totalVolume = loadsData.reduce(
            (sum: number, item) => sum + (item.number_of_loads || 0) * (item.haul_distance || 0),
            0,
          )
          const pendingReviews = loadsData.filter((item) => item.status === 'PENDING').length
          const activeExceptions = exceptionsData.reduce((sum: number, item) => sum + (item.count || 0), 0)

          setMetrics({ totalLoads, totalVolume, pendingReviews, activeExceptions })
          setMachinePerformance(toMachinePerformance(perfData))
        } else {
          const db = getDb()
          const [loadsData, exceptionsData, perfData] = await Promise.all([
            db.from('production_entries').select('number_of_loads, haul_distance, status'),
            db
              .from('exceptions')
              .select('*', { count: 'exact', head: true })
              .in('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS']),
            db
              .from('production_entries')
              .select(`
                number_of_loads,
                hour,
                machine_id,
                assets ( asset_code )
              `),
          ])

          if (loadsData.error) throw loadsData.error
          if (exceptionsData.error) throw exceptionsData.error
          if (perfData.error) throw perfData.error

          const metricRows = (loadsData.data || []) as ProductionMetricRow[]
          const totalLoads = metricRows.reduce((sum: number, e) => sum + (e.number_of_loads || 0), 0)
          const totalVolume = loadsData.data.reduce(
            (sum: number, e) => sum + ((e as ProductionMetricRow).number_of_loads || 0) * ((e as ProductionMetricRow).haul_distance || 0),
            0,
          )
          const pendingReviews = metricRows.filter((e) => e.status === 'PENDING').length
          const activeExceptions = exceptionsData.count || 0

          setMetrics({ totalLoads, totalVolume, pendingReviews, activeExceptions })
          setMachinePerformance(toMachinePerformance((perfData.data || []) as PerformanceRow[]))
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [getDb, isAdmin])

  return (
    <Layout activePage="/dashboard">
      <div className="dashboard-header">
        <h1>CONTROL CENTER</h1>
        <p>{isAdmin ? 'All Sites Overview' : `${site} Operations`}</p>
      </div>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-title">TOTAL LOADS</div>
          <div className="metric-value">{metrics.totalLoads}</div>
          <div className="metric-sub">Approved production</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">TOTAL VOLUME</div>
          <div className="metric-value">{metrics.totalVolume.toFixed(1)}</div>
          <div className="metric-sub">Load × Distance</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">PENDING REVIEWS</div>
          <div className="metric-value">{metrics.pendingReviews}</div>
          <div className="metric-sub">Awaiting approval</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">ACTIVE EXCEPTIONS</div>
          <div className="metric-value">{metrics.activeExceptions}</div>
          <div className="metric-sub">Require attention</div>
        </div>
      </section>

      <section className="performance">
        <h2>MACHINE PERFORMANCE</h2>
        {loading ? (
          <p>Loading...</p>
        ) : machinePerformance.length === 0 ? (
          <p className="empty-state">No production data available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>MACHINE ID</th>
                <th>TOTAL LOADS</th>
                <th>HOURS LOGGED</th>
                <th>AVG LOADS/HOUR</th>
              </tr>
            </thead>
            <tbody>
              {machinePerformance.map((machine) => (
                <tr key={machine.asset_code}>
                  <td className="machine-id">{machine.asset_code}</td>
                  <td>{machine.total_loads}</td>
                  <td>{machine.hours_logged}</td>
                  <td>{machine.avg_loads_per_hour.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Layout>
  )
}