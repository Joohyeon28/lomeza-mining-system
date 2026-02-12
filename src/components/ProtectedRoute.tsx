import { ReactElement } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requireSite = false }: { children: ReactElement; requireSite?: boolean }) {
  const { user, loading, site } = useAuth()
  const location = useLocation()
  const params = useParams()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (requireSite) {
    const routeSite = (params as any).siteId
    if (!site) return <div>Access denied: no site assigned to user</div>
    if (routeSite && routeSite !== site) return <div>Access denied for this site</div>
  }

  return children
}
