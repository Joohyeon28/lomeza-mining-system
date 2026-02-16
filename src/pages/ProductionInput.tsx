import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import { supabase, getClientForSchema } from '../lib/supabaseClient'
import Layout from '../components/Layout'

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
  const [step, setStep] = useState(1)
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
              .from(`${schema}.assets`)
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
                  .from(`${schema}.assets`)
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
                    .from(`${schema}.assets`)
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
                  .from(`${schema}.assets`)
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

  const handleStartHourly = () => {
    // In a real app, you might persist the plan to a `shift_plans` table here.
    navigate('/hourly-logging')
  }

  // ---------- Render Steps ----------
  return (
    <Layout activePage="/production-input">
      {step === 1 && (
        <DailyPlanningStep
          onNext={handleDailyPlanConfirm}
          initialSelected={selectedTypes}
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
        />
      )}
    </Layout>
  )
}

// ---------- STEP 1: Daily Planning ----------
function DailyPlanningStep({ onNext, initialSelected }: { onNext: (types: string[]) => void; initialSelected?: string[] }) {
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
      <h2>Daily Machine Planning</h2>
      <p>Select machine types required for today</p>

      <div className="planning-grid">
        {machineRoles.map(role => (
          <label key={role.value}>
            <input
              type="checkbox"
              value={role.value}
              checked={selected.includes(role.value)}
              onChange={() => toggleRole(role.value)}
            />
            {role.label}
          </label>
        ))}
      </div>

      <button
        className="submit-btn"
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
      >
        Confirm Daily Plan
      </button>
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
  const [assignments, setAssignments] = useState(initialAssignments)

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

  const isAssignedElsewhere = (machineId: string, currentMaterial: string) => {
    for (const mat of ['OB', 'OB_REHAB', 'COAL'] as const) {
      if (mat !== currentMaterial && assignments[mat]?.includes(machineId)) {
        return true
      }
    }
    return false
  }

  return (
    <section id="material-assignment">
      <h2>Assign Machines to Material</h2>
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
          {['OB', 'OB_REHAB', 'COAL'].map(material => (
            <div key={material} className="material-column">
              <h3>
                {material === 'OB' && 'OB (Mining)'}
                {material === 'OB_REHAB' && 'OB (Rehabilitation)'}
                {material === 'COAL' && 'Coal'}
              </h3>
              <div className="machine-list">
                {machines.map(machine => (
                  <label
                    key={machine.id}
                    className={`machine-card ${
                      isAssignedElsewhere(machine.id, material) ? 'disabled' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={assignments[material]?.includes(machine.id) || false}
                      onChange={() => toggleMachine(material, machine.id)}
                      disabled={isAssignedElsewhere(machine.id, material)}
                    />
                    <span className="machine-label">{machine.asset_code}</span>
                    <span className={`machine-role role-${machine.machine_role}`}>
                      {machine.machine_role}
                    </span>
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
        <button
          type="button"
          className="submit-btn wide"
          onClick={() => onNext(assignments)}
        >
          Confirm Material Assignment
        </button>
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

      {showOB && (
        <div className="material-card">
          <h3>Overburden (Mining)</h3>
          <input
            type="number"
            placeholder="meters"
            value={distances.OB || ''}
            onChange={e => setDistances({ ...distances, OB: Number(e.target.value) })}
          />
        </div>
      )}
      {showOBRehab && (
        <div className="material-card">
          <h3>Overburden (Rehabilitation)</h3>
          <input
            type="number"
            placeholder="meters"
            value={distances.OB_REHAB || ''}
            onChange={e =>
              setDistances({ ...distances, OB_REHAB: Number(e.target.value) })
            }
          />
        </div>
      )}
      {showCoal && (
        <div className="material-card">
          <h3>Coal</h3>
          <input
            type="number"
            placeholder="meters"
            value={distances.COAL || ''}
            onChange={e => setDistances({ ...distances, COAL: Number(e.target.value) })}
          />
        </div>
      )}

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
}: {
  assignments: any
  distances: any
  machines: Machine[]
  onBack: () => void
  onConfirm: () => void
}) {
  const getMachineCode = (id: string) =>
    machines.find(m => m.id === id)?.asset_code || id

  return (
    <section id="production-summary">
      <h2>Production Summary</h2>

      {['OB', 'OB_REHAB', 'COAL'].map(material => {
        if (!assignments[material]?.length) return null
        return (
          <div key={material} className="summary-block">
            <h3>
              {material === 'OB' && 'Overburden (Mining)'}
              {material === 'OB_REHAB' && 'Overburden (Rehabilitation)'}
              {material === 'COAL' && 'Coal'}
            </h3>
            <p>
              <strong>Distance:</strong> {distances[material]} m
            </p>
            <p>
              <strong>Assigned Machines:</strong>{' '}
              {assignments[material].map(getMachineCode).join(', ')}
            </p>
          </div>
        )
      })}

      <div className="nav-actions">
        <button className="secondary-btn" onClick={onBack}>
          ← Back
        </button>
        <button className="submit-btn" onClick={onConfirm}>
          Start Hourly Logging
        </button>
      </div>
    </section>
  )
}