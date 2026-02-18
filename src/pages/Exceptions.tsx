import React, { useEffect, useState } from 'react'
import { useDb } from '../hooks/useDb'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'

interface Exception {
  id: string
  asset_code: string
  reason: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED'
  site: string
  created_at: string
}

export default function Exceptions() {
  const getDb = useDb()
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fetchExceptions = async () => {
    setLoading(true)
    try {
      // fetch explicit exceptions
      const { data: exData, error: exError } = await getDb()
        .from('exceptions')
        .select(`
          id,
          reason,
          status,
          site,
          created_at,
          assets ( asset_code )
        `)
        .in('status', ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })

      if (exError) throw exError

      // fetch breakdown records. Try to include `operator` where available,
      // but fall back to a minimal select if the column isn't exposed in this schema.
      let bdData = null
      try {
        // first attempt: include operator
        let res = await getDb()
          .from('breakdowns')
          .select(`id,reason,status,site,breakdown_start,reported_by,operator,assets ( asset_code )`)
          .order('breakdown_start', { ascending: false })
        bdData = res.data
        if (res.error) {
          // fallback: try without operator to avoid schema-specific column errors
          const res2 = await getDb()
            .from('breakdowns')
            .select(`id,reason,status,site,breakdown_start,reported_by,assets ( asset_code )`)
            .order('breakdown_start', { ascending: false })
          bdData = res2.data
          if (res2.error) throw res2.error
        }
      } catch (bdErr: any) {
        // surface the error to the outer handler
        throw bdErr
      }

      const formattedExceptions = (exData ?? []).map((item: any) => ({
        id: item.id,
        asset_code: item.assets?.asset_code || 'Unknown',
        reason: item.reason || 'Exception',
        status: item.status,
        site: item.site,
        created_at: item.created_at,
        source: 'exception' as const,
      }))

      // try to resolve reporter ids to display names
      let reporterMap: Record<string, string> = {}
      try {
        const reporterIds = Array.from(new Set((bdData ?? []).map((b: any) => b.reported_by).filter(Boolean)))
        if (reporterIds.length > 0) {
          // Try site-local users table first
          let users: any = null
          let usersErr: any = null
          try {
            const res = await getDb().from('users').select('id, name, email').in('id', reporterIds)
            users = res.data
            usersErr = res.error
          } catch (e) {
            users = null
            usersErr = e
          }

          // If not found, try public schema users table
          if ((!users || users.length === 0) && !reporterIds.length === false) {
            try {
              const pub = getClientForSchema('public')
              const res2 = await pub.from('users').select('id, name, email').in('id', reporterIds)
              users = res2.data
              usersErr = res2.error
            } catch (e2) {
              // ignore
            }
          }

          if (!usersErr && users) {
            reporterMap = users.reduce((acc: any, u: any) => {
              acc[u.id] = u.name || u.email || u.id
              return acc
            }, {})
          }
        }
      } catch (uErr) {
        // ignore reporter lookup errors; we'll fall back to raw id
      }

      const formattedBreakdowns = (bdData ?? []).map((item: any) => ({
        ...item,
        id: item.id,
        asset_code: item.assets?.asset_code || 'Unknown',
        reason: item.reason || item.other_reason || item.description || item.details || 'Breakdown',
        status: item.status || 'OPEN',
        site: item.site,
        created_at: item.breakdown_start || item.created_at,
        reported_by_display: (item.reported_by && reporterMap[item.reported_by]) || item.reported_by,
        source: 'breakdown' as const,
      }))

      // merge and sort by created_at desc
      const merged = [...formattedExceptions, ...formattedBreakdowns].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      setExceptions(merged as any)
    } catch (err) {
      console.error('Error fetching exceptions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExceptions()
  }, [getDb])

  const updateStatus = async (id: string, newStatus: string, source: 'exception' | 'breakdown' = 'exception') => {
    try {
      const table = source === 'breakdown' ? 'breakdowns' : 'exceptions'
      const { error } = await getDb()
        .from(table)
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      await fetchExceptions()
      // notify other views to refresh (e.g., dashboards)
      try {
        window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id, source } }))
      } catch (e) {
        // ignore dispatch errors
      }
    } catch (err) {
      console.error('Error updating exception:', err)
    }
  }

  const getNextAction = (status: string) => {
    if (status === 'OPEN') return 'Acknowledge'
    if (status === 'ACKNOWLEDGED') return 'Start Maintenance'
    if (status === 'IN_PROGRESS') return 'Resolve'
    return null
  }

  const handleAction = (exception: any) => {
    const source = exception.source === 'breakdown' ? 'breakdown' : 'exception'
    if (exception.status === 'OPEN') {
      updateStatus(exception.id, 'ACKNOWLEDGED', source)
    } else if (exception.status === 'ACKNOWLEDGED') {
      updateStatus(exception.id, 'IN_PROGRESS', source)
    } else if (exception.status === 'IN_PROGRESS') {
      updateStatus(exception.id, 'RESOLVED', source)
    }
  }

  return (
    <Layout activePage="/exceptions">
      <div className="dashboard-header">
        <h1>EXCEPTIONS</h1>
        <p>Open operational issues</p>
      </div>

      <section className="performance">
        <h2>OPEN EXCEPTIONS</h2>
        {loading ? (
            <p>Loading...</p>
          ) : exceptions.length === 0 ? (
            <p className="empty-state">No open exceptions.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>MACHINE</th>
                  <th>SITE</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((exc: any) => (
                  <React.Fragment key={`${exc.source || 'exception'}-${exc.id}`}>
                    <tr onClick={() => setExpandedId(prev => prev === `${exc.source || 'exception'}-${exc.id}` ? null : `${exc.source || 'exception'}-${exc.id}`)} style={{ cursor: 'pointer' }}>
                      <td className="machine-id">{exc.asset_code}</td>
                      <td>{exc.site}</td>
                      <td>{exc.reason}</td>
                      <td>
                        <span className={`status-badge ${exc.status.toLowerCase()}`}>
                          {exc.status}
                        </span>
                      </td>
                      <td>{new Date(exc.created_at).toLocaleString()}</td>
                      <td>
                        {exc.status !== 'RESOLVED' && (
                          <button
                            className="submit-btn small"
                            onClick={(e) => { e.stopPropagation(); handleAction(exc) }}
                          >
                            {getNextAction(exc.status)}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === `${exc.source || 'exception'}-${exc.id}` && (
                      <tr>
                        <td colSpan={6} style={{ background: '#fafafa', padding: 12 }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div><strong>Reason:</strong> {exc.reason}</div>
                            {exc.source === 'breakdown' && exc.reported_by_display && <div><strong>Reported by:</strong> {exc.reported_by_display}</div>}
                            {exc.source === 'breakdown' && exc.operator && (
                              <div><strong>Name of Operator:</strong> {exc.operator}</div>
                            )}
                            <div><strong>Status:</strong> {exc.status}</div>
                            <div><strong>Date:</strong> {new Date(exc.created_at).toLocaleDateString()}</div>
                            {exc.source === 'breakdown' ? (
                              <div><strong>Breakdown start time:</strong> {new Date(exc.created_at).toLocaleTimeString()}</div>
                            ) : (
                              <div><strong>Time:</strong> {new Date(exc.created_at).toLocaleTimeString()}</div>
                            )}
                            {/* Render any additional breakdown fields if present */}
                            {Object.entries(exc)
                              .filter(([k]) => !['id','asset_code','reason','status','site','created_at','source','reported_by','reported_by_display','assets','breakdown_start','operator'].includes(k))
                              .map(([k, v]) => v ? (
                                <div key={k}><strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}</div>
                              ) : null)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
      </section>
    </Layout>
  )
}