// client/src/services/expert.service.js

import api from './api'

export const getAllExperts = async (params = {}) => {
  const res = await api.get('/experts', { params })
  return res.data.data
}

export const getExpertById = async (id) => {
  const res = await api.get(`/experts/${id}`)
  return res.data.data.expert
}

export const createProfile = async (data) => {
  const res = await api.post('/experts', data)
  return res.data.data
}

export const getMyProfile = async () => {
  try {
    const res = await api.get('/experts/me/profile')
    return res.data.data
  } catch (err) {
    if (err.response?.status === 404) return null
    throw err
  }
}

export const updateProfile = async (id, data) => {
  const res = await api.put(`/experts/${id}`, data)
  return res.data.data
}

/**
 * Upload the expert's Sanad credential document.
 * @param {File} file — PDF, JPG, or PNG
 */
export const uploadSanad = async (file) => {
  const formData = new FormData()
  formData.append('sanad', file)
  const res = await api.post('/experts/me/sanad', formData, {
    headers: { 'Content-Type': undefined }, // let browser set multipart boundary
  })
  return res.data
}

/**
 * Fetch available 30-minute booking slots for an expert on a given date.
 * @param {string} expertId
 * @param {string} date — YYYY-MM-DD
 * @returns {Array<{start: string, end: string}>}
 */
export const getAvailableSlots = async (expertId, date) => {
  const res = await api.get(`/experts/${expertId}/available-slots`, { params: { date } })
  return res.data.data.slots
}
