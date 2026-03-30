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