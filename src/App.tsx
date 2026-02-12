import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'

// Admin / Supervisor pages
import Dashboard from './pages/Dashboard'
import LiveSite from './pages/LiveSite'
import SupervisorReview from './pages/SupervisorReview'
import Workshop from './pages/Workshop'
import Exception from './pages/Exception'

// Controller pages
import ControllerDashboard from './pages/ControllerDashboard'
import ProductionInput from './pages/ProductionInput'
import HourlyLogging from './pages/HourlyLogging'

function App() {
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
          path="/workshop"
          element={
            <ProtectedRoute>
              <Workshop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exceptions"
          element={
            <ProtectedRoute>
              <Exception />
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

        {/* Default redirect – will be handled by ProtectedRoute based on role */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App