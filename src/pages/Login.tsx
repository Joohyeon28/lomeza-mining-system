import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import bgImage from '../assets/images/bg.jpg'

export default function Login() {
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [hasSelectedSite, setHasSelectedSite] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/'

  // Handle site selection
  const handleSiteSelect = (site: string | null) => {
    setSelectedSite(site)
    setHasSelectedSite(true)
    setError(null) // clear any previous errors
  }

  // Handle login form submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!hasSelectedSite) {
      setError('Please select a site first.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const role = await signIn(email, password, selectedSite)
      if (role === 'admin') {
        navigate('/admin-operations-review', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  // If no site selected yet – show site selection UI
  if (!hasSelectedSite) {
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
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
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
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => handleSiteSelect(null)}
              aria-label="Admin login"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '8px 12px',
                color: '#ffb300',
                cursor: 'pointer',
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" fill="#ffb300" />
                <path d="M17 8V7a5 5 0 10-10 0v1H5v11h14V8h-2zM9 7a3 3 0 116 0v1H9V7z" fill="#ffb300" />
              </svg>
              Admin login
            </button>
          </div>
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
              <div className="site-name">{selectedSite || 'ADMIN (ALL SITES)'}</div>
            </div>
            <button className="change-site-btn" onClick={() => { setSelectedSite(null); setHasSelectedSite(false) }}>
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