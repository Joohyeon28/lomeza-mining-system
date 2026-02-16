import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { getShiftKindForTime, getRotationForDate } from '../lib/shifts'
import type { Group } from '../lib/shifts'
import { getShiftAnchor, setShiftAnchor } from '../lib/settings'

// ---------- Types ----------
interface Machine {
  id: string
  asset_code: string
  asset_type: string
  machine_role: string
}

// ---------- Step Components ----------

export default function ProductionInput() {
  const { user, site } = useAuth()
  const getDb = useDb()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(1)
  const [selectedGroup, setSelectedGroup] = useState<'A'|'B'|'C'>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('currentPlanGroup') : null
      return (s as 'A'|'B'|'C') || 'A'
    } catch (e) {
      return 'A'
    }
  })
  const [selectedShift, setSelectedShift] = useState<'DAY'|'NIGHT'>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('currentPlanShift') : null
      return (s as 'DAY'|'NIGHT') || (getShiftKindForTime(new Date()) as 'DAY'|'NIGHT')
    } catch (e) {
      return getShiftKindForTime(new Date()) as 'DAY'|'NIGHT'
    }
  })
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [registrySamples, setRegistrySamples] = useState<{ schema: string; rows: any[] }[]>([])
  const [assignments, setAssignments] = useState<{
    OB: string[]
    OB_REHAB: string[]
    COAL: string[]
  }>({ OB: [], OB_REHAB: [], COAL: [] })
  const [distances, setDistances] = useState({
    OB: 0,
    OB_REHAB: 0,
    COAL: 0,
  })
  const [activePlanExists, setActivePlanExists] = useState(false)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const prevLocationRef = useRef(location)
  const ignoreNextNavRef = useRef(false)

  // Consider the form 'dirty' if the user progressed or entered data
  const isDirty =
    step > 1 ||
    selectedTypes.length > 0 ||
    Object.values(assignments).some(arr => arr && arr.length > 0) ||
    Object.values(distances).some(n => !!n)

  // Warn on tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      // Most browsers ignore the custom message, but setting returnValue triggers the prompt
      e.returnValue = 'Your production input progress will be lost.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Confirm in-app navigation away from this page
  useEffect(() => {
    if (ignoreNextNavRef.current) {
      // this navigation was programmatically reverted; clear the flag
      ignoreNextNavRef.current = false
      prevLocationRef.current = location
      return
    }

    if (prevLocationRef.current.pathname !== location.pathname) {
      // If we're leaving the production input route and there is unsaved work
      if (prevLocationRef.current.pathname === '/production-input' && location.pathname !== '/production-input' && isDirty) {
        const leave = window.confirm('You have unsaved production input — leaving will reset progress. Continue?')
        if (!leave) {
          // revert navigation
          ignoreNextNavRef.current = true
          navigate(prevLocationRef.current.pathname, { replace: true })
        }
      }
      prevLocationRef.current = location
    }
  }, [location, isDirty, navigate])

  // Load machines for this site when the component mounts
  useEffect(() => {
    if (!site) {
      setAvailableMachines([])
      return
    }
    const fetchMachines = async () => {
      setLoadingMachines(true)
      try {
        const db = getDb()
        const { data, error } = await db
          .from('assets')
          .select('id, asset_code, asset_type, machine_role')
          .eq('site', site)
          .eq('status', 'ACTIVE') // only active machines
        if (error) {
          console.error('Error fetching site assets:', error)
          setAvailableMachines([])
        } else if (data) {
          setAvailableMachines(
            (data as any[]).map(d => ({ ...d, id: String(d.id) })) as Machine[]
          )
        } else {
          setAvailableMachines([])
        }
      } catch (err) {
        console.error('Unexpected error fetching site assets', err)
        setAvailableMachines([])
      } finally {
        setLoadingMachines(false)
      }
    }

    fetchMachines()
  }, [site])

  // Check whether a daily plan already exists for this site/today/shift
  useEffect(() => {
    const checkActivePlan = async () => {
      if (!site) {
        setActivePlanExists(false)
        setActivePlanId(null)
        return
      }
      try {
        const db = getDb()
        const planDate = new Date().toISOString().split('T')[0]
        const desiredKind = getShiftKindForTime(new Date())
        const { data, error } = await db
          .from('daily_plans')
          .select('id')
          .eq('site', site)
          .eq('shift_date', planDate)
          .eq('shift', desiredKind)
          .limit(1)

        if (error) {
          setActivePlanExists(false)
          setActivePlanId(null)
        } else if (data && (data as any[]).length > 0) {
          const foundId = String((data as any[])[0].id)
          // respect any locally-dismissed plans (user ended shift locally)
          try {
            const dismissed = typeof window !== 'undefined' && localStorage.getItem(`dismissedPlan:${foundId}`)
            if (dismissed) {
              setActivePlanExists(false)
              setActivePlanId(null)
            } else {
              setActivePlanExists(true)
              setActivePlanId(foundId)
            }
          } catch (e) {
            setActivePlanExists(true)
            setActivePlanId(foundId)
          }
        } else {
          setActivePlanExists(false)
          setActivePlanId(null)
        }
      } catch (e) {
        setActivePlanExists(false)
        setActivePlanId(null)
      }
    }

    void checkActivePlan()
  }, [site, getDb])

  const handleDailyPlanConfirm = (types: string[]) => {
    // Fetch available assets from the sileko.assets table matching the
    // selected asset types. We use the site-scoped DB (getDb) but query
    // the fully-qualified `sileko.assets` table so the central asset
    // registry is used.
    const fetchForTypes = async () => {
      setSelectedTypes(types)
      setLoadingMachines(true)
      try {
        // Try multiple registry schemas so we find machines whether the
        // central registry lives in the site schema, `public`, or a
        // dedicated registry schema like `sileko`/`kalagadi`.
        const selectedSite = site?.toLowerCase() || ''
        const candidateSchemas = Array.from(
          new Set([selectedSite, 'public', 'sileko', 'kalagadi', 'workshop'].filter(Boolean)),
        ) as string[]

        let found: any[] | null = null
        // 1) Try matching by `machine_role` (preferred)
        for (const schema of candidateSchemas) {
          try {
            console.info('Trying registry schema (machine_role):', schema)
            const registryClient = getClientForSchema(schema)
            const { data, error } = await registryClient
              .from('assets')
              .select('id, asset_code, asset_type, machine_role')
              .in('machine_role', types)
              .eq('status', 'ACTIVE')

            if (error) {
              console.warn(`No assets in schema ${schema} by machine_role (or error):`, error)
              continue
            }

            if (data && (data as any[]).length > 0) {
              found = data as any[]
              console.info(`Found ${found.length} assets in schema ${schema} by machine_role`)
              break
            }
          } catch (err) {
            console.warn(`Error querying schema ${schema} by machine_role:`, err)
          }
        }

        // 2) Fallback: try matching by `asset_type`
        if (!found) {
          for (const schema of candidateSchemas) {
            try {
              console.info('Trying registry schema (asset_type):', schema)
              const registryClient = getClientForSchema(schema)
              const { data, error } = await registryClient
                .from('assets')
                .select('id, asset_code, asset_type, machine_role')
                .in('asset_type', types)
                .eq('status', 'ACTIVE')

              if (error) {
                console.warn(`No assets in schema ${schema} by asset_type (or error):`, error)
                continue
              }

              if (data && (data as any[]).length > 0) {
                found = data as any[]
                console.info(`Found ${found.length} assets in schema ${schema} by asset_type`)
                break
              }
            } catch (err) {
              console.warn(`Error querying schema ${schema} by asset_type:`, err)
            }
          }
        }

        // 3) Fallback: try ilike searches on asset_type and asset_code for each type
        if (!found) {
          for (const schema of candidateSchemas) {
            try {
              const registryClient = getClientForSchema(schema)
              for (const t of types) {
                try {
                  console.info(`Trying ilike on schema ${schema} for type '${t}'`)
                  const pattern = `%${t.toLowerCase()}%`
                  const { data, error } = await registryClient
                    .from('assets')
                    .select('id, asset_code, asset_type, machine_role')
                    .or(`asset_type.ilike.${pattern},asset_code.ilike.${pattern}`)
                    .eq('status', 'ACTIVE')

                  if (error) {
                    console.warn(`No ilike matches in schema ${schema} for '${t}':`, error)
                    continue
                  }

                  if (data && (data as any[]).length > 0) {
                    found = data as any[]
                    console.info(`Found ${found.length} assets in schema ${schema} by ilike '${t}'`)
                    break
                  }
                } catch (err) {
                  console.warn(`Error ilike querying schema ${schema} for '${t}':`, err)
                }
              }
              if (found) break
            } catch (err) {
              console.warn(`Error querying schema ${schema} during ilike pass:`, err)
            }
          }
        }

        if (found) {
          setAvailableMachines(
            found.map(d => ({ ...d, id: String(d.id) })) as Machine[]
          )
        } else {
          console.info('No registry assets found in any candidate schema')
          setAvailableMachines([])

          // For debugging: fetch a small sample from each candidate schema
          const samples: { schema: string; rows: any[] }[] = []
          for (const schema of candidateSchemas) {
            try {
              const client = getClientForSchema(schema)
              // fetch a few rows to inspect available fields/values
              // eslint-disable-next-line no-await-in-loop
              const { data: sampleData } = await client
                .from('assets')
                .select('id, asset_code, asset_type, machine_role')
                .limit(10)
              samples.push({ schema, rows: (sampleData as any[]) || [] })
            } catch (err) {
              samples.push({ schema, rows: [] })
            }
          }
          setRegistrySamples(samples)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Unexpected error fetching assets', err)
        setAvailableMachines([])
      } finally {
        setLoadingMachines(false)
        setStep(2)
      }
    }

    void fetchForTypes()
  }

  const handleMaterialAssign = (newAssignments: typeof assignments) => {
    setAssignments(newAssignments)
    setStep(3)
  }

  const handleDistancesConfirm = (newDistances: typeof distances) => {
    setDistances(newDistances)
    setStep(4)
  }

  const handleStartHourly = async () => {
    try {
      const db = getDb()

      // Determine the desired shift kind from current time (06:00-18:00 => DAY)
      const now = new Date()
      const desiredKind = getShiftKindForTime(now) // 'DAY' or 'NIGHT'

      // Compute rotation mapping (anchor: Group A on today's date). This
      // lets us log or later display which groups are DAY/NIGHT/HOME.
      try {
        let anchor = getShiftAnchor()
        if (!anchor) {
          // Persist the default anchor (Group A, today) now that the user
          // confirmed they wanted the anchor stored.
          setShiftAnchor('A' as Group, new Date())
          anchor = getShiftAnchor()
        }
        const anchorDate = anchor?.anchorDate || new Date()
        const anchorGroup = (anchor?.anchorGroup || 'A') as Group
        const rotation = getRotationForDate(now, anchorDate, anchorGroup)
        // eslint-disable-next-line no-console
        console.info('Shift rotation for today (anchor):', rotation)
      } catch (e) {
        // ignore rotation errors — we still prefer to set shift kind from time
      }

      // Determine a valid shift_code from shift_definitions (prefer current time-kind)
      let chosenShiftCode = desiredKind
      try {
        // DEBUG: log site and inspect raw response to diagnose empty result
        // Remove these logs after debugging.
        // eslint-disable-next-line no-console
        console.debug('Debug: reading shift_definitions for site', site)
        const { data: defs, error: defsError, status, statusText } = await db.from('shift_definitions').select('code')
        // eslint-disable-next-line no-console
        console.debug('Debug: shift_definitions response', { defs, defsError, status, statusText })
        if (defs && (defs as any[]).length > 0) {
          // look for the desired kind first, falling back to first available
          const found = (defs as any[]).find(d => (d.code || '').toLowerCase() === (desiredKind || '').toLowerCase())
          chosenShiftCode = found ? found.code : defs[0].code
        } else {
          // No shift_definitions exist for this site: alert the user and abort
          // to avoid a foreign key violation when inserting shift_plans.
          // eslint-disable-next-line no-alert
          alert('No shift definitions are configured for this site. Please ask an administrator to add at least one shift definition (e.g. DAY).')
          return
        }
      } catch (err) {
        // If fetching shift_definitions fails, surface a helpful error and abort
        // eslint-disable-next-line no-console
        console.error('Could not read shift_definitions:', err)
        // eslint-disable-next-line no-alert
        alert('Failed to read shift definitions for this site. Please check your network or permissions.')
        return
      }

      // 1) Ensure a daily_plans row exists for this site/date/shift.
      const planDate = new Date().toISOString().split('T')[0]

      // Try to find an existing plan to avoid unique constraint errors
      let plan: any = null
      try {
        const { data: existing, error: existingError } = await db
          .from('daily_plans')
          .select('*')
          .eq('site', site)
          .eq('shift_date', planDate)
          .eq('shift', chosenShiftCode)
          .limit(1)

        if (existing && (existing as any[]).length > 0) {
          plan = (existing as any[])[0]
          // eslint-disable-next-line no-console
          console.info('Reusing existing daily_plans row', plan.id)
        } else {
          const { data: inserted, error: insertError } = await db
            .from('daily_plans')
            .insert({
              site,
              shift_date: planDate,
              shift: chosenShiftCode,
              created_by: user?.id,
              created_at: new Date(),
            })
            .select()
            .single()

          if (insertError) throw insertError
          plan = inserted
        }
      } catch (e) {
        throw e
      }

      // 2) Insert machine assignments for the plan into the same schema
      const assignmentsToInsert: any[] = []
      for (const material of ['OB', 'OB_REHAB', 'COAL'] as const) {
        const machineIds = assignments[material] || []
        const distance = distances[material]
        for (const machineId of machineIds) {
          assignmentsToInsert.push({
            daily_plan_id: plan.id,
            machine_id: machineId,
            material_type: material,
            haul_distance: distance ?? null,
          })
        }
      }

      if (assignmentsToInsert.length > 0) {
        const { error: assignError } = await db
          .from('daily_plan_machines')
          .insert(assignmentsToInsert)
        if (assignError) throw assignError
      }

      // 3) Persist planId and navigate to hourly logging with planId
      try {
        localStorage.setItem('currentPlanId', String(plan.id))
        try {
          localStorage.setItem('currentPlanGroup', selectedGroup)
        } catch (e) {
          // ignore
        }
        try {
          localStorage.setItem('currentPlanShift', selectedShift)
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore storage errors
      }
      navigate('/hourly-logging', { state: { planId: plan.id, group: selectedGroup, shift: selectedShift } })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save plan:', err)
      // friendly feedback for the user
      // eslint-disable-next-line no-alert
      alert('Could not save plan. Please try again.')
    }
  }

  // ---------- Render Steps ----------
  return (
    <Layout activePage="/production-input">
      {step === 1 && (
          <DailyPlanningStep
          onNext={handleDailyPlanConfirm}
          initialSelected={selectedTypes}
          activePlanExists={activePlanExists}
          activePlanId={activePlanId}
          selectedGroup={selectedGroup}
          selectedShift={selectedShift}
          onGroupChange={g => {
            setSelectedGroup(g)
            try {
              localStorage.setItem('currentPlanGroup', g)
            } catch (e) {
              // ignore
            }
          }}
          onShiftChange={s => {
            setSelectedShift(s)
            try {
              localStorage.setItem('currentPlanShift', s)
            } catch (e) {
              // ignore
            }
          }}
        />
      )}
          {step === 2 && (
            <MaterialAssignmentStep
              onNext={handleMaterialAssign}
              onBack={() => setStep(1)}
              machines={availableMachines.filter(m =>
                  selectedTypes.includes(m.asset_type) || selectedTypes.includes(m.machine_role)
                )}
              initialAssignments={assignments}
              loading={loadingMachines}
              onRetry={() => {
                // simple retry: re-run the confirm handler to fetch again
                handleDailyPlanConfirm(selectedTypes)
              }}
              registrySamples={registrySamples}
            />
          )}
      {step === 3 && (
        <DistanceStep
          onNext={handleDistancesConfirm}
          onBack={() => setStep(2)}
          initialDistances={distances}
          assignments={assignments}
        />
      )}
      {step === 4 && (
        <SummaryStep
          assignments={assignments}
          distances={distances}
          machines={availableMachines}
          onBack={() => setStep(3)}
          onConfirm={handleStartHourly}
          activePlanExists={activePlanExists}
          activePlanId={activePlanId}
          selectedGroup={selectedGroup}
          selectedShift={selectedShift}
        />
      )}
    </Layout>
  )
}

// ---------- STEP 1: Daily Planning ----------
function DailyPlanningStep({ onNext, initialSelected, activePlanExists, activePlanId, selectedGroup, selectedShift, onGroupChange, onShiftChange }: { onNext: (types: string[]) => void; initialSelected?: string[]; activePlanExists?: boolean; activePlanId?: string | null; selectedGroup?: 'A'|'B'|'C'; selectedShift?: 'DAY'|'NIGHT'; onGroupChange?: (g: 'A'|'B'|'C') => void; onShiftChange?: (s: 'DAY'|'NIGHT') => void }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>(initialSelected || [])

  const machineRoles = [
    { value: 'HAULER', label: 'Trucks (ADT / RDT)' },
    { value: 'PRODUCER', label: 'Excavators' },
    { value: 'SUPPORT', label: 'Dozers / Graders' },
    { value: 'SERVICE', label: 'Front End Loader' },
    { value: 'CRUSHER', label: 'Crusher' },
  ]

  const toggleRole = (role: string) => {
    setSelected(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  return (
    <section id="daily-planning">
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>Group</label>
          <select
            value={selectedGroup}
            onChange={e => onGroupChange && onGroupChange(e.target.value as 'A'|'B'|'C')}
            style={{ fontSize: 18, padding: '10px 14px', minWidth: 180, height: 48, borderRadius: 8 }}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>Shift</label>
          <select
            value={selectedShift}
            onChange={e => onShiftChange && onShiftChange((e.target.value as 'DAY'|'NIGHT'))}
            style={{ fontSize: 18, padding: '10px 14px', minWidth: 180, height: 48, borderRadius: 8 }}
          >
            <option value="DAY">Day</option>
            <option value="NIGHT">Night</option>
          </select>
        </div>
      </div>
      {activePlanExists && (
        <div className="warning-banner" style={{ marginBottom: 12, padding: 12, background: '#fff7e6', border: '1px solid #ffd39b' }}>
          <strong>Active plan detected:</strong> A plan for the current shift already exists. Open Hourly Logging to continue logging against the active plan.
          <div style={{ marginTop: 8 }}>
            <button className="secondary-btn" onClick={() => navigate('/hourly-logging', { state: { planId: activePlanId, group: selectedGroup, shift: selectedShift } })}>
              Open Hourly Logging
            </button>
          </div>
        </div>
      )}
      <h2>Daily Machine Planning</h2>
      <p>Select machine types required for today</p>

      <div className="planning-grid">
        {machineRoles.map(role => {
          const isSelected = selected.includes(role.value)
          return (
            <button
              key={role.value}
              type="button"
              className={`role-pill ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggleRole(role.value)}
            >
              <div className="role-pill-content">
                <div className="role-pill-label" style={{ fontSize: '1.05rem', fontWeight: 600 }}>{role.label}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          className="submit-btn"
          onClick={() => onNext(selected)}
          disabled={selected.length === 0 || !!activePlanExists}
        >
          {activePlanExists ? 'Active plan exists — Open Hourly Logging' : 'Confirm Daily Plan'}
        </button>
      </div>
    </section>
  )
}

// ---------- STEP 2: Material Assignment ----------
function MaterialAssignmentStep({
  onNext,
  onBack,
  machines,
  initialAssignments,
  loading,
  onRetry,
  registrySamples,
}: { onNext: (a: any) => void; onBack?: () => void; machines: Machine[]; initialAssignments: any; loading?: boolean; onRetry?: () => void; registrySamples?: { schema: string; rows: any[] }[] }) {
  type MaterialKey = 'OB' | 'OB_REHAB' | 'COAL'
  const materials: MaterialKey[] = ['OB', 'OB_REHAB', 'COAL']
  const [assignments, setAssignments] = useState(initialAssignments)
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [nameFilter, setNameFilter] = useState('')
  const [visibleByMaterial, setVisibleByMaterial] = useState<Record<MaterialKey, string[]>>({
    OB: [],
    OB_REHAB: [],
    COAL: [],
  })
  const [exitingByMaterial, setExitingByMaterial] = useState<Record<MaterialKey, string[]>>({
    OB: [],
    OB_REHAB: [],
    COAL: [],
  })

  const toggleMachine = (material: keyof typeof assignments, machineId: string) => {
    setAssignments((prev: any) => {
      const current = prev[material] || []
      return {
        ...prev,
        [material]: current.includes(machineId)
          ? current.filter((id: string) => id !== machineId)
          : [...current, machineId],
      }
    })
  }

  const isAssignedElsewhere = (machineId: string, currentMaterial: MaterialKey) => {
    for (const mat of materials) {
      if (mat !== currentMaterial && assignments[mat]?.includes(machineId)) {
        return true
      }
    }
    return false
  }

  useEffect(() => {
    const exitDurationMs = 180

    setVisibleByMaterial(prev => {
      const next = { ...prev }

      for (const material of materials) {
        const desired = machines
          .filter(machine => !isAssignedElsewhere(machine.id, material))
          .map(machine => machine.id)
        const current = prev[material] || []
        const currentSet = new Set(current)
        const desiredSet = new Set(desired)
        const toAdd = desired.filter(id => !currentSet.has(id))
        const toRemove = current.filter(id => !desiredSet.has(id))

        if (toAdd.length > 0) {
          next[material] = [...current, ...toAdd]
        }

        for (const id of toRemove) {
          setExitingByMaterial(exitingPrev => {
            const existing = exitingPrev[material] || []
            if (existing.includes(id)) return exitingPrev
            return { ...exitingPrev, [material]: [...existing, id] }
          })

          setTimeout(() => {
            setVisibleByMaterial(visiblePrev => ({
              ...visiblePrev,
              [material]: (visiblePrev[material] || []).filter(x => x !== id),
            }))
            setExitingByMaterial(exitingPrev => ({
              ...exitingPrev,
              [material]: (exitingPrev[material] || []).filter(x => x !== id),
            }))
          }, exitDurationMs)
        }

        if (toAdd.length === 0 && toRemove.length === 0) {
          next[material] = current
        }
      }

      return next
    })
  }, [assignments, machines])

  const roleOptions = Array.from(new Set(machines.map(m => m.machine_role))).sort()
  const typeOptions = Array.from(new Set(machines.map(m => m.asset_type))).sort()

  const matchesFilters = (machine: Machine) => {
    if (roleFilter !== 'ALL' && machine.machine_role !== roleFilter) return false
    if (typeFilter !== 'ALL' && machine.asset_type !== typeFilter) return false
    if (nameFilter.trim()) {
      const needle = nameFilter.trim().toLowerCase()
      const hay = `${machine.asset_code} ${machine.machine_role} ${machine.asset_type}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }

  const getVisibleMachines = (material: MaterialKey) =>
    machines.filter(
      machine =>
        visibleByMaterial[material]?.includes(machine.id) && matchesFilters(machine),
    )

  const canConfirm = materials.every(mat => (assignments[mat]?.length || 0) > 0)

  return (
    <section id="material-assignment">
      <h2>Assign Machines to Material</h2>
      <div className="machine-filters">
        <div className="filter-field">
          <label htmlFor="role-filter">Role</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All roles</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All types</option>
            {typeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="name-filter">Name</label>
          <input
            id="name-filter"
            className="filter-input"
            type="text"
            placeholder="Search by code or text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
          />
        </div>
      </div>
      <div className="nav-actions top" style={{ margin: '12px 0' }}>
        <button type="button" className="secondary-btn" onClick={onBack}>← Back</button>
        <span className="btn-with-tooltip">
          <button
            type="button"
            className="submit-btn wide"
            onClick={() => onNext(assignments)}
            disabled={!canConfirm}
          >
            Confirm Material Assignment
          </button>
        </span>
      </div>
      {loading ? (
        <div className="empty-state">Loading machines…</div>
      ) : machines.length === 0 ? (
        <div className="empty-state">
          <p>No machines were found for the selected roles.</p>
          <div className="nav-actions">
            <button className="secondary-btn" onClick={onBack}>← Back</button>
            <button className="submit-btn" onClick={onRetry}>Retry</button>
          </div>
        </div>
      ) : (
        <div className="material-grid">
          {materials.map(material => (
            <div key={material} className="material-column">
              <h3>
                {material === 'OB' && 'OB (Mining)'}
                {material === 'OB_REHAB' && 'OB (Rehabilitation)'}
                {material === 'COAL' && 'Coal'}
              </h3>
              <div className="machine-list">
                {getVisibleMachines(material).map(machine => (
                  <label
                    key={machine.id}
                    className={`machine-card ${
                      exitingByMaterial[material]?.includes(machine.id) ? 'is-exiting' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={assignments[material]?.includes(machine.id) || false}
                      onChange={() => toggleMachine(material, machine.id)}
                    />
                    <div className="machine-card-inner">
                      <div className="machine-card-top">
                        <span className="machine-code">{machine.asset_code}</span>
                        <span className={`machine-badge role-${machine.machine_role.toLowerCase()}`}>
                          {machine.machine_role}
                        </span>
                      </div>
                      <div className="machine-card-meta">
                        <span className="machine-meta-label">Type</span>
                        <span className="machine-meta-value">{machine.asset_type}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug: show sample rows from registry schemas when available */}
      {registrySamples && registrySamples.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>Registry samples (debug)</h4>
          {registrySamples.map(s => (
            <div key={s.schema} style={{ marginBottom: 8 }}>
              <strong>{s.schema}</strong>
              <pre style={{ maxHeight: 120, overflow: 'auto' }}>{JSON.stringify(s.rows, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
      

      <div className="nav-actions">
        <button type="button" className="secondary-btn" onClick={onBack}>
          ← Back
        </button>
        <span className="btn-with-tooltip">
          <button
            type="button"
            className="submit-btn wide"
            onClick={() => onNext(assignments)}
            disabled={!canConfirm}
          >
            Confirm Material Assignment
          </button>
        </span>
      </div>
    </section>
  )
}

// ---------- STEP 3: Haul Distances ----------
function DistanceStep({
  onNext,
  onBack,
  initialDistances,
  assignments,
}: { onNext: (d: any) => void; onBack?: () => void; initialDistances: any; assignments: any }) {
  const [distances, setDistances] = useState(initialDistances)

  // Only show distance inputs for materials that have at least one machine assigned
  const showOB = assignments.OB?.length > 0
  const showOBRehab = assignments.OB_REHAB?.length > 0
  const showCoal = assignments.COAL?.length > 0

  return (
    <section id="material-distance">
      <h2>Material Haul Distance</h2>

      <div className="distance-grid">
        {showOB && (
          <div className="distance-card">
            <div className="distance-card-head">
              <h3>Overburden (Mining)</h3>
              <span className="distance-hint">Estimated round-trip</span>
            </div>
            <div className="distance-input-row">
              <input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={distances.OB || ''}
                onChange={e => setDistances({ ...distances, OB: Number(e.target.value) })}
              />
              <span className="distance-unit">m</span>
            </div>
          </div>
        )}

        {showOBRehab && (
          <div className="distance-card">
            <div className="distance-card-head">
              <h3>Overburden (Rehabilitation)</h3>
              <span className="distance-hint">Rehab haul distance</span>
            </div>
            <div className="distance-input-row">
              <input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={distances.OB_REHAB || ''}
                onChange={e =>
                  setDistances({ ...distances, OB_REHAB: Number(e.target.value) })
                }
              />
              <span className="distance-unit">m</span>
            </div>
          </div>
        )}

        {showCoal && (
          <div className="distance-card">
            <div className="distance-card-head">
              <h3>Coal</h3>
              <span className="distance-hint">Haul to stockpile</span>
            </div>
            <div className="distance-input-row">
              <input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={distances.COAL || ''}
                onChange={e => setDistances({ ...distances, COAL: Number(e.target.value) })}
              />
              <span className="distance-unit">m</span>
            </div>
          </div>
        )}
      </div>

      <div className="nav-actions">
        <button className="secondary-btn" onClick={onBack}>
          ← Back
        </button>
        <button className="submit-btn" onClick={() => onNext(distances)}>
          Proceed
        </button>
      </div>
    </section>
  )
}

// ---------- STEP 4: Summary ----------
function SummaryStep({
  assignments,
  distances,
  machines,
  onBack,
  onConfirm,
  activePlanExists,
  activePlanId,
  selectedGroup,
  selectedShift,
}: {
  assignments: any,
  distances: any,
  machines: Machine[],
  onBack: () => void,
  onConfirm: () => void,
  activePlanExists?: boolean,
  activePlanId?: string | null,
  selectedGroup?: 'A'|'B'|'C',
  selectedShift?: 'DAY'|'NIGHT',
}) {
  const getMachine = (id: string) => machines.find(m => m.id === id)

  const materialDisplay = (material: string) => {
    if (material === 'OB') return 'Overburden (Mining)'
    if (material === 'OB_REHAB') return 'Overburden (Rehabilitation)'
    return 'Coal'
  }

  return (
    <section id="production-summary">
      <h2>Production Summary</h2>

      <div style={{ marginBottom: 12, color: '#374151' }}>
        <strong>Group:</strong>&nbsp;{selectedGroup ?? 'A'} &nbsp;•&nbsp; <strong>Shift:</strong>&nbsp;{selectedShift === 'NIGHT' ? 'Night' : 'Day'}
      </div>

      <div className="summary-grid">
        {['OB', 'OB_REHAB', 'COAL'].map(material => {
          const assigned = assignments[material] || []
          if (!assigned.length) return null

          return (
            <div key={material} className="summary-card">
              <div className="summary-header">
                <h3>{materialDisplay(material)}</h3>
                <div className="summary-distance">
                  <div className="summary-distance-label">Haul Distance</div>
                  <div className="summary-distance-value-wrap">
                    <span className="summary-distance-value">{distances[material] ?? 0}</span>
                    <span className="summary-distance-unit">m</span>
                  </div>
                </div>
              </div>

              <div className="summary-body">
                <div className="summary-row">
                  <div className="summary-row-title">Assigned Machines</div>
                  <div className="machine-chips">
                    {assigned.map((id: string) => {
                      const m = getMachine(id)
                      return (
                        <div key={id} className="machine-chip">
                          <div className="chip-left">
                            <span className="chip-code">{m?.asset_code ?? id}</span>
                            <span className={`chip-role role-${m?.machine_role?.toLowerCase()}`}>{m?.machine_role ?? ''}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="nav-actions" style={{ marginTop: 18 }}>
        <button className="secondary-btn" onClick={onBack}>
          ← Back
        </button>
        <button className="submit-btn" onClick={onConfirm} disabled={activePlanExists}>
          {activePlanExists ? 'Active plan exists — Open Hourly Logging' : 'Start Hourly Logging'}
        </button>
      </div>
    </section>
  )
}