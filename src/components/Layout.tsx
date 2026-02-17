import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
  activePage: string // to highlight the active nav item
}

export default function Layout({ children, activePage }: LayoutProps) {
  const { user, role, site, displayName, signOut } = useAuth()
  const navigate = useNavigate()

  // Determine navigation links based on role
  const navLinks = (() => {
    const normalized = role ? role.toLowerCase() : ''
    if (normalized === 'admin' || normalized === 'supervisor') {
      const livePath = normalized === 'supervisor' ? '/supervisor-live-site' : '/live-site'
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: livePath, label: 'Live Site' },
        { path: '/supervisor-review', label: 'Supervisor Review' },
        { path: '/workshop', label: 'Workshop' },
        { path: '/exceptions', label: 'Exceptions' }
      ]
    } else if (normalized === 'controller') {
      return [
        { path: '/controller-dashboard', label: 'My Dashboard' },
        { path: '/production-input', label: 'Production Input' },
        { path: '/hourly-logging', label: 'Hourly Logging' }
      ]
    }
    return []
  })()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="logo">
          LOMEZA<br />
          <span>{site || 'ALL SITES'}</span>
        </div>

        <nav>
          {navLinks.map(link => (
            <a
              key={link.path}
              href={link.path}
              className={activePage === link.path ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); navigate(link.path); }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-box">
            <div id="user-name">{displayName ?? (user?.email?.split('@')[0] || '')}</div>
            <div id="user-role">{role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : ''}</div>
          </div>
          <button type="button" className="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        {children}
      </main>
    </div>
  )
}