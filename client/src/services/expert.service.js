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