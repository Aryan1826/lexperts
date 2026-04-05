// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Experts from './pages/Experts'
import MyBookings from './pages/MyBookings'
import ExpertProfile from './pages/ExpertProfile'
import ExpertDashboard from './pages/ExpertDashboard'
import AdminPanel from './pages/AdminPanel'
import { getToken, getUser } from './services/auth.service'

const PrivateRoute = ({ children }) => {
  return getToken() ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  return !getToken() ? children : <Navigate to="/dashboard" replace />
}

const ExpertOnlyRoute = ({ children }) => {
  const token = getToken()
  const user = getUser()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'expert') return <Navigate to="/dashboard" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const token = getToken()
  const user = getUser()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          },
          success: {
            iconTheme: { primary: '#4CAF50', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#F44336', secondary: 'white' },
            duration: 5000,
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/experts" element={<PrivateRoute><Experts /></PrivateRoute>} />
        <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
        <Route path="/expert-profile" element={<ExpertOnlyRoute><ExpertProfile /></ExpertOnlyRoute>} />
        <Route path="/expert-dashboard" element={<ExpertOnlyRoute><ExpertDashboard /></ExpertOnlyRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
