import { type ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Define which roles can access which paths
const roleAccess: Record<string, string[]> = {
  // Admin / Supervisor
  '/dashboard': ['Admin', 'Supervisor'],
  '/live-site': ['Admin', 'Supervisor'],
  '/supervisor-review': ['Admin', 'Supervisor'],
  '/workshop': ['Admin'],
  '/exceptions': ['Admin', 'Supervisor'],

  // Controller
  '/controller-dashboard': ['Controller'],
  '/production-input': ['Controller'],
  '/hourly-logging': ['Controller'],
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

  // Check role-based access for the current path
  const allowedRoles = roleAccess[location.pathname]
  if (allowedRoles && !allowedRoles.includes(role || '')) {
    // Redirect to appropriate dashboard based on role
    if (role === 'Admin' || role === 'Supervisor') {
      return <Navigate to="/dashboard" replace />
    } else if (role === 'Controller') {
      return <Navigate to="/controller-dashboard" replace />
    } else {
      // Fallback for users with no recognised role
      return <Navigate to="/login" replace />
    }
  }

  return children
}