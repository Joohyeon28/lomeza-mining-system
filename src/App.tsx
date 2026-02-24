import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login.tsx'

// Admin / Supervisor pages
import Dashboard from './pages/Dashboard.tsx'
import LiveSite from './pages/LiveSite.tsx'
import SupervisorReview from './pages/SupervisorReview.tsx'
import SupervisorDashboard from './pages/SupervisorDashboard.tsx'
import SupervisorLiveSite from './pages/SupervisorLiveSite.tsx'
import Workshop from './pages/Workshop.tsx'
import WorkshopAssets from './pages/WorkshopAssets.tsx'
import Exceptions from './pages/Exceptions.tsx'
import AdminOperationsReview from './pages/AdminOperationsReview.tsx'

// Controller pages
import ControllerDashboard from './pages/ControllerDashboard.tsx'
import ProductionInput from './pages/ProductionInput.tsx'
import HourlyLogging from './pages/HourlyLogging.tsx'

import { useEffect } from 'react'

function App() {
  // Keep localStorage intact across reloads; session persistence handled by AuthContext/supabase
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        let navType: string | undefined
        try {
          const nav = performance.getEntriesByType('navigation')?.[0] as any
          navType = nav?.type
        } catch (err) {
          // ignore
        }
        // performance.navigation.type === 1 is reload in older browsers
        const perfNav = (performance as any).navigation?.type
        const isReload = navType === 'reload' || perfNav === 1
        if (!isReload) {
          try {
            localStorage.removeItem('lomeza:session')
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  function RoleRedirect() {
    const { user, role, loading } = useAuth()
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
    if (!user) return <Navigate to="/login" replace />
    const r = role ? role.toLowerCase() : ''
    if (r === 'admin') return <Navigate to="/dashboard" replace />
    if (r === 'supervisor') return <Navigate to="/supervisor-dashboard" replace />
    if (r === 'controller') return <Navigate to="/controller-dashboard" replace />
    return <Navigate to="/login" replace />
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin / Supervisor routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live-site"
          element={
            <ProtectedRoute>
              <LiveSite />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor-review"
          element={
            <ProtectedRoute>
              <SupervisorReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor-live-site"
          element={
            <ProtectedRoute>
              <SupervisorLiveSite />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor-dashboard"
          element={
            <ProtectedRoute>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workshop"
          element={
            <ProtectedRoute>
              <Workshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-operations-review"
          element={
            <ProtectedRoute>
              <AdminOperationsReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workshop/assets"
          element={
            <ProtectedRoute>
              <WorkshopAssets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute>
              <Exceptions />
            </ProtectedRoute>
          }
        />

        {/* Controller routes */}
        <Route
          path="/controller-dashboard"
          element={
            <ProtectedRoute>
              <ControllerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/production-input"
          element={
            <ProtectedRoute>
              <ProductionInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hourly-logging"
          element={
            <ProtectedRoute>
              <HourlyLogging />
            </ProtectedRoute>
          }
        />

        {/* Default redirect – route by role */}
        <Route path="/" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App