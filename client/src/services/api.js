// // src/services/api.js

// import axios from 'axios'

// const api = axios.create({
//   baseURL: 'http://localhost:5001/api/v1',
//   headers: { 'Content-Type': 'application/json' },
//   withCredentials: true,
// })

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('accessToken')
//   if (token) config.headers.Authorization = `Bearer ${token}`
//   return config
// })

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const original = error.config
//     if (error.response?.status === 401 && !original._retry) {
//       original._retry = true
//       try {
//         const res = await axios.post(
//           'http://localhost:5001/api/v1/auth/refresh',
//           {},
//           { withCredentials: true }
//         )
//         const newToken = res.data.data.accessToken
//         localStorage.setItem('accessToken', newToken)
//         original.headers.Authorization = `Bearer ${newToken}`
//         return api(original)
//       } catch {
//         localStorage.clear()
//         window.location.href = '/login'
//       }
//     }
//     return Promise.reject(error)
//   }
// )

// export default api



// src/services/api.js

import axios from 'axios'

const API_BASE_URL = 'http://localhost:5001/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// 🔐 Attach access token to every request
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

// 🔄 Handle token refresh automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If unauthorized & not already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      try {
        // Request new access token using refresh token (cookie)
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = res.data?.data?.accessToken

        if (newAccessToken) {
          // Save new token
          localStorage.setItem('accessToken', newAccessToken)

          // Update header & retry original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed → logout
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api