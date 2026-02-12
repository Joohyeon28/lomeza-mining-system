import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import bgImage from '../assets/images/bg.jpg'

export default function Login() {
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/'

  // Handle site selection
  const handleSiteSelect = (site: string) => {
    setSelectedSite(site)
    setError(null) // clear any previous errors
  }

  // Handle login form submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedSite) {
      setError('Please select a site first.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  // If no site selected yet – show site selection UI
  if (!selectedSite) {
    return (
      <div className="login-body" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="login-card" style={{ maxWidth: 480 }}>
          <h1 className="brand">LOMEZA</h1>
          <p className="tagline">Trackless Mobile Machinery Management</p>
          <h3 style={{ margin: '30px 0 20px', color: '#fff' }}>Select your site</h3>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={() => handleSiteSelect('Sileko')}
              style={{
                background: '#1a1a1a',
                border: '2px solid #333',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ffb300',
                cursor: 'pointer',
                flex: 1
              }}
            >
              SILEKO
            </button>
            <button
              onClick={() => handleSiteSelect('Kalagadi')}
              style={{
                background: '#1a1a1a',
                border: '2px solid #333',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ffb300',
                cursor: 'pointer',
                flex: 1
              }}
            >
              KALAGADI
            </button>
          </div>
          <small style={{ display: 'block', marginTop: 30 }}>
            Secure access to mining operations • Lomeza © 2025
          </small>
        </div>
      </div>
    )
  }

  // Site selected – show login form with chosen site info on the right
  return (
    <div className="login-body" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="login-card" style={{ maxWidth: 720, padding: '40px' }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          {/* LEFT COLUMN – Login Form */}
          <div style={{ flex: 1.2 }}>
            <h1 className="brand" style={{ fontSize: 32, marginBottom: 8 }}>LOMEZA</h1>
            <p className="tagline" style={{ marginBottom: 24 }}>Trackless Mobile Machinery Management</p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="admin@lomeza.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <p style={{ color: '#ff6b6b', margin: '8px 0 0', fontSize: '14px' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
                {submitting ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN – Chosen site & change button */}
          <div style={{ 
            flex: 0.8, 
            borderLeft: '1px solid #333', 
            paddingLeft: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase' }}>
                Chosen site
              </span>
              <div style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                color: '#ffb300',
                marginTop: 4
              }}>
                {selectedSite}
              </div>
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              style={{
                background: 'transparent',
                border: '1px solid #444',
                color: '#ccc',
                padding: '10px 0',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ⟲ CHANGE SITE
            </button>
          </div>
        </div>
        <small style={{ display: 'block', marginTop: 30, textAlign: 'center' }}>
          Secure access to mining operations • Lomeza © 2025
        </small>
      </div>
    </div>
  )
}