// src/services/booking.service.js

import api from './api'

export const createBooking = async (data) => {
  const res = await api.post('/bookings', data)
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
