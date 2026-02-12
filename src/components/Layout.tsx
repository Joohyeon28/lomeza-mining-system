import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
  activePage: string // to highlight the active nav item
}

export default function Layout({ children, activePage }: LayoutProps) {
  const { user, role, site, signOut } = useAuth()
  const navigate = useNavigate()

  // Determine navigation links based on role
  const navLinks = (() => {
    if (role === 'Admin' || role === 'Supervisor') {
      return [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/live-site', label: 'Live Site' },
        { path: '/supervisor-review', label: 'Supervisor Review' },
        { path: '/workshop', label: 'Workshop' },
        { path: '/exceptions', label: 'Exceptions' }
      ]
    } else if (role === 'Controller') {
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
            <div id="user-name">{user?.email?.split('@')[0] || ''}</div>
            <div id="user-role">{role || ''}</div>
          </div>
          <div className="logout" onClick={handleLogout}>
            Logout
          </div>
        </div>
      </aside>

      <main className="content">
        {children}
      </main>
    </div>
  )
}