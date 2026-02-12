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
      await signIn(email, password, selectedSite)
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
      <div
        className="login-body"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          className="login-card"
          style={{
            maxWidth: 520,
            width: '100%',
            background: 'rgba(10,10,10,0.72)',
            padding: '36px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}
        >
          <h1 className="brand" style={{ marginBottom: 6 }}>LOMEZA</h1>
          <p className="tagline">Trackless Mobile Machinery Management</p>
          <h3 style={{ margin: '28px 0 18px', color: '#fff' }}>Select your site</h3>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <button
              onClick={() => handleSiteSelect('Sileko')}
              style={{
                background: '#1a1a1a',
                border: '2px solid #333',
                padding: '14px 26px',
                fontSize: 18,
                fontWeight: 700,
                color: '#ffb300',
                cursor: 'pointer',
                flex: 1,
                borderRadius: 6,
              }}
            >
              SILEKO
            </button>
            <button
              onClick={() => handleSiteSelect('Kalagadi')}
              style={{
                background: '#1a1a1a',
                border: '2px solid #333',
                padding: '14px 26px',
                fontSize: 18,
                fontWeight: 700,
                color: '#ffb300',
                cursor: 'pointer',
                flex: 1,
                borderRadius: 6,
              }}
            >
              KALAGADI
            </button>
          </div>
          <small className="footer-note">Secure access to mining operations • Lomeza © 2025</small>
        </div>
      </div>
    )
  }

  // Site selected – show login form with chosen site info on the right
  return (
    <div
      className="login-body"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="login-card"
        style={{
          maxWidth: 920,
          width: '100%',
          background: 'rgba(10,10,10,0.72)',
          padding: 36,
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', gap: 40, alignItems: 'stretch', flexWrap: 'wrap' }}>
          {/* LEFT COLUMN – Login Form */}
          <div style={{ flex: 1.2, minWidth: 320 }}>
              <h1 className="brand">LOMEZA</h1>
              <p className="tagline">Trackless Mobile Machinery Management</p>
            <form onSubmit={handleSubmit}>
                <input
                  className="form-input"
                  type="email"
                  placeholder="admin@lomeza.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className="form-input"
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
              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </form>
          </div>
          {/* RIGHT COLUMN – Chosen site & change button */}
          <div
            className="site-info-col"
            style={{
              flex: 0.8,
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              paddingLeft: 30,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 220,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <span className="site-label">Chosen site</span>
              <div className="site-name">{selectedSite}</div>
            </div>
            <button className="change-site-btn" onClick={() => setSelectedSite(null)}>
              ⟲ CHANGE SITE
            </button>
          </div>
        </div>
        <small className="footer-note" style={{ display: 'block', marginTop: 30, textAlign: 'center' }}>
          Secure access to mining operations • Lomeza © 2025
        </small>
      </div>
    </div>
  )
}