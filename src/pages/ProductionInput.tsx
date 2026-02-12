import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
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
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([])
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
      const db = useDb()
      const { data } = await db
        .from('assets')
        .select('id, asset_code, asset_type, machine_role')
        .eq('site', site)
        .eq('status', 'ACTIVE') // only active machines
      if (data) setAvailableMachines(data as Machine[])
    }

    fetchMachines()
  }, [site])

  const handleDailyPlanConfirm = (types: string[]) => {
    setSelectedTypes(types)
    setStep(2)
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
            selectedTypes.includes(m.machine_role)
          )}
          initialAssignments={assignments}
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
}: { onNext: (a: any) => void; onBack?: () => void; machines: Machine[]; initialAssignments: any }) {
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