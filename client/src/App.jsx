// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Experts from './pages/Experts'
import MyBookings from './pages/MyBookings'
import ExpertProfile from './pages/ExpertProfile'
import ExpertDashboard from './pages/ExpertDashboard'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/experts" element={<PrivateRoute><Experts /></PrivateRoute>} />
        <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
        <Route path="/expert-profile" element={<ExpertOnlyRoute><ExpertProfile /></ExpertOnlyRoute>} />
        <Route path="/expert-dashboard" element={<ExpertOnlyRoute><ExpertDashboard /></ExpertOnlyRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
