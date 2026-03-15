import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 // 15s timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => Promise.reject(error)
)

// Response interceptor for error handling and retry logic
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config

        // Handle network timeout / transient errors with a single retry
        if (!originalRequest._retry && (!error.response || error.code === 'ECONNABORTED')) {
            originalRequest._retry = true
            console.warn('[API] Network error/timeout, retrying request...')
            return api(originalRequest)
        }

        // NOTE: We don't auto-redirect on 401 here to prevent infinite login loops 
        // if a non-critical endpoint fails. The AuthContext handles token expiration.
        if (error.response?.status === 401) {
            console.warn('[API] 401 Unauthorized:', originalRequest.url);
        }

        return Promise.reject(error)
    }
)

export default api
