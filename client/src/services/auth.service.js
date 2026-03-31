// src/services/auth.service.js
// 🔐 Cookies Now Handle Token Security
// The backend now sets httpOnly cookies for both accessToken and refreshToken.
// These cookies are automatically sent with every request (due to withCredentials: true).
// We still store the accessToken temporarily in localStorage for immediate UI needs,
// but the browser cookies are the PRIMARY authentication mechanism.

import api from './api'

export const register = async (data) => {
  const res = await api.post('/auth/register', data)
  const { accessToken, user } = res.data.data

  // 📝 Store accessToken temporarily in memory/localStorage for immediate UI response
  // However, the httpOnly cookie is now doing the actual API authentication
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('user', JSON.stringify(user))

  return res.data
}

export const login = async (data) => {
  const res = await api.post('/auth/login', data)
  const { accessToken, user } = res.data.data

  // 📝 Store accessToken temporarily in memory/localStorage for immediate UI response
  // The httpOnly cookie is now the primary auth mechanism for API calls
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('user', JSON.stringify(user))

  return res.data
}

export const logout = async () => {
  try {
    // Call logout endpoint to clear cookies on backend
    await api.post('/auth/logout')
  } catch {}
  // Clear localStorage
  localStorage.clear()
  // Redirect to login
  window.location.href = '/login'
}

export const getToken = () => {
  // Returns token from localStorage for UI purposes
  // Real API calls use the httpOnly cookie instead
  return localStorage.getItem('accessToken')
}

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}
