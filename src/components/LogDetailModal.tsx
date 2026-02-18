import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDb } from '../hooks/useDb'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getClientForSchema } from '../lib/supabaseClient'
import { getCachedUser, fetchAndCacheUser } from '../lib/userCache'

export default function LogDetailModal({
  entry,
  breakdown,
  onClose,
}: {
  entry: any
  breakdown?: any
  onClose: () => void
}) {
  const getDb = useDb()
  const { user, role, site } = useAuth()
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false)
  const [reviewerName, setReviewerName] = useState<string | null>(null)
  const [reporterName, setReporterName] = useState<string | null>(null)
  const [reporterLoading, setReporterLoading] = useState<boolean>(false)
  const [resolvedAssetCode, setResolvedAssetCode] = useState<string | null>(entry?.assets?.[0]?.asset_code || null)
  const [freshEntry, setFreshEntry] = useState<any | null>(null)
  const [breakdownReporterName, setBreakdownReporterName] = useState<string | null>(breakdown?.reporter_name || null)
  const [breakdownReporterLoading, setBreakdownReporterLoading] = useState<boolean>(false)
  
  useEffect(() => {
    let mounted = true

    const fetchLatestEntry = async () => {
      if (!entry) return
      try {
        const db = getDb()
        const { data, error } = await db.from('production_entries').select('*').eq('id', entry.id).limit(1)
        if (!mounted) return
        if (!error && data && (data as any[]).length) {
          const fetched = (data as any[])[0]
          setFreshEntry(fetched)

          // try to resolve reviewer name if any reviewer id fields present
          const reviewerId = fetched.reviewed_by || fetched.rejected_by || fetched.approved_by || fetched.reviewer_id || fetched.reviewed_by_id
          if (reviewerId) {
              try {
                let userRec: any = null
                try {
                  const r1 = await getDb().from('users').select('*').eq('id', reviewerId).limit(1)
                  if (!r1.error && r1.data && r1.data.length) userRec = r1.data[0]
                } catch (e) {
                  // ignore
                }
                if (!userRec) {
                  try {
                    const pub = getClientForSchema('public')
                    const r2 = await pub.from('users').select('*').eq('id', reviewerId).limit(1)
                    if (!r2.error && r2.data && r2.data.length) userRec = r2.data[0]
                  } catch (e) {
                    // ignore
                  }
                }
                if (!userRec) {
                  try {
                    const r3 = await supabase.from('users').select('*').eq('id', reviewerId).limit(1)
                    if (!r3.error && r3.data && r3.data.length) userRec = r3.data[0]
                  } catch (e) {
                    // ignore
                  }
                }
              if (userRec) setReviewerName(userRec.full_name || userRec.display_name || userRec.name || userRec.username || userRec.email || reviewerId)
            } catch (e) {
              // ignore
            }
          }

          // resolve submitter/reporter for the production entry (if present)
          try {
            const submitterId = fetched.submitted_by || fetched.created_by || fetched.reported_by || fetched.submitted_by_id
            if (submitterId) {
              let userRec: any = null
              try {
                const r1 = await getDb().from('users').select('*').eq('id', submitterId).limit(1)
                if (!r1.error && r1.data && r1.data.length) userRec = r1.data[0]
              } catch (e) {
                // ignore
              }
              if (!userRec) {
                try {
                  const pub = getClientForSchema('public')
                  const r2 = await pub.from('users').select('*').eq('id', submitterId).limit(1)
                  if (!r2.error && r2.data && r2.data.length) userRec = r2.data[0]
                } catch (e) {
                  // ignore
                }
              }
              if (!userRec) {
                try {
                  const r3 = await supabase.from('users').select('*').eq('id', submitterId).limit(1)
                  if (!r3.error && r3.data && r3.data.length) userRec = r3.data[0]
                } catch (e) {
                  // ignore
                }
              }
              if (userRec) setReporterName(userRec.full_name || userRec.display_name || userRec.name || userRec.username || userRec.email || submitterId)
            }
          } catch (e) {
            // ignore
          }

          // if fetched entry lacks embedded asset code, try to resolve it
          if (!(fetched.assets && fetched.assets.length && fetched.assets[0].asset_code)) {
            try {
              const selectedSite = site?.toLowerCase() || ''
              const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
              for (const schema of candidateSchemas) {
                try {
                  const client = getClientForSchema(schema)
                  const { data: assets } = await client.from('assets').select('id, asset_code').eq('id', fetched.machine_id).limit(1)
                  if (assets && (assets as any[]).length) {
                    setResolvedAssetCode((assets as any[])[0].asset_code)
                    break
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }
          }
        } else {
          setFreshEntry(entry)
        }
      } catch (e) {
        setFreshEntry(entry)
      }
    }
    fetchLatestEntry()
    return () => { mounted = false }
  }, [entry, getDb, site])

  // If reporterName wasn't resolved during the initial fetch, try resolving again
  useEffect(() => {
    let mounted = true
    const tryResolveReporter = async () => {
      try {
        const id = (freshEntry || entry)?.submitted_by || (freshEntry || entry)?.reported_by || (freshEntry || entry)?.created_by
        if (!id) return
        if (reporterName) return
        // Try cache first to avoid any flicker when we've already looked this user up
        const cached = getCachedUser(id)
        if (cached) {
          if (mounted) setReporterName(cached.full_name || cached.display_name || cached.name || cached.username || cached.email || id)
          return
        }

        setReporterLoading(true)
        let userRec: any = null
        try {
          userRec = await fetchAndCacheUser(id, getDb, site ?? undefined)
        } catch (e) {
          // ignore
        }

        if (mounted && userRec) setReporterName(userRec.full_name || userRec.display_name || userRec.name || userRec.username || userRec.email || id)
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setReporterLoading(false)
      }
    }
    tryResolveReporter()
    return () => { mounted = false }
  }, [entry, freshEntry, reporterName, getDb, site])

  // Resolve breakdown reporter name (cache-first) when a breakdown prop is present
  useEffect(() => {
    let mounted = true
    const resolve = async () => {
      try {
        if (!breakdown) {
          if (mounted) {
            setBreakdownReporterName(null)
            setBreakdownReporterLoading(false)
          }
          return
        }

        // If a reporter_name is already attached by the caller, use it
        if (breakdown.reporter_name) {
          if (mounted) setBreakdownReporterName(breakdown.reporter_name)
          return
        }

        const id = breakdown.reported_by || breakdown.reporter || breakdown.reported_by_id
        if (!id) return

        // Try cache first
        const cached = getCachedUser(id)
        if (cached) {
          if (mounted) setBreakdownReporterName(cached.full_name || cached.display_name || cached.name || cached.username || cached.email || id)
          return
        }

        if (mounted) setBreakdownReporterLoading(true)
        let userRec: any = null
        try {
          userRec = await fetchAndCacheUser(id, getDb, site ?? undefined)
        } catch (e) {
          // ignore
        }
        if (mounted && userRec) setBreakdownReporterName(userRec.full_name || userRec.display_name || userRec.name || userRec.username || userRec.email || id)
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setBreakdownReporterLoading(false)
      }
    }
    resolve()
    return () => { mounted = false }
  }, [breakdown, getDb, site])

  if (!entry) return null

  const displayEntry = freshEntry || entry
  // Prefer a human-readable asset code and avoid falling back to the raw UUID to prevent flicker.
  // Show a stable placeholder while the code is being resolved instead of the machine UUID.
  const displayMachine = resolvedAssetCode || displayEntry?.assets?.[0]?.asset_code || 'Loading machine...'

  const formatMaterial = (m?: string | null) => {
    if (!m) return null
    const key = String(m).toUpperCase()
    if (key === 'OB') return 'OB (Mining)'
    if (key === 'OB_REHAB' || key === 'OB-REHAB') return 'OB (Rehabilitation)'
    if (key === 'COAL') return 'Coal'
    return m
  }

  const formatHaul = (raw?: any) => {
    const num = Number(raw)
    if (!isNaN(num)) return `${num.toFixed(1)} m`
    if (raw === null || raw === undefined || raw === '') return '-'
    return `${raw} m`
  }

  const displayDateTime = (() => {
    const ts = displayEntry.created_at || displayEntry.inserted_at || displayEntry.submitted_at || displayEntry.logged_at
    if (ts) {
      try { return new Date(ts).toLocaleString() } catch (e) { /* fallthrough */ }
    }
    // fallback to shift_date + hour
    return `${displayEntry.shift_date} · Hour ${displayEntry.hour}:00`
  })()

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 640, width: 'min(640px, 95vw)', boxSizing: 'border-box', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Log Details</h3>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{displayDateTime}</div>
            </div>
          </div>
          <div>
            <button className="secondary-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{displayMachine}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{entry.machine_role || ''}</div>
              {/* Reporter / Material / Logged will be shown as full-width label:value rows */}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{entry.status || ''}</div>
              {/* Logged timestamp kept in header right column if needed (now moved below) */}
            </div>
          </div>

          <div>
            <strong>Activity:</strong> {displayEntry.activity}
          </div>

          <div>
            <strong>Loads:</strong> {displayEntry.number_of_loads ?? '-'}</div>

          <div>
            <strong>Haul Distance:</strong> {formatHaul(displayEntry.haul_distance)}
          </div>

          <div>
            <strong>Reported by:</strong> {reporterName || (reporterLoading ? 'Loading reporter...' : (displayEntry.submitted_by || displayEntry.reported_by || '-'))}
          </div>

          <div>
            <strong>Material:</strong> {formatMaterial(displayEntry.material_type) || displayEntry.material || '-'}
          </div>

          <div>
            <strong>Logged:</strong> {(() => {
              const ts = displayEntry.created_at || displayEntry.inserted_at || displayEntry.submitted_at || displayEntry.logged_at || displayEntry.createdAt
              try {
                return ts ? new Date(ts).toLocaleString() : 'Unknown'
              } catch (e) {
                return String(ts || 'Unknown')
              }
            })()}
          </div>

          {displayEntry.status === 'REJECTED' && (
            <div style={{ borderTop: '1px solid #fee2e2', paddingTop: 12 }}>
              <div style={{ color: '#b91c1c', fontWeight: 700, marginBottom: 6 }}>Rejected</div>
              {(() => {
                const reviewerId = displayEntry.reviewed_by || displayEntry.rejected_by || displayEntry.approved_by || displayEntry.reviewer_id || displayEntry.reviewed_by_id
                return reviewerId ? (
                  <div style={{ color: '#374151', fontSize: 13, marginBottom: 6 }}>By: {reviewerName || reviewerId}</div>
                ) : null
              })()}
              <div style={{ color: '#6b7280', fontSize: 13 }}>Reason</div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>{(
                displayEntry.rejection_reason ||
                displayEntry.review_comment ||
                displayEntry.review_reason ||
                displayEntry.reject_reason ||
                displayEntry.rejection_comment ||
                displayEntry.rejectionReason ||
                displayEntry.reject_comment ||
                displayEntry.review_reason_text ||
                displayEntry.review_note ||
                displayEntry.rejection_note ||
                'No reason provided'
              )}</div>
            </div>
          )}

          {actionError && (
            <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>
              Error saving review: {actionError}
            </div>
          )}

          {entry.activity === 'Breakdown' && breakdown && (
            <div style={{ borderTop: '1px solid #eef2ff', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Breakdown</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Start</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.breakdown_start ? new Date(breakdown.breakdown_start).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Reason</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.reason || '-'}</div>
                </div>

                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Reported by</div>
                  <div style={{ fontWeight: 600 }}>{breakdownReporterName || (breakdownReporterLoading ? 'Loading reporter...' : (breakdown.reporter_name || breakdown.reported_by || '-'))}</div>
                </div>

                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Name of Operator</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.operator || '-'}</div>
                </div>

                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Status</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.status || '-'}</div>
                </div>
                <div />
              </div>

              {/* Description / additional text */}
              {(
                breakdown.other_reason ||
                breakdown.description ||
                breakdown.details ||
                breakdown.additional_info ||
                breakdown.please_describe ||
                breakdown.notes
              ) && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Details</div>
                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{(breakdown.other_reason || breakdown.description || breakdown.details || breakdown.additional_info || breakdown.please_describe || breakdown.notes) as string}</div>
                </div>
              )}

              {/* Any other fields */}
              {Object.entries(breakdown)
                .filter(([k]) => ![
                  'id',
                  'reason',
                  'breakdown_start',
                  'asset_id',
                  'created_at',
                  'other_reason',
                  'description',
                  'details',
                  'additional_info',
                  'please_describe',
                  'notes',
                  'reported_by',
                  'reporter_name',
                  'site',
                  'status',
                  'operator',
                ].includes(k))
                .map(([k, v]) => (v ? (
                  <div key={k} style={{ marginTop: 8 }}>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontWeight: 600 }}>{String(v)}</div>
                  </div>
                ) : null))}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {entry.activity === 'Breakdown' && breakdown ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {role?.toLowerCase() === 'supervisor' ? (
                <>
                  <button
                    className="submit-btn"
                    onClick={() => {
                      try {
                        onClose()
                      } finally {
                        navigate('/exceptions')
                      }
                    }}
                    style={{ height: 40 }}
                  >
                    Go to Exceptions
                  </button>
                  {String(breakdown.status || '').toUpperCase() !== 'ACKNOWLEDGED' && (
                    <button
                      className="submit-btn"
                      onClick={async () => {
                        try {
                          setActionLoading(true)
                          const db = getDb()
                          const { error } = await db.from('breakdowns').update({ status: 'ACKNOWLEDGED' }).eq('id', breakdown.id)
                          if (error) throw error
                          // notify other views
                          try { window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id: breakdown.id, source: 'breakdown' } })) } catch (e) {}
                          onClose()
                        } catch (e: any) {
                          setActionError(String(e))
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      style={{ height: 40 }}
                    >
                      {actionLoading ? 'Acknowledging...' : 'Acknowledge'}
                    </button>
                  )}
                </>
              ) : null}
            </div>
          ) : (
            role?.toLowerCase() === 'supervisor' && (String(displayEntry.status || entry.status || '').toUpperCase() === 'PENDING') && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!showRejectInput ? (
                  <>
                    <button
                      className="submit-btn success"
                      onClick={async () => {
                        try {
                          setActionLoading(true)
                          setActionError(null)
                          const db = getDb()
                          const ts = new Date().toISOString()
                          // attempt to record reviewer info; fall back to status-only if columns missing
                          let lastErr: any = null
                          let res = await db.from('production_entries').update({ status: 'APPROVED', reviewed_by: user?.id, reviewed_at: ts, approved_by: user?.id, approved_at: ts }).eq('id', entry.id)
                          if (res.error) lastErr = res.error
                          if (res.error) {
                            res = await db.from('production_entries').update({ status: 'APPROVED', reviewed_by: user?.id, reviewed_at: ts }).eq('id', entry.id)
                            if (res.error) lastErr = res.error
                          }
                          if (res.error) {
                            const r2 = await db.from('production_entries').update({ status: 'APPROVED' }).eq('id', entry.id)
                            if (r2.error) {
                              setActionError(JSON.stringify(r2.error))
                              throw r2.error
                            }
                            // succeeded with fallback; surface original error as a warning
                            if (lastErr) setActionError(JSON.stringify(lastErr))
                          }
                          // notify any listeners to refresh
                          window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id: entry.id, status: 'APPROVED' } }))
                          onClose()
                        } catch (e) {
                          console.error('Approve failed', e)
                        } finally {
                          setActionLoading(false)
                        }
                      }}
                      disabled={actionLoading}
                      style={{ height: 40 }}
                    >
                      Approve
                    </button>
                    <button
                      className="submit-btn danger"
                      onClick={() => setShowRejectInput(true)}
                      disabled={actionLoading}
                      style={{ height: 40 }}
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Rejection reason (required)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ padding: 8, minWidth: 280 }}
                    />
                    <button
                      className="submit-btn danger"
                      onClick={async () => {
                        if (!rejectReason.trim()) return
                        try {
                          setActionLoading(true)
                          setActionError(null)
                          const db = getDb()
                          // Try updating with rejection + reviewer columns; fallback progressively
                          const ts = new Date().toISOString()
                          let lastErr: any = null
                          let res = await db.from('production_entries').update({ status: 'REJECTED', rejection_reason: rejectReason, rejected_by: user?.id, rejected_at: ts, reviewed_by: user?.id, reviewed_at: ts }).eq('id', entry.id)
                          if (res.error) lastErr = res.error
                          if (res.error) {
                            res = await db.from('production_entries').update({ status: 'REJECTED', review_comment: rejectReason, rejected_by: user?.id, rejected_at: ts }).eq('id', entry.id)
                            if (res.error) lastErr = res.error
                          }
                          if (res.error) {
                            const r2 = await db.from('production_entries').update({ status: 'REJECTED' }).eq('id', entry.id)
                            if (r2.error) {
                              setActionError(JSON.stringify(r2.error))
                              throw r2.error
                            }
                            if (lastErr) setActionError(JSON.stringify(lastErr))
                          }
                          
                          // Verify whether `rejection_reason` was persisted; only attempt
                          // fallback schema writes if it wasn't. This reduces noisy failed
                          // PATCH requests to schemas that don't expose the column.
                          try {
                            const { data: checkData, error: checkErr } = await db
                              .from('production_entries')
                              .select('rejection_reason')
                              .eq('id', entry.id)
                              .limit(1)

                            const currentReason = (!checkErr && Array.isArray(checkData) && checkData.length) ? (checkData as any[])[0].rejection_reason : null
                            if (!currentReason) {
                              const candidateSchemas = Array.from(new Set([site?.toLowerCase(), 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
                              for (const schema of candidateSchemas) {
                                try {
                                  const client = getClientForSchema(schema)
                                  // Check whether this schema exposes the `rejection_reason` column
                                  // by selecting it; if the select fails, skip this schema.
                                  // eslint-disable-next-line no-await-in-loop
                                  const { data: colCheck, error: colErr } = await client
                                    .from('production_entries')
                                    .select('rejection_reason')
                                    .eq('id', entry.id)
                                    .limit(1)
                                  if (colErr) continue
                                  // If select succeeded, attempt to write the reason
                                  // eslint-disable-next-line no-await-in-loop
                                  const { error: writeErr } = await client
                                    .from('production_entries')
                                    .update({ rejection_reason: rejectReason })
                                    .eq('id', entry.id)
                                  if (!writeErr) break
                                } catch (e) {
                                  // ignore per-schema errors and continue
                                }
                              }
                            }
                          } catch (e) {
                            // ignore verification/fallback errors
                          }
                        window.dispatchEvent(new CustomEvent('entry-updated', { detail: { id: entry.id, status: 'REJECTED', reason: rejectReason } }))
                        onClose()
                      } catch (e) {
                        console.error('Reject failed', e)
                      } finally {
                        setActionLoading(false)
                        setShowRejectInput(false)
                        setRejectReason('')
                      }
                    }}
                      disabled={actionLoading}
                      style={{ height: 40 }}
                    >
                      Confirm Reject
                    </button>
                    <button className="secondary-btn" onClick={() => { setShowRejectInput(false); setRejectReason('') }} style={{ height: 40 }}>Cancel</button>
                  </div>
                )}
              </div>
            )
          )}

          <button className="secondary-btn" onClick={onClose} style={{ height: 40 }}>Close</button>
        </div>
      </div>
    </div>
  )
}
