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
  machine_role?: string | null
  operational_status?: string | null
}

export default function Workshop() {
  const { role } = useAuth()
  const workshopDb = useWorkshopDb()

  const formatSite = (s?: string) => {
    if (!s) return s
    return String(s)
      .split(' ')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ')
  }

  const formatCapitalize = (s?: string | null) => {
    if (!s) return '—'
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }

  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [codeFilter, setCodeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [machineRoleFilter, setMachineRoleFilter] = useState('')
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

  const uniqueTypes = Array.from(new Set(assets.map((a) => a.asset_type).filter(Boolean))).sort()
  const uniqueSites = Array.from(new Set(assets.map((a) => a.site).filter(Boolean))).sort()
  const uniqueStatuses = Array.from(new Set(assets.map((a) => a.status).filter(Boolean))).sort()
  const uniqueMachineRoles = Array.from(new Set(assets.map((a) => a.machine_role).filter((r): r is string => Boolean(r)))).sort()

  const clearFilters = () => {
    setCodeFilter('')
    setTypeFilter('')
    setSiteFilter('')
    setLocationFilter('')
    setStatusFilter('')
    setMachineRoleFilter('')
  }

  useEffect(() => {
    fetchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopDb])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      // Always fetch workshop.assets first
      const workshopRes = await workshopDb.from('assets').select('*')
      console.log('[DEBUG] Raw workshopDb.from(\'assets\').select(\'*\') response:', workshopRes)
      if (workshopRes.error) {
        console.error('Error fetching workshop.assets:', workshopRes.error)
      }
      if (!workshopRes.data || !Array.isArray(workshopRes.data)) {
        console.warn('[DEBUG] workshopRes.data is not an array:', workshopRes.data)
      } else if (workshopRes.data.length === 0) {
        console.warn('[DEBUG] workshopRes.data is an empty array')
      } else {
        console.log('[DEBUG] workshopRes.data sample:', workshopRes.data[0])
      }
      const workshopAssets = (workshopRes.data ?? []).map((a: any) => ({
        id: a.id,
        asset_code: a.asset_code,
        asset_type: a.asset_type,
        site: a.site,
        location: a.location,
        status: a.status,
        assigned_to: a.assigned_to ?? null,
        machine_role: a.machine_role ?? null,
        operational_status: a.operational_status ?? null,
      }))

      // Fetch other schemas in parallel
      const [silekoResult, kalagadiResult] = await Promise.allSettled([
        supabase.schema('sileko').from('assets').select('*'),
        supabase.schema('kalagadi').from('assets').select('*'),
      ])

      const schemaData: Asset[] = [...workshopAssets]

      const collectData = (result: PromiseSettledResult<{ data: any[] | null; error: any }>, schema: string) => {
        if (result.status === 'rejected') {
          console.warn(`Error fetching ${schema}.assets:`, result.reason)
          return
        }
        if (result.value.error) {
          console.warn(`Error fetching ${schema}.assets:`, result.value.error)
          return
        }
        schemaData.push(...(result.value.data ?? []).map((a: any) => ({
          id: a.id,
          asset_code: a.asset_code,
          asset_type: a.asset_type,
          site: a.site,
          location: a.location,
          status: a.status,
          assigned_to: a.assigned_to ?? null,
          machine_role: a.machine_role ?? null,
          operational_status: a.operational_status ?? a.current_location ?? null,
        })))
      }

      collectData(silekoResult, 'sileko')
      collectData(kalagadiResult, 'kalagadi')

      const combined = schemaData.sort((a: any, b: any) =>
        String(a.asset_code).localeCompare(String(b.asset_code)),
      )

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
      if (locationFilter && (asset.location || '').toLowerCase() !== locationFilter.toLowerCase()) return false
      if (statusFilter && asset.status !== statusFilter) return false
      if (machineRoleFilter && asset.machine_role !== machineRoleFilter) return false
      return true
    })
    setFilteredAssets(filtered)
  }, [codeFilter, typeFilter, siteFilter, locationFilter, statusFilter, machineRoleFilter, assets])

  const updateStatus = async (assetId: string, newStatus: string) => {
    if (role?.toLowerCase() !== 'admin') return
    try {
      const { error } = await workshopDb.from('assets').update({ status: newStatus }).eq('id', assetId)
      if (error) throw error
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, status: newStatus } : a)))
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
      setNewAsset({ asset_code: '', asset_type: '', site: 'SUNDRA', location: 'Workshop', status: 'ACTIVE', assigned_to: '' })
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

      <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: 160, flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ee', background: '#fff', minWidth: 160 }}>
            <option value="">All types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 160, flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Site</label>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ee', background: '#fff', minWidth: 160 }}>
            <option value="">All sites</option>
            {uniqueSites.map((s) => (
              <option key={s} value={s}>
                {formatSite(s)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 160, flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Location</label>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ee', background: '#fff', minWidth: 160 }}>
            <option value="">All</option>
            <option value="Site">Site</option>
            <option value="Workshop">Workshop</option>
          </select>
        </div>

        <div style={{ minWidth: 160, flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ee', background: '#fff', minWidth: 160 }}>
            <option value="">All status</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Machine Role Filter */}
        <div style={{ minWidth: 160, flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Machine Role</label>
          <select value={machineRoleFilter} onChange={(e) => setMachineRoleFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ee', background: '#fff', minWidth: 160 }}>
            <option value="">All roles</option>
            {uniqueMachineRoles.map((r: string) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: 'relative', minWidth: 240, maxWidth: 420, flex: '1 1 320px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} aria-hidden>
            <path d="M21 21l-4.35-4.35" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="11" r="6" stroke="#9ca3af" strokeWidth="1.5" />
          </svg>
          <input
            type="text"
            placeholder="Search machine code or type..."
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            style={{ boxSizing: 'border-box', padding: '10px 12px 10px 36px', width: '100%', borderRadius: 10, border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 4px 14px rgba(2,6,23,0.04)', background: '#fff' }}
          />
        </div>

        <button className="secondary-btn" onClick={clearFilters} style={{ padding: '10px 12px', borderRadius: 10, background: 'transparent', border: '1px solid #e6e9ee', color: '#374151' }}>
          Clear
        </button>
      </div>

      {loading ? (
        <p>Loading assets...</p>
      ) : filteredAssets.length === 0 ? (
        <p className="empty-state">No assets found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e6e9ee' }}>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Site</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Assigned</th>
                <th style={{ padding: '12px 16px' }}>Machine Role</th>
                <th style={{ padding: '12px 16px' }}>Operational Status</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{asset.asset_code}</td>
                  <td style={{ padding: '12px 16px' }}>{asset.asset_type}</td>
                  <td style={{ padding: '12px 16px' }}>{formatSite(asset.site)}</td>
                  <td style={{ padding: '12px 16px' }}>{asset.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{asset.assigned_to || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{formatCapitalize(asset.machine_role)}</td>
                  <td style={{ padding: '12px 16px' }}>{formatCapitalize(asset.operational_status)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {role?.toLowerCase() === 'admin' ? (
                      <select value={asset.status} onChange={(e) => updateStatus(asset.id, e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #2a2a2a' }}>
                        <option>ACTIVE</option>
                        <option>DOWN</option>
                        <option>MAINTENANCE</option>
                      </select>
                    ) : (
                      <span style={{ padding: '6px 8px', borderRadius: 6, background: '#f3f4f6', color: '#374151' }}>{asset.status}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {role?.toLowerCase() === 'admin' && (
                      <button onClick={() => {}} style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="modal" style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div className="modal-card" style={{ background: '#070707', padding: 20, borderRadius: 12, width: 780, maxWidth: '95%', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Add New Workshop Asset</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af' }}>Asset Code</label>
                <input type="text" value={newAsset.asset_code} onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }} />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Asset Type</label>
                <input type="text" value={newAsset.asset_type} onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }} />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Workshop Site</label>
                <select value={newAsset.site} onChange={(e) => setNewAsset({ ...newAsset, site: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}>
                  <option value="SUNDRA">SUNDRA</option>
                  <option value="Devon">Devon</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#9ca3af' }}>Location (optional)</label>
                <input type="text" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }} />

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Status</label>
                <select value={newAsset.status} onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }}>
                  <option>ACTIVE</option>
                  <option>DOWN</option>
                  <option>MAINTENANCE</option>
                </select>

                <label style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, display: 'block' }}>Assigned To (optional)</label>
                <input type="text" value={newAsset.assigned_to} onChange={(e) => setNewAsset({ ...newAsset, assigned_to: e.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #222', background: '#0b0b0b', color: '#fff' }} />
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
