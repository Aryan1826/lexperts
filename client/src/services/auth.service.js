// src/services/auth.service.js

import api from './api'

export const register = async (data) => {
  const res = await api.post('/auth/register', data)
  const { accessToken, user } = res.data.data
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('user', JSON.stringify(user))
  return res.data
}

export const login = async (data) => {
  const res = await api.post('/auth/login', data)
  const { accessToken, user } = res.data.data
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('user', JSON.stringify(user))
  return res.data
}

export const logout = async () => {
  try { await api.post('/auth/logout') } catch {}
  localStorage.clear()
  window.location.href = '/login'
}

export const getToken = () => localStorage.getItem('accessToken')

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}