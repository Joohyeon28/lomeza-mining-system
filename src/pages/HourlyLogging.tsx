import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import LogDetailModal from '../components/LogDetailModal'
import { getShiftKindForTime, getDayGroup } from '../lib/shifts'
import { getShiftAnchor } from '../lib/settings'
import type { Group } from '../lib/shifts'

interface Machine {
  id: string
  asset_code: string
  asset_type: string
  machine_role: string
  material_type?: string
  haul_distance?: number | null
}

interface LoggedHour {
  machine_id: string
  hour: number
  activity: 'Production' | 'Standby' | 'Breakdown'
  number_of_loads?: number
  breakdown_id?: string
}

export default function HourlyLogging() {
  const location = useLocation()
  const navigate = useNavigate()
  const persistedPlanId = typeof window !== 'undefined' ? localStorage.getItem('currentPlanId') : null
  const planId = (location.state as any)?.planId ?? persistedPlanId
  const { user, site } = useAuth()
  const getDb = useDb()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [now, setNow] = useState<Date>(new Date())
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ OB: true, OB_REHAB: true, COAL: true })
  const [loggedHours, setLoggedHours] = useState<LoggedHour[]>([])
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewEntry, setViewEntry] = useState<any | null>(null)
  const [viewBreakdown, setViewBreakdown] = useState<any | null>(null)
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false)

  // Fetch machines for this site
  useEffect(() => {
    const fetchMachines = async () => {
      const db = getDb()
      setLoadingPlan(true)
      try {
        if (!planId) {
          // No active plan: do not show machines until a plan is started
          setMachines([])
          return
        }

        try {
          const { data, error, status, statusText } = await db
            .from('daily_plan_machines')
            .select(`
              machine_id,
              material_type,
              haul_distance,
              assets ( id, asset_code, asset_type, machine_role )
            `)
            .eq('daily_plan_id', planId)

          // debug
          // eslint-disable-next-line no-console
          console.debug('daily_plan_machines (with assets) response', { data, error, status, statusText })

          if (error) throw error

          if (data) {
            const machinesFromPlan = (data as any[])
              .map(r => ({
                id: r.assets?.id,
                asset_code: r.assets?.asset_code,
                asset_type: r.assets?.asset_type,
                machine_role: r.assets?.machine_role,
                material_type: r.material_type,
                haul_distance: r.haul_distance,
              }))
              .filter(m => m.id)
            setMachines(machinesFromPlan)
            return
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to fetch daily_plan_machines with embedded assets, falling back to simple select', err)
        }

        // Fallback: fetch only machine assignments (no join/embedding) then fetch asset details
        try {
          const { data: simpleData, error: simpleError, status, statusText } = await db
            .from('daily_plan_machines')
            .select('machine_id, material_type, haul_distance')
            .eq('daily_plan_id', planId)

          // eslint-disable-next-line no-console
          console.debug('daily_plan_machines (simple) response', { simpleData, simpleError, status, statusText })

          if (simpleError) throw simpleError
          if (simpleData && (simpleData as any[]).length > 0) {
            const assigns = simpleData as any[]
            const ids = Array.from(new Set(assigns.map(a => a.machine_id).filter(Boolean)))

            // Try multiple registry schemas (site, public, sileko, kalagadi, workshop)
            const selectedSite = site?.toLowerCase() || ''
            const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]

            const assetsById: Record<string, any> = {}
            for (const schema of candidateSchemas) {
              if (ids.length === Object.keys(assetsById).length) break
              try {
                const client = getClientForSchema(schema)
                const { data: assets, error: assetsError } = await client
                  .from('assets')
                  .select('id, asset_code, asset_type, machine_role')
                  .in('id', ids)

                if (assets && (assets as any[]).length > 0) {
                  for (const a of assets as any[]) assetsById[String(a.id)] = a
                }
              } catch (e) {
                // ignore schema errors and continue
              }
            }

            const machinesFromPlan = assigns
              .map(r => {
                const asset = assetsById[String(r.machine_id)]
                return {
                  id: r.machine_id,
                  asset_code: asset?.asset_code || r.machine_id,
                  asset_type: asset?.asset_type || '',
                  machine_role: asset?.machine_role || '',
                  material_type: r.material_type,
                  haul_distance: r.haul_distance,
                }
              })
            setMachines(machinesFromPlan)
          } else {
            setMachines([])
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to fetch plan machines (simple):', err)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch plan machines', err)
      } finally {
        setLoadingPlan(false)
      }
    }
    if (site) fetchMachines()
  }, [site, planId])

  

  // Live clock and compute rotation/current kind for display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const shiftKind = getShiftKindForTime(now)
  const currentHour = now.getHours()
  let currentGroup: Group | null = null
  try {
    const anchor = getShiftAnchor() || { anchorDate: new Date(), anchorGroup: 'A' as Group }
    currentGroup = getDayGroup(now, anchor.anchorDate, anchor.anchorGroup)
  } catch (e) {
    currentGroup = null
  }

  // prefer group/shift passed via navigation state (from ProductionInput)
  // Show selected group/shift only when provided via navigation state or
  // when a plan exists and the values were persisted in localStorage.
  const navGroup = (location.state as any)?.group as Group | undefined
  const navShift = (location.state as any)?.shift as string | undefined
  const storedGroup = typeof window !== 'undefined' ? localStorage.getItem('currentPlanGroup') : null
  const storedShift = typeof window !== 'undefined' ? localStorage.getItem('currentPlanShift') : null
  const displayGroup = navGroup ?? (planId ? (storedGroup as Group | undefined) : undefined)
  const displayShift = navShift ?? (planId ? storedShift : undefined)

  // Fetch already logged entries for today. Re-run when `machines` change so
  // we can query by machine ids once assignments are loaded. Try the
  // user-scoped query first, then fall back to a machine-id + date query
  // (helps detect RLS/select restrictions on the submitted_by filter).
  useEffect(() => {
    const fetchTodayLogs = async () => {
      const today = new Date().toISOString().split('T')[0]
      const db = getDb()

      try {
        // Primary: entries submitted by this user
        const { data, error } = await db
          .from('production_entries')
          .select('machine_id, hour, activity, number_of_loads')
          .eq('submitted_by', user?.id)
          .eq('shift_date', today)

        if (!error && data && (data as any[]).length > 0) {
          // eslint-disable-next-line no-console
          console.debug('fetchTodayLogs: primary result', { count: (data as any[]).length, sample: (data as any[]).slice(0,3) })
          setLoggedHours(
            (data as any[]).map(e => ({
              machine_id: e.machine_id,
              hour: e.hour,
              activity: e.activity as any,
              number_of_loads: e.number_of_loads,
            }))
          )
          return
        }

        // Fallback: if we have machine assignments, query by those ids and date
        const ids = machines.map(m => m.id).filter(Boolean)
        if (ids.length === 0) {
          // nothing to query
          setLoggedHours([])
          return
        }

        const { data: fallbackData, error: fallbackError } = await db
          .from('production_entries')
          .select('machine_id, hour, activity, number_of_loads')
          .in('machine_id', ids)
          .eq('shift_date', today)

        // eslint-disable-next-line no-console
        console.debug('fetchTodayLogs: fallback query', { idsCount: ids.length, fallbackCount: fallbackData ? (fallbackData as any[]).length : 0, fallbackError })

        if (!fallbackError && fallbackData) {
          setLoggedHours(
            (fallbackData as any[]).map(e => ({
              machine_id: e.machine_id,
              hour: e.hour,
              activity: e.activity as any,
              number_of_loads: e.number_of_loads,
            }))
          )
        } else {
          // clear if nothing found or error
          setLoggedHours([])
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch today logs', err)
        setLoggedHours([])
      }
    }

    if (user) fetchTodayLogs()
  }, [user, machines])

  const isHourLogged = (machineId: string, hour: number) => {
    return loggedHours.some(
      l => l.machine_id === machineId && l.hour === hour
    )
  }

  const getHourState = (machineId: string, hour: number) => {
    const entry = loggedHours.find(
      l => l.machine_id === machineId && l.hour === hour
    )
    return entry?.activity || 'none'
  }

  const handleHourClick = (machine: Machine, hour: number) => {
    // eslint-disable-next-line no-console
    console.debug('hour clicked', { machineId: machine.id, hour, logged: isHourLogged(machine.id, hour) })
    if (isHourLogged(machine.id, hour)) {
      // show details for already-logged hour
      handleViewLoggedHour(machine, hour)
      return
    }
    setSelectedMachine(machine)
    setSelectedHour(hour)
    setShowForm(true)
  }

  const handleViewLoggedHour = async (machine: Machine, hour: number) => {
    const db = getDb()
    const shift_date = new Date().toISOString().split('T')[0]
    let bdCandidate: any = null
    try {
      // eslint-disable-next-line no-console
      console.debug('handleViewLoggedHour: loading production entry', { machineId: machine.id, hour, shift_date })
      const { data, error } = await db
        .from('production_entries')
        .select('*')
        .eq('machine_id', machine.id)
        .eq('shift_date', shift_date)
        .eq('hour', hour)
        .limit(1)

      if (error || !data || (data as any[]).length === 0) {
        // eslint-disable-next-line no-console
        console.warn('production_entries lookup returned no data or error', { error, data })
        alert('Could not load entry details')
        return
      }
      const entry = (data as any[])[0]
      setViewEntry({ ...entry, assets: [{ asset_code: machine.asset_code }], machine_role: machine.machine_role })

      // Always attempt to fetch a breakdown record for this asset on the same shift_date.
      // Use the full day range to avoid timezone mismatches; pick the latest breakdown that day.
      try {
        const dayStart = new Date(`${shift_date}T00:00:00`).toISOString()
        const dayEnd = new Date(`${shift_date}T23:59:59.999`).toISOString()
        const { data: bdData, error: bdError } = await db
          .from('breakdowns')
          .select('*')
          .eq('asset_id', machine.id)
          .gte('breakdown_start', dayStart)
          .lte('breakdown_start', dayEnd)
          .order('breakdown_start', { ascending: false })
          .limit(1)

        if (bdError) {
          // eslint-disable-next-line no-console
          console.warn('Breakdown fetch warning', bdError)
          bdCandidate = null
          setViewBreakdown(null)
        } else if (bdData && (bdData as any[]).length > 0) {
          bdCandidate = (bdData as any[])[0]
          // try to resolve reporter name for UI (same logic as fallback)
          if (bdCandidate.reported_by) {
            try {
              const selectedSite = site?.toLowerCase() || ''
              const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
              for (const schema of candidateSchemas) {
                try {
                  const client = getClientForSchema(schema)
                  const { data: udata } = await client.from('users').select('id,name,email').eq('id', bdCandidate.reported_by).limit(1)
                  if (udata && (udata as any[]).length > 0) {
                    const u = (udata as any[])[0]
                    bdCandidate.reporter_name = u.name || u.email || u.id
                    break
                  }
                } catch (e) {
                  // ignore and continue
                }
              }
            } catch (e) {
              // ignore reporter lookup errors
            }
          }
          setViewBreakdown(bdCandidate)
        } else {
          bdCandidate = null
          setViewBreakdown(null)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch breakdown record', e)
        bdCandidate = null
        setViewBreakdown(null)
      }

      // If no breakdown found within the day-range, try a fallback: fetch the latest breakdown for this asset
      if (!bdCandidate) {
        try {
          const { data: latestData, error: latestError } = await db
            .from('breakdowns')
            .select('*')
            .eq('asset_id', machine.id)
            .order('breakdown_start', { ascending: false })
            .limit(1)

          if (latestError) {
            // eslint-disable-next-line no-console
            console.warn('Latest breakdown fallback failed', latestError)
          } else if (latestData && (latestData as any[]).length > 0) {
            bdCandidate = (latestData as any[])[0]
            // try to resolve reporter name for UI
            if (bdCandidate.reported_by) {
              try {
                const selectedSite = site?.toLowerCase() || ''
                const candidateSchemas = Array.from(new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean))) as string[]
                for (const schema of candidateSchemas) {
                  try {
                    const client = getClientForSchema(schema)
                    const { data: udata } = await client.from('users').select('id,name,email').eq('id', bdCandidate.reported_by).limit(1)
                    if (udata && (udata as any[]).length > 0) {
                      const u = (udata as any[])[0]
                      bdCandidate.reporter_name = u.name || u.email || u.id
                      break
                    }
                  } catch (e) {
                    // ignore and continue
                  }
                }
              } catch (e) {
                // ignore reporter lookup errors
              }
            }
            setViewBreakdown(bdCandidate)
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to run latest-breakdown fallback', e)
        }
      }

      // Debug fetched entry + breakdown for troubleshooting
      // eslint-disable-next-line no-console
      console.debug('View entry loaded', entry, 'breakdownCandidate', bdCandidate)

      setShowViewModal(true)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load entry details', err)
      alert('Failed to load entry details')
    }
  }

  const handleSubmitProduction = async (
    loads: number,
    activity: 'Production' | 'Standby' | 'Breakdown'
  ) => {
    if (!selectedMachine || selectedHour === null) return

    const newEntry = {
      shift_date: new Date().toISOString().split('T')[0],
      hour: selectedHour,
      machine_id: selectedMachine.id,
      activity,
      number_of_loads: activity === 'Production' ? loads : null,
      haul_distance: selectedMachine.haul_distance ?? null,
      submitted_by: user?.id,
      site,
      status: 'PENDING',
    }
    const db = getDb()
    try {
      // Use upsert to avoid duplicate-key errors and allow updating existing hour entries
      const { data, error } = await db
        .from('production_entries')
        .upsert([newEntry], { onConflict: 'machine_id,shift_date,hour' })

      if (error) {
        alert('Failed to save: ' + error.message)
        return
      }

      // Replace any existing logged hour for this machine/hour with the returned/created entry
      setLoggedHours(prev => {
        const filtered = prev.filter(l => !(l.machine_id === selectedMachine.id && l.hour === selectedHour))
        return [
          ...filtered,
          {
            machine_id: selectedMachine.id,
            hour: selectedHour!,
            activity,
            number_of_loads: loads,
          },
        ]
      })
      setShowForm(false)
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || String(err)))
    }
  }

  const handleBreakdown = async (reason: string, startTime: string) => {
    if (!selectedMachine || selectedHour === null) return
    // Insert into breakdowns table
    const db = getDb()
    const { error } = await db.from('breakdowns').insert({
      asset_id: selectedMachine.id,
      site,
      reason,
      reported_by: user?.id,
      breakdown_start: startTime,
    })
    if (error) {
      alert('Failed to log breakdown: ' + error.message)
    } else {
      // Also mark the hour as breakdown
      await handleSubmitProduction(0, 'Breakdown')
    }
    setShowBreakdownModal(false)
  }

  const handleEndShift = () => {
    // open modal to confirm end-shift (avoids native confirm)
    setShowEndShiftConfirm(true)
  }

  const performEndShift = () => {
    try {
      if (typeof window !== 'undefined') {
        // clear only the client-side active plan marker so Production Input appears ready
        localStorage.removeItem('currentPlanId')
        // if this view had a planId, remember it as dismissed so ProductionInput can hide it
        try {
          if (planId) localStorage.setItem(`dismissedPlan:${planId}`, '1')
        } catch (e) {
          // ignore storage errors
        }
      }

      // clear local UI state so Hourly Logging appears reset
      setMachines([])
      setLoggedHours([])
      setSelectedMachine(null)
      setSelectedHour(null)
      setShowForm(false)
      setShowBreakdownModal(false)

      // Do NOT remove any server-side records. Redirect to Controller Dashboard.
      setShowEndShiftConfirm(false)
      navigate('/controller-dashboard', { replace: true })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to end shift/reset plan', e)
      alert('Failed to reset plan')
    }
  }

  return (
    <Layout activePage="/hourly-logging">
      <header className="page-header">
        <h1>Hourly Production Logging</h1>
        <p>Log production for machines assigned in today’s plan</p>
        <div style={{ display: 'flex', gap: 8 }}>
        </div>
      </header>

      <section className="shift-info">
        <div id="current-shift">Date: {now.toLocaleDateString()}</div>
        <div id="current-time">Time: {now.toLocaleTimeString()}</div>

        {planId && displayGroup && displayShift && (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <strong>Group:</strong>&nbsp;{displayGroup} &nbsp;•&nbsp; <strong>Shift:</strong>&nbsp;{displayShift === 'NIGHT' ? 'Night' : 'Day'}
          </div>
        )}

        <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 6, background: '#10b981', display: 'inline-block' }} />
            <span>Production</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 6, background: '#f59e0b', display: 'inline-block' }} />
            <span>Standby</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 6, background: '#ef4444', display: 'inline-block' }} />
            <span>Breakdown</span>
          </div>
          <div style={{ marginLeft: 'auto', color: '#475569', fontSize: 13 }}>Current hour: {currentHour}:00</div>
        </div>
      </section>

      { !planId ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <h3>No active plan</h3>
          <p>Hourly logging is only available after a plan is started from Production Input.</p>
          <div style={{ marginTop: 12 }}>
            <button className="submit-btn" onClick={() => navigate('/production-input')}>Go to Production Input</button>
          </div>
        </div>
      ) : (
        <section id="hourly-machine-list" className="machine-grid">
          {loadingPlan ? (
            <div className="empty-state">Loading plan…</div>
          ) : machines.length === 0 ? (
            <div className="empty-state">No machines assigned to this plan.</div>
          ) : (
            // Group machines by material category
            (['OB', 'OB_REHAB', 'COAL'] as const).map(mat => {
              const groupMachines = machines.filter(m => (m.material_type || '') === mat)
              const isCollapsed = !!collapsedGroups[mat]
              return (
                <div key={mat} className="material-section" style={{ marginBottom: 16 }}>
                  <div className="material-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        className="secondary-btn"
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [mat]: !prev[mat] }))}
                        aria-expanded={!isCollapsed}
                        aria-controls={`group-${mat}`}
                      >
                        {isCollapsed ? '▸' : '▾'}
                      </button>
                      <h3 style={{ margin: 0 }}>{mat === 'OB' ? 'OB (Mining)' : mat === 'OB_REHAB' ? 'OB (Rehabilitation)' : 'Coal'}</h3>
                      <small style={{ color: '#6b7280' }}> {groupMachines.length} machine{groupMachines.length !== 1 ? 's' : ''}</small>
                    </div>
                    <div />
                  </div>

                  <div id={`group-${mat}`} aria-hidden={isCollapsed} style={{ marginTop: 10 }}>
                    {isCollapsed ? null : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                        {groupMachines.map(machine => {
                          const totalLoads = loggedHours
                            .filter(l => l.machine_id === machine.id && l.activity === 'Production')
                            .reduce((s, l) => s + (l.number_of_loads || 0), 0)

                          return (
                            <div key={machine.id} className="hourly-machine-box" style={{ borderRadius: 12, background: '#fff', padding: 12, boxShadow: '0 10px 24px rgba(2,6,23,0.06)', border: '1px solid #e6eef6' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 16 }}>{machine.asset_code}</div>
                                  <div style={{ color: '#6b7280', fontSize: 13 }}>{machine.machine_role}</div>
                                </div>
                                <div style={{ textAlign: 'right', color: '#475569', fontSize: 13 }}>
                                  {machine.haul_distance != null && <div style={{ fontWeight: 700 }}>{machine.haul_distance} m</div>}
                                  <div style={{ marginTop: 6 }}><small>Total loads: {totalLoads}</small></div>
                                </div>
                              </div>

                              <div className="hour-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                                {Array.from({ length: 12 }, (_, i) => i + 6).map(hour => {
                                  const entry = loggedHours.find(l => l.machine_id === machine.id && l.hour === hour)
                                  const state = entry?.activity || 'none'
                                  const loadsBadge = entry?.number_of_loads ?? null
                                  return (
                                    <button
                                      key={hour}
                                      className={`hour-btn ${state.toLowerCase()} ${hour === currentHour ? 'current-hour' : ''}`}
                                      onClick={() => handleHourClick(machine, hour)}
                                      // allow clicking logged hours so we can view details; only disable while plan is loading
                                      disabled={loadingPlan}
                                      aria-pressed={state !== 'none'}
                                      aria-label={`Hour ${hour} for ${machine.asset_code} - ${state}`}
                                    >
                                      <span style={{ fontWeight: 700 }}>{hour}</span>
                                      {state !== 'none' && (
                                        <span
                                          aria-hidden
                                          style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 999,
                                            display: 'inline-block',
                                            marginLeft: 8,
                                            background:
                                              state === 'Production'
                                                ? '#10b981'
                                                : state === 'Standby'
                                                ? '#f59e0b'
                                                : '#ef4444',
                                          }}
                                        />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </section>
      )}

      {/* Production / Standby Form Modal */}
      {showForm && selectedMachine && (
        <ProductionFormModal
          machine={selectedMachine}
          hour={selectedHour!}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitProduction}
          onBreakdown={() => {
            setShowForm(false)
            setShowBreakdownModal(true)
          }}
        />
      )}

      {/* Breakdown Modal */}
      {showBreakdownModal && selectedMachine && (
        <BreakdownModal
          machine={selectedMachine}
          hour={selectedHour!}
          onClose={() => setShowBreakdownModal(false)}
          onSubmit={handleBreakdown}
        />
      )}

      {/* View logged entry modal */}
      {showViewModal && viewEntry && (
        <LogDetailModal
          entry={viewEntry}
          breakdown={viewBreakdown || undefined}
          onClose={() => {
            setShowViewModal(false)
            setViewEntry(null)
            setViewBreakdown(null)
          }}
        />
      )}

      {/* End Shift confirmation modal */}
      {showEndShiftConfirm && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 560, width: 'min(560px, 95vw)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>End Shift</h3>
                <div style={{ color: '#475569', fontSize: 13 }}>Confirm ending the shift and clearing the local plan state.</div>
              </div>
              <div>
                <button className="secondary-btn" onClick={() => setShowEndShiftConfirm(false)} aria-label="Close">✕</button>
              </div>
            </div>

            <div style={{ marginTop: 12, color: '#374151' }}>
              Ending the shift will clear the active plan locally and return you to the Controller Dashboard. This does not remove any data from the server.
            </div>

            <div className="modal-actions" style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="secondary-btn" onClick={() => setShowEndShiftConfirm(false)}>Cancel</button>
              <button className="danger-btn" onClick={performEndShift}>End Shift</button>
            </div>
          </div>
        </div>
      )}

      {planId && (
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
          <button
            className="danger-btn"
            onClick={handleEndShift}
            style={{ padding: '8px 14px', height: 40, minHeight: 40 }}
          >
            End Shift
          </button>
        </div>
      )}
    </Layout>
  )
}

// ---------- Modal Components ----------
function ProductionFormModal({
  machine,
  hour,
  onClose,
  onSubmit,
  onBreakdown,
}: {
  machine: Machine
  hour: number
  onClose: () => void
  onSubmit: (loads: number, activity: 'Production' | 'Standby') => void
  onBreakdown: () => void
}) {
  const [activity, setActivity] = useState<'Production' | 'Standby'>('Production')
  const [loads, setLoads] = useState<number>(0)

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 640, width: 'min(640px, 95vw)', boxSizing: 'border-box', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Log {machine.asset_code}</h3>
            <div style={{ color: '#475569', fontSize: 13 }}>{machine.machine_role} · Hour {hour}:00</div>
          </div>
          <div>
            <button className="secondary-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`seg-btn ${activity === 'Production' ? 'active' : ''}`}
              onClick={() => setActivity('Production')}
              aria-pressed={activity === 'Production'}
            >
              Production
            </button>
            <button
              type="button"
              className={`seg-btn ${activity === 'Standby' ? 'active' : ''}`}
              onClick={() => setActivity('Standby')}
              aria-pressed={activity === 'Standby'}
            >
              Standby
            </button>
          </div>

          <div style={{ marginLeft: 'auto', color: '#6b7280' }}>
            {machine.material_type && <span style={{ marginRight: 12 }}>{machine.material_type}</span>}
            {machine.haul_distance != null && <span>{machine.haul_distance} m</span>}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {activity === 'Production' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="loads" style={{ minWidth: 120 }}>Number of loads</label>
              <input
                type="number"
                id="loads"
                value={loads}
                onChange={e => setLoads(Number(e.target.value))}
                min={0}
                style={{ width: 120, padding: '6px 8px', borderRadius: 6 }}
              />
              <div style={{ color: '#6b7280', fontSize: 13 }}>Enter the number of loads for this hour.</div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>Standby selected — no loads required.</div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="secondary-btn"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', height: 40, minHeight: 40, fontSize: 14, lineHeight: '20px', boxSizing: 'border-box', verticalAlign: 'middle', border: '1px solid transparent' }}
          >
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={() => onSubmit(loads, activity)}
            disabled={activity === 'Production' && loads < 0}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', height: 40, minHeight: 40, fontSize: 14, lineHeight: '20px', boxSizing: 'border-box', verticalAlign: 'middle', border: '1px solid transparent' }}
          >
            Save
          </button>
          <button
            className="danger-btn"
            onClick={onBreakdown}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', height: 40, minHeight: 40, fontSize: 14, lineHeight: '20px', boxSizing: 'border-box', verticalAlign: 'middle', border: '1px solid transparent' }}
          >
            Log Breakdown
          </button>
        </div>
      </div>
    </div>
  )
}

function BreakdownModal({
  machine,
  hour,
  onClose,
  onSubmit,
}: {
  machine: Machine
  hour: number
  onClose: () => void
  onSubmit: (reason: string, startTime: string) => void
}) {
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [startTime, setStartTime] = useState(() => new Date().toISOString().slice(0, 16))

  const effectiveReason = reason === 'Other' ? otherReason.trim() : reason
  const submitDisabled = !effectiveReason || !startTime

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 640, width: 'min(640px, 95vw)', boxSizing: 'border-box', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Log Breakdown – {machine.asset_code}</h3>
            <div style={{ color: '#475569', fontSize: 13 }}>Hour {hour}:00</div>
          </div>
          <div>
            <button className="secondary-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="reason" style={{ fontWeight: 600 }}>Reason</label>
            <select
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8 }}
            >
              <option value="">Select reason</option>
              <option>Mechanical failure</option>
              <option>Hydraulic failure</option>
              <option>Electrical fault</option>
              <option>Tyre issue</option>
              <option>Waiting for spares</option>
              <option>Other</option>
            </select>
          </div>

          {reason === 'Other' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="otherReason" style={{ fontWeight: 600 }}>Please describe</label>
              <input
                id="otherReason"
                type="text"
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                placeholder="Describe the breakdown"
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8 }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="startTime" style={{ fontWeight: 600 }}>Start Time</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 8 }}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          <button
            className="secondary-btn"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', height: 40, minHeight: 40, fontSize: 14, lineHeight: '20px', boxSizing: 'border-box', verticalAlign: 'middle', border: '1px solid transparent', flex: '0 0 auto' }}
          >
            Cancel
          </button>
          <button
            className="submit-btn danger"
            onClick={() => onSubmit(effectiveReason, startTime)}
            disabled={submitDisabled}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', height: 40, minHeight: 40, fontSize: 14, lineHeight: '20px', boxSizing: 'border-box', verticalAlign: 'middle', border: '1px solid transparent', flex: '0 0 auto' }}
          >
            Start Breakdown
          </button>
        </div>
      </div>
    </div>
  )
}