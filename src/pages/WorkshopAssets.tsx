import { useEffect, useState } from 'react'
import { useWorkshopDb } from '../hooks/useWorkshopDb'
import Layout from '../components/Layout'

type Asset = {
  id: string | number
  asset_code?: string
  status?: string | null
  asset_type?: string
  site?: string
  location?: string
  machine_role?: string
}

export default function WorkshopAssets() {
  const workshopDb = useWorkshopDb()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkshopAssets = async () => {
      try {
        const { data, error } = await workshopDb
          .from('assets')
          .select('*')
          .order('asset_code')

        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching workshop assets', error)
          setAssets([])
        } else {
          setAssets((data as Asset[]) || [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchWorkshopAssets()
    // workshopDb is memoized by the hook, so leaving deps empty is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Layout activePage="/workshop">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading workshop assets…</div>
      </Layout>
    )
  }

  return (
    <Layout activePage="/workshop">
      <div className="workshop-header">
        <div>
          <h1>WORKSHOP ASSETS</h1>
          <p>Central workshop inventory – SUNDRA & Devon</p>
        </div>
        <button className="add-asset-btn">+ Add Asset</button>
      </div>

      <input
        type="text"
        placeholder="Search workshop assets..."
        className="search-input"
      />

      <div className="asset-list">
        {assets.map(asset => (
          <div key={asset.id} className="asset-card">
            <div className="asset-left">
              <div className="asset-id">
                {asset.asset_code}
                <span className={`badge ${asset.status?.toLowerCase()}`}>
                  {asset.status}
                </span>
              </div>
              <div className="asset-details">
                <div>
                  <span>TYPE</span>
                  <strong>{asset.asset_type}</strong>
                </div>
                <div>
                  <span>WORKSHOP</span>
                  <strong>{asset.site}</strong>
                </div>
                <div>
                  <span>LOCATION</span>
                  <strong>{asset.location}</strong>
                </div>
                <div>
                  <span>ROLE</span>
                  <strong>{asset.machine_role}</strong>
                </div>
              </div>
            </div>
            <select className="status-select" defaultValue={asset.status ?? 'ACTIVE'}>
              <option>ACTIVE</option>
              <option>MAINTENANCE</option>
              <option>DOWN</option>
              <option>RETIRED</option>
            </select>
          </div>
        ))}
      </div>
    </Layout>
  )
}