// src/services/booking.service.js

import api from './api'

export const createBooking = async (data, files = [], caseDescription = '') => {
  const formData = new FormData()
  formData.append('expertId', data.expertId)
  formData.append('date', data.date)
  formData.append('slot[start]', data.slot.start)
  formData.append('slot[end]', data.slot.end)
  if (caseDescription.trim()) formData.append('caseDescription', caseDescription.trim())
  files.forEach((file) => formData.append('documents', file))

  // Axios auto-sets multipart/form-data with correct boundary when passed a FormData object
  const res = await api.post('/bookings', formData)
  return res.data.data.booking
}

export const getMyBookings = async (params = {}) => {
  const res = await api.get('/bookings/my-bookings', { params })
  return res.data.data
}

export const getExpertBookings = async (params = {}) => {
  const res = await api.get('/bookings/expert-bookings', { params })
  return res.data.data
}

export const cancelBooking = async (bookingId, reason = '') => {
  const res = await api.patch(`/bookings/${bookingId}/cancel`, {
    reason: reason || '',
  })
  return res.data.data
}

export const confirmBooking = async (bookingId) => {
  const res = await api.patch(`/bookings/${bookingId}/confirm`)
  return res.data.data
}
