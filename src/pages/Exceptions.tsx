import React, { useEffect, useState } from 'react'
import { useDb } from '../hooks/useDb'
import { getClientForSchema } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

const formatSite = (s?: string) => {
  if (!s) return s
  return String(s).split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
}

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
  const { user, displayName } = useAuth()
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
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
          .select(`id,reason,status,site,breakdown_start,reported_by,operator,acknowledged,acknowledged_by,acknowledged_at,assets ( asset_code )`)
          .order('breakdown_start', { ascending: false })
        bdData = res.data
        if (res.error) {
          // fallback: try without operator to avoid schema-specific column errors
          const res2 = await getDb()
            .from('breakdowns')
            .select(`id,reason,status,site,breakdown_start,reported_by,acknowledged,acknowledged_by,acknowledged_at,assets ( asset_code )`)
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
        acknowledged: item.acknowledged,
        acknowledged_by: item.acknowledged_by,
        acknowledged_at: item.acknowledged_at,
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

  const updateStatus = async (id: string, newStatus: string, source: 'exception' | 'breakdown' = 'exception'): Promise<boolean> => {
    try {
      const table = source === 'breakdown' ? 'breakdowns' : 'exceptions'
      const payload: Record<string, any> = { status: newStatus }

      // When acknowledging a breakdown, also set the acknowledged flag and auditor fields
      if (source === 'breakdown' && String(newStatus).toUpperCase() === 'ACKNOWLEDGED') {
        payload.acknowledged = true
        try {
          const ts = new Date().toISOString()
          // prefer the human-readable displayName, fall back to email or id
          if (displayName) payload.acknowledged_by = displayName
          else if (user && (user.email || user.id)) payload.acknowledged_by = (user as any).email || user.id
          payload.acknowledged_at = ts
        } catch (e) {
          // ignore
        }
      }

      // Try updating using the primary client first; if that fails due to
      // missing columns in the schema cache, progressively remove the
      // offending columns from the payload and retry. If still failing,
      // try a set of candidate schemas.
      const tryUpdateWithFallback = async (client: any, tbl: string, basePayload: Record<string, any>) => {
        let attemptPayload = { ...basePayload }
        let lastError: any = null
        // Keep retrying while the error indicates a missing column and we can remove it
        while (true) {
          try {
            // Request the updated row(s) back so we can tell if anything was changed.
            const res = await client.from(tbl).update(attemptPayload).eq('id', id).select()
            if (!res.error) {
              // If no rows were returned, treat as a failure (often RLS prevented the change).
              if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
                lastError = new Error('No rows updated (possible RLS or permission issue)')
                // fall through to the generic handling below which may attempt to strip columns
              } else {
                return { success: true }
              }
            } else {
              lastError = res.error
            }
            const msg = (lastError && ((lastError as any).message || (lastError as any).msg)) || String(lastError)
            const m = String(msg).match(/Could not find the '([^']+)' column/)
            if (m && m[1] && Object.prototype.hasOwnProperty.call(attemptPayload, m[1])) {
              // Remove the missing column and retry
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete attemptPayload[m[1]]
              continue
            }
            // Some PostgREST errors may include "could not find column" phrasing
            const m2 = String(msg).match(/could not find column "?([^\"]+)"?/i)
            if (m2 && m2[1] && Object.prototype.hasOwnProperty.call(attemptPayload, m2[1])) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete attemptPayload[m2[1]]
              continue
            }
            return { success: false, error: lastError }
          } catch (e) {
            lastError = e
            const msg = String(e && ((e as any).message || e))
            const m = msg.match(/Could not find the '([^']+)' column/)
            if (m && m[1] && Object.prototype.hasOwnProperty.call(attemptPayload, m[1])) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete attemptPayload[m[1]]
              continue
            }
            const m2 = msg.match(/could not find column "?([^\"]+)"?/i)
            if (m2 && m2[1] && Object.prototype.hasOwnProperty.call(attemptPayload, m2[1])) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete attemptPayload[m2[1]]
              continue
            }
            return { success: false, error: lastError }
          }
        }
      }

      // Try primary client
      const primaryRes = await tryUpdateWithFallback(getDb(), table, payload)
      if (primaryRes.success) {
        try { window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id, source } })) } catch (e) {}
        return true
      }
      console.error('Primary client update failed:', primaryRes.error)

      // If primary failed, try candidate schemas
      const candidateSchemas = Array.from(new Set(['sileko', 'public', 'workshop', 'kalagadi']))
      for (const schema of candidateSchemas) {
        try {
          const client = getClientForSchema(schema)
          const res = await tryUpdateWithFallback(client, table, payload)
          if (res.success) {
            try { window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id, source } })) } catch (e) {}
            return true
          }
          console.error(`Update attempt failed for schema '${schema}':`, res.error)
        } catch (e) {
          console.error(`Exception while attempting schema '${schema}':`, e)
          // ignore and continue
        }
      }

      return false
    } catch (err) {
      console.error('Error updating exception:', err)
      return false
    }
  }

  const getNextAction = (status: string) => {
    if (status === 'OPEN') return 'Acknowledge'
    if (status === 'ACKNOWLEDGED') return 'Start Maintenance'
    if (status === 'IN_PROGRESS') return 'Resolve'
    return null
  }

  const handleAction = async (exception: any) => {
    const source = exception.source === 'breakdown' ? 'breakdown' : 'exception'
    let targetStatus: string | null = null
    if (exception.status === 'OPEN') targetStatus = 'ACKNOWLEDGED'
    else if (exception.status === 'ACKNOWLEDGED') targetStatus = 'IN_PROGRESS'
    else if (exception.status === 'IN_PROGRESS') targetStatus = 'RESOLVED'
    if (!targetStatus) return

    // Optimistic UI update: update single row locally so the table doesn't disappear
    const prev = exceptions
    const now = new Date().toISOString()

    // mark as updating
    setUpdatingIds(ids => [...ids, `${exception.source || 'exception'}-${exception.id}`])

    setExceptions(prev.map((ex: any) => {
      if (ex.id !== exception.id || ex.source !== exception.source) return ex
      const updated = { ...ex, status: targetStatus }
      if (source === 'breakdown' && targetStatus === 'ACKNOWLEDGED') {
        updated.acknowledged = true
        updated.acknowledged_by = displayName || (user as any)?.email || (user as any)?.id
        updated.acknowledged_at = now
      }
      return updated
    }))

    const ok = await updateStatus(exception.id, targetStatus, source)

    // remove updating mark
    setUpdatingIds(ids => ids.filter(i => i !== `${exception.source || 'exception'}-${exception.id}`))

    if (!ok) {
      // revert to server state on failure
      console.error('Update failed, reverting UI')
      setNotification({ text: 'Failed to update — changes reverted.', type: 'error' })
      setTimeout(() => setNotification(null), 4000)
      await fetchExceptions()
      return
    }

    setNotification({ text: 'Update saved.', type: 'success' })
    setTimeout(() => setNotification(null), 2500)
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
                      <td>{formatSite(exc.site)}</td>
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
                            {exc.source !== 'breakdown' && <div><strong>Status:</strong> {exc.status}</div>}
                            <div><strong>Date:</strong> {new Date(exc.created_at).toLocaleDateString()}</div>
                            {exc.source === 'breakdown' ? (
                              <div>
                                <div><strong>Breakdown start time:</strong> {new Date(exc.created_at).toLocaleTimeString()}</div>
                                <div><strong>Status:</strong> {exc.status}</div>
                              </div>
                            ) : (
                              <div><strong>Time:</strong> {new Date(exc.created_at).toLocaleTimeString()}</div>
                            )}
                            {/* Render any additional breakdown fields if present */}
                            {Object.entries(exc)
                              .filter(([k]) => !['id','asset_code','reason','status','site','created_at','source','reported_by','reported_by_display','assets','breakdown_start','operator','acknowledged','acknowledged_by','acknowledged_at'].includes(k))
                              .map(([k, v]) => v ? (
                                <div key={k}><strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}</div>
                              ) : null)}
                            {exc.source === 'breakdown' && exc.acknowledged_by && <div><strong>Acknowledged by:</strong> {exc.acknowledged_by}</div>}
                            {exc.source === 'breakdown' && exc.acknowledged_at && <div><strong>Acknowledged at:</strong> {(() => { try { return new Date(exc.acknowledged_at).toLocaleString() } catch (e) { return String(exc.acknowledged_at) } })()}</div>}
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