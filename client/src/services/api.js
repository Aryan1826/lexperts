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

// Create axios instance with credentials enabled
// This allows cookies (accessToken, refreshToken) to be sent automatically
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ Essential: Sends cookies with every request
})

// 🔐 Request interceptor: Add Authorization header if we have a token in memory
// This is only for the first request (tokens from JSON response are stored temporarily)
// For subsequent requests, the httpOnly cookie is sent automatically by the browser
api.interceptors.request.use(
  (config) => {
    // If we have an accessToken in memory (from the login/register response),
    // add it to the Authorization header for this request.
    // After that, the cookie handles it automatically.
    const token = localStorage.getItem('accessToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 🔄 Response interceptor: Handle 401 and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If we get a 401 (unauthorized) and haven't retried yet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      try {
        // Request a new access token using the refresh token (sent as cookie)
        // The backend will set a new accessToken cookie
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {}, // Empty body
          { withCredentials: true } // Send refresh token cookie
        )

        const newAccessToken = res.data?.data?.accessToken

        if (newAccessToken) {
          // Store temporarily in memory/localStorage for immediate use
          localStorage.setItem('accessToken', newAccessToken)

          // Update the original request's Authorization header
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          // Retry the original request with new token
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed (refresh token expired or invalid)
        // User needs to log in again
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
