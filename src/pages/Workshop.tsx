import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkshopDb } from '../hooks/useWorkshopDb'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

interface Asset {
  id: string
  asset_code: string
  asset_type: string
  site: string
  location: string
  status: string
  assigned_to?: string | null
}

export default function Workshop() {
  const { role } = useAuth()
  const workshopDb = useWorkshopDb()
  const formatSite = (s?: string) => {
    if (!s) return s
    return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  }
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [codeFilter, setCodeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAsset, setNewAsset] = useState({
    asset_code: '',
    asset_type: '',
    site: 'SUNDRA',
    location: 'Workshop',
    status: 'ACTIVE',
    assigned_to: '',
  })

  const uniqueTypes = Array.from(new Set(assets.map(a => a.asset_type).filter(Boolean))).sort()
  const uniqueSites = Array.from(new Set(assets.map(a => a.site).filter(Boolean))).sort()
  const uniqueStatuses = Array.from(new Set(assets.map(a => a.status).filter(Boolean))).sort()

  const clearFilters = () => {
    setCodeFilter('')
    setTypeFilter('')
    setSiteFilter('')
    setLocationFilter('')
    setStatusFilter('')
  }

  useEffect(() => {
    fetchAssets()
  }, [workshopDb])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const [silekoRes, kalagadiRes] = await Promise.all([
        supabase.schema('sileko').from('assets').select('*'),
        supabase.schema('kalagadi').from('assets').select('*'),
      ])

      if (silekoRes.error) throw silekoRes.error
      if (kalagadiRes.error) throw kalagadiRes.error

      const combined = [
        ...(silekoRes.data ?? []),
        ...(kalagadiRes.data ?? []),
      ].sort((a: any, b: any) => String(a.asset_code).localeCompare(String(b.asset_code)))

      setAssets(combined)
      setFilteredAssets(combined)
    } catch (err) {
      console.error('Error fetching workshop assets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtered = assets.filter((asset) => {
      if (codeFilter && !asset.asset_code.toLowerCase().includes(codeFilter.toLowerCase())) return false
      if (typeFilter && asset.asset_type !== typeFilter) return false
      if (siteFilter && asset.site !== siteFilter) return false
      if (locationFilter && !(asset.location || '').toLowerCase().includes(locationFilter.toLowerCase())) return false
      if (statusFilter && asset.status !== statusFilter) return false
      return true
    })
    setFilteredAssets(filtered)
  }, [codeFilter, typeFilter, siteFilter, locationFilter, statusFilter, assets])

  const updateStatus = async (assetId: string, newStatus: string) => {
    if (role?.toLowerCase() !== 'admin') return
    try {
      const { error } = await workshopDb
        .from('assets')
        .update({ status: newStatus })
        .eq('id', assetId)

      if (error) throw error

      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, status: newStatus } : a))
      )
    } catch (err) {
      console.error('Error updating asset status:', err)
    }
  }

  const handleAddAsset = async () => {
    try {
      const { error } = await workshopDb.from('assets').insert({
        asset_code: newAsset.asset_code,
        asset_type: newAsset.asset_type,
        site: newAsset.site,
        location: newAsset.location,
        status: newAsset.status,
        assigned_to: newAsset.assigned_to || null,
      })

      if (error) throw error

      setShowAddModal(false)
      setNewAsset({
        asset_code: '',
        asset_type: '',
        site: 'SUNDRA',
        location: 'Workshop',
        status: 'ACTIVE',
        assigned_to: '',
      })
      await fetchAssets()
    } catch (err) {
      console.error('Error adding asset:', err)
    }
  }

  return (
    <Layout activePage="/workshop">
      <div className="workshop-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>WORKSHOP MANAGEMENT</h1>
          <p>Asset tracking and maintenance</p>
        </div>
        {role?.toLowerCase() === 'admin' && (
          <button
            className="add-asset-btn"
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(37,99,235,0.15)'
            }}
          >
            ＋ Add Asset
          </button>
        )}
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Machine code"
          value={codeFilter}
          onChange={(e) => setCodeFilter(e.target.value)}
          style={{ padding: '8px', minWidth: 160 }}
        />

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px' }}>
          <option value="">All types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} style={{ padding: '8px' }}>
          <option value="">All sites</option>
          {uniqueSites.map((s) => (
            <option key={s} value={s}>{formatSite(s)}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: '8px', minWidth: 160 }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px' }}>
          <option value="">All status</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button className="secondary-btn" onClick={clearFilters} style={{ padding: '8px' }}>
          Clear
        </button>
      </div>

      {loading ? (
        <p>Loading assets...</p>
      ) : filteredAssets.length === 0 ? (
        <p className="empty-state">No assets found.</p>
      ) : (
        <div
          className="asset-list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            alignItems: 'stretch'
          }}
        >
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="asset-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 140,
                  boxShadow: '0 6px 18px rgba(15,23,42,0.06)'
                }}
            >
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{asset.asset_code}</div>
                    <div style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, background: '#f3f4f6' }}>
                      <span style={{ color: '#374151' }}>{asset.status}</span>
                    </div>
                  </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>TYPE</div>
                    <div style={{ fontWeight: 600 }}>{asset.asset_type}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>SITE</div>
                    <div style={{ fontWeight: 600 }}>{formatSite(asset.site)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>LOCATION</div>
                    <div style={{ fontWeight: 600 }}>{asset.location || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>ASSIGNED</div>
                    <div style={{ fontWeight: 600 }}>{asset.assigned_to || '—'}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {role?.toLowerCase() === 'admin' ? (
                  <select
                    className="status-select"
                    value={asset.status}
                    onChange={(e) => updateStatus(asset.id, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #2a2a2a' }}
                  >
                    <option>ACTIVE</option>
                    <option>DOWN</option>
                    <option>MAINTENANCE</option>
                  </select>
                ) : (
                  <span className={`status-badge ${asset.status?.toLowerCase()}`}>
                    {asset.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div
          className="modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#070707',
              padding: 20,
              borderRadius: 12,
              width: 780,
              maxWidth: '95%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Add New Workshop Asset</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af' }}>Asset Code</label>
                <input
                  type="text"
                  value={newAsset.asset_code}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Asset Type</label>
                <input
                  type="text"
                  value={newAsset.asset_type}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Workshop Site</label>
                <select
                  value={newAsset.site}
                  onChange={(e) => setNewAsset({ ...newAsset, site: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                >
                  <option value="SUNDRA">SUNDRA</option>
                  <option value="Devon">Devon</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#9ca3af' }}>Location (optional)</label>
                <input
                  type="text"
                  value={newAsset.location}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Status</label>
                <select
                  value={newAsset.status}
                  onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                >
                  <option>ACTIVE</option>
                  <option>DOWN</option>
                  <option>MAINTENANCE</option>
                </select>

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Assigned To (optional)</label>
                <input
                  type="text"
                  value={newAsset.assigned_to}
                  onChange={(e) => setNewAsset({ ...newAsset, assigned_to: e.target.value })}
                  style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="secondary-btn" onClick={() => setShowAddModal(false)} style={{ padding: '10px 14px', borderRadius: 8, background: 'transparent', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleAddAsset} style={{ padding: '10px 14px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none' }}>
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}