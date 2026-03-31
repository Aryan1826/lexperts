// src/services/expert.service.js

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
