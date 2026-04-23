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

  // Pass Content-Type: undefined so Axios lets the browser set multipart/form-data
  // with the correct boundary string — required for multer to parse the files on the server.
  const res = await api.post('/bookings', formData, {
    headers: { 'Content-Type': undefined },
  })
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

export const cancelBooking = async (bookingId, reason = '', referralMessage = '') => {
  const res = await api.patch(`/bookings/${bookingId}/cancel`, {
    reason: reason || '',
    referralMessage: referralMessage || '',
  })
  return res.data.data
}

export const confirmBooking = async (bookingId, expertNotes = '') => {
  const res = await api.patch(`/bookings/${bookingId}/confirm`, { expertNotes })
  return res.data.data
}

export const addExpertNote = async (bookingId, expertNotes) => {
  const res = await api.patch(`/bookings/${bookingId}/expert-note`, { expertNotes })
  return res.data.data
}
