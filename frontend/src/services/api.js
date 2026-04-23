// frontend/src/services/api.js

import axios from 'axios'
import { API_BASE_URL } from '../config'

// Create axios instance with credentials enabled.
// This allows httpOnly cookies (accessToken, refreshToken) to be sent automatically.
// ⚠️  Do NOT set Content-Type globally here.
//    Axios auto-detects per request:
//      plain object → application/json
//      FormData     → multipart/form-data  (with correct boundary)
//    Hardcoding application/json breaks multer file uploads.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// 🔐 Request interceptor — attach token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 🔄 Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = res.data?.data?.accessToken

        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
