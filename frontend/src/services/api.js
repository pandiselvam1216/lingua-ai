import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor to add auth token
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
            console.log('[API] Request with token:', config.method.toUpperCase(), config.url)
        } else {
            console.log('[API] Request WITHOUT token:', config.method.toUpperCase(), config.url)
        }
        return config
    },
    error => Promise.reject(error)
)

// Response interceptor for error handling
// NOTE: Do NOT redirect to /login on 401 — auth is handled by Supabase.
// A 401 from the Flask backend (e.g. missing JWT) should not log the user out.
api.interceptors.response.use(
    response => response,
    error => {
        return Promise.reject(error)
    }
)

export default api
