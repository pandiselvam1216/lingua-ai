import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'

// Lazy loaded pages to optimize initial load time
const Listening = lazy(() => import('./pages/modules/Listening'))
const Speaking = lazy(() => import('./pages/modules/Speaking'))
const Reading = lazy(() => import('./pages/modules/Reading'))
const Writing = lazy(() => import('./pages/modules/Writing'))
const Grammar = lazy(() => import('./pages/modules/Grammar'))
const Vocabulary = lazy(() => import('./pages/modules/Vocabulary'))
const CriticalThinking = lazy(() => import('./pages/modules/CriticalThinking'))

const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Contact = lazy(() => import('./pages/Contact'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const StudentManagement = lazy(() => import('./pages/admin/StudentManagement'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const QuestionManagement = lazy(() => import('./pages/admin/QuestionManagement'))

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
)

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingFallback />
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="listening" element={<Listening />} />
          <Route path="speaking" element={<Speaking />} />
          <Route path="reading" element={<Reading />} />
          <Route path="writing" element={<Writing />} />
          <Route path="grammar" element={<Grammar />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="critical-thinking" element={<CriticalThinking />} />

          {/* Admin Routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/students" element={<StudentManagement />} />
          <Route path="admin/reports" element={<Reports />} />
          <Route path="admin/questions" element={<QuestionManagement />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
