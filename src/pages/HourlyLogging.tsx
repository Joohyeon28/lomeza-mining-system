import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDb } from '../hooks/useDb'
import Layout from '../components/Layout'

interface Machine {
  id: string
  asset_code: string
  asset_type: string
  machine_role: string
}

interface LoggedHour {
  machine_id: string
  hour: number
  activity: 'Production' | 'Standby' | 'Breakdown'
  number_of_loads?: number
  breakdown_id?: string
}

export default function HourlyLogging() {
  const { user, site } = useAuth()
  const getDb = useDb()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loggedHours, setLoggedHours] = useState<LoggedHour[]>([])
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)

  // Fetch machines for this site
  useEffect(() => {
    const fetchMachines = async () => {
      const db = getDb()
      const { data } = await db
        .from('assets')
        .select('id, asset_code, asset_type, machine_role')
        .eq('site', site)
        .eq('status', 'ACTIVE')
      if (data) setMachines(data)
    }
    fetchMachines()
  }, [site])

  // Fetch already logged entries for today
  useEffect(() => {
    const fetchTodayLogs = async () => {
      const today = new Date().toISOString().split('T')[0]
      const db = getDb()
      const { data } = await db
        .from('production_entries')
        .select('machine_id, hour, activity, number_of_loads')
        .eq('submitted_by', user?.id)
        .eq('shift_date', today)

      if (data) {
        setLoggedHours(
          data.map(e => ({
            machine_id: e.machine_id,
            hour: e.hour,
            activity: e.activity as any,
            number_of_loads: e.number_of_loads,
          }))
        )
      }
    }
    if (user) fetchTodayLogs()
  }, [user])

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
    if (isHourLogged(machine.id, hour)) return
    setSelectedMachine(machine)
    setSelectedHour(hour)
    setShowForm(true)
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
      haul_distance: null, // you can fetch from plan if needed
      submitted_by: user?.id,
      site,
      status: 'PENDING',
    }
    const db = getDb()
    const { error } = await db.from('production_entries').insert(newEntry)
    if (error) {
      alert('Failed to save: ' + error.message)
    } else {
      setLoggedHours(prev => [
        ...prev,
        {
          machine_id: selectedMachine.id,
          hour: selectedHour!,
          activity,
          number_of_loads: loads,
        },
      ])
      setShowForm(false)
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
      status: 'OPEN',
    })
    if (error) {
      alert('Failed to log breakdown: ' + error.message)
    } else {
      // Also mark the hour as breakdown
      await handleSubmitProduction(0, 'Breakdown')
    }
    setShowBreakdownModal(false)
  }

  return (
    <Layout activePage="/hourly-logging">
      <header className="page-header">
        <h1>Hourly Production Logging</h1>
        <p>Log production for machines assigned in today’s plan</p>
        <button onClick={() => window.history.back()} className="secondary-btn">
          ← Back
        </button>
      </header>

      <section className="shift-info">
        <div id="current-shift">
          Shift: {new Date().toLocaleDateString()} Day
        </div>
        <div id="current-time">Time: {new Date().toLocaleTimeString()}</div>
      </section>

      <section id="hourly-machine-list" className="machine-grid">
        {machines.map(machine => (
          <div key={machine.id} className="hourly-machine-card">
            <h4>
              {machine.asset_code}
              <span className={`role role-${machine.machine_role}`}>
                {machine.machine_role}
              </span>
            </h4>
            <div className="hour-row">
              {Array.from({ length: 12 }, (_, i) => i + 6).map(hour => {
                const state = getHourState(machine.id, hour)
                return (
                  <button
                    key={hour}
                    className={`hour-btn ${state.toLowerCase()}`}
                    onClick={() => handleHourClick(machine, hour)}
                    disabled={state !== 'none'}
                  >
                    {hour}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>

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
    <div className="modal">
      <div className="modal-card">
        <h3>Log {machine.asset_code}</h3>
        <p>Hour: {hour}:00</p>

        <label htmlFor="activity">Activity</label>
        <select
          id="activity"
          value={activity}
          onChange={e => setActivity(e.target.value as any)}
        >
          <option value="Production">Production</option>
          <option value="Standby">Standby</option>
        </select>

        {activity === 'Production' && (
          <>
            <label htmlFor="loads">Number of Loads</label>
            <input
              type="number"
              id="loads"
              value={loads}
              onChange={e => setLoads(Number(e.target.value))}
              min="0"
            />
          </>
        )}

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-btn" onClick={() => onSubmit(loads, activity)}>
            Submit
          </button>
        </div>
        <hr style={{ margin: '20px 0', borderColor: '#333' }} />
        <button className="danger-btn" onClick={onBreakdown}>
          Log Breakdown
        </button>
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
  const [startTime, setStartTime] = useState('')

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>Log Breakdown – {machine.asset_code}</h3>
        <p>Hour: {hour}:00</p>

        <label htmlFor="reason">Reason</label>
        <select id="reason" value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">Select reason</option>
          <option>Mechanical failure</option>
          <option>Hydraulic failure</option>
          <option>Electrical fault</option>
          <option>Tyre issue</option>
          <option>Waiting for spares</option>
          <option>Other</option>
        </select>

        <label htmlFor="startTime">Start Time</label>
        <input
          type="datetime-local"
          id="startTime"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
        />

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="submit-btn danger"
            onClick={() => onSubmit(reason, startTime)}
            disabled={!reason || !startTime}
          >
            Start Breakdown
          </button>
        </div>
      </div>
    </div>
  )
}