import { type ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Define which roles can access which paths
const roleAccess: Record<string, string[]> = {
  // Admin / Supervisor
  '/dashboard': ['Admin', 'Supervisor'],
  '/live-site': ['Admin', 'Supervisor'],
  '/supervisor-review': ['Admin', 'Supervisor'],
  '/supervisor-live-site': ['Admin', 'Supervisor'],
  '/workshop': ['Admin'],
  '/workshop/assets': ['Admin'],
  '/exceptions': ['Admin', 'Supervisor'],

  // Controller
  '/controller-dashboard': ['Controller', 'Supervisor'],
  '/production-input': ['Controller', 'Supervisor'],
  '/hourly-logging': ['Controller', 'Supervisor'],
}

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access for the current path (case-insensitive)
  const allowedRoles = roleAccess[location.pathname]
  const normalizedRole = role ? role.toLowerCase() : ''
  // If a supervisor lands on the generic dashboard route, send them to their dedicated dashboard
  if (normalizedRole === 'supervisor' && location.pathname === '/dashboard') {
    return <Navigate to="/supervisor-dashboard" replace />
  }
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(normalizedRole)) {
    // Redirect to appropriate dashboard based on role (case-insensitive)
    if (normalizedRole === 'admin' || normalizedRole === 'supervisor') {
      return <Navigate to="/dashboard" replace />
    } else if (normalizedRole === 'controller') {
      return <Navigate to="/controller-dashboard" replace />
    } else {
      // Fallback for users with no recognised role
      return <Navigate to="/login" replace />
    }
  }

  return children
}