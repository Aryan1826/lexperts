// client/src/services/admin.service.js

import api from './api'

export const getAdminStats = async () => {
  const res = await api.get('/admin/stats')
  return res.data.data
}

export const getAdminUsers = async (params = {}) => {
  const res = await api.get('/admin/users', { params })
  return res.data.data
}

export const deactivateUser = async (userId) => {
  const res = await api.patch(`/admin/users/${userId}/deactivate`)
  return res.data.data
}

export const activateUser = async (userId) => {
  const res = await api.patch(`/admin/users/${userId}/activate`)
  return res.data.data
}

export const getAdminExperts = async (params = {}) => {
  const res = await api.get('/admin/experts', { params })
  return res.data.data
}

export const approveExpert = async (expertId) => {
  const res = await api.patch(`/admin/experts/${expertId}/approve`)
  return res.data.data
}

export const rejectExpert = async (expertId, reason = '') => {
  const res = await api.patch(`/admin/experts/${expertId}/reject`, { reason })
  return res.data.data
}

export const getAdminBookings = async (params = {}) => {
  const res = await api.get('/admin/bookings', { params })
  return res.data.data
}
