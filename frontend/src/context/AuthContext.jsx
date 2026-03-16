import { createContext, useContext, useState, useEffect } from 'react'
import { getLocalState, saveLocalState } from '../utils/localScoring'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sessionStartTime, setSessionStartTime] = useState(null)

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('token')
            if (!token) {
                setLoading(false)
                return
            }

            try {
                // Verify token with backend
                const response = await api.get('/auth/me')
                const userData = response.data.user
                
                setUser({
                    email: userData.email,
                    role: userData.role,
                    full_name: userData.full_name
                })
                setSessionStartTime(new Date())
            } catch (err) {
                console.error('[Auth] Token validation failed:', err)
                // If it's a 401, clear the stale token
                if (err.response?.status === 401) {
                    logout()
                }
            } finally {
                setLoading(false)
            }
        }

        validateToken()
    }, [])

    useEffect(() => {
        const saveTime = () => {
            if (user && sessionStartTime) {
                const diffMins = Math.floor((new Date() - sessionStartTime) / 60000)
                if (diffMins > 0) {
                    const state = getLocalState()
                    state.metrics.timeSpentMinutes = (state.metrics.timeSpentMinutes || 0) + diffMins
                    saveLocalState(state)
                }
            }
        }

        window.addEventListener('beforeunload', saveTime)
        return () => {
            saveTime()
            window.removeEventListener('beforeunload', saveTime)
        }
    }, [user, sessionStartTime])

    const login = async (email, password) => {
        try {
            console.log('[Auth] Attempting login with:', email)
            // Login with Flask backend
            const response = await api.post('/auth/login', { email, password })
            console.log('[Auth] Login response:', response.data)
            
            const { access_token, user: userData } = response.data
            
            if (!access_token) {
                console.error('[Auth] No access_token in response:', response.data)
                throw new Error('No access token received from server')
            }
            
            // Store JWT token
            localStorage.setItem('token', access_token)
            localStorage.setItem('userEmail', userData.email)
            localStorage.setItem('userRole', userData.role?.name || 'student')
            localStorage.setItem('userName', userData.full_name || userData.email)
            
            console.log('[Auth] Token stored:', {
                hasToken: !!localStorage.getItem('token'),
                email: userData.email,
                role: userData.role?.name
            })
            
            const user = {
                email: userData.email,
                role: userData.role,
                full_name: userData.full_name
            }
            
            setUser(user)
            setSessionStartTime(new Date())
            console.log('[Auth] Login successful for:', email)
            return user
        } catch (error) {
            console.error('[Auth] Login error:', error.response?.data || error.message)
            throw error
        }
    }

    const register = async (email, password, fullName, role = 'student') => {
        try {
            // Register with Flask backend
            const response = await api.post('/auth/register', {
                email,
                password,
                full_name: fullName,
                role
            })
            const { access_token, user: userData } = response.data
            
            // Store JWT token
            localStorage.setItem('token', access_token)
            localStorage.setItem('userEmail', userData.email)
            localStorage.setItem('userRole', userData.role?.name || 'student')
            localStorage.setItem('userName', userData.full_name || userData.email)
            
            const user = {
                email: userData.email,
                role: userData.role,
                full_name: userData.full_name
            }
            
            setUser(user)
            setSessionStartTime(new Date())
            return user
        } catch (error) {
            throw error
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userName')
        setUser(null)
        setSessionStartTime(null)
    }

    const value = {
        user,
        loading,
        sessionStartTime,
        login,
        register,
        logout,
        token: localStorage.getItem('token'),
        isAuthenticated: !!user,
        isAdmin: user?.role?.name === 'admin' || user?.email === 'admin@neuralingua.com',
        isTeacher: user?.role?.name === 'teacher',
        isStudent: !!(user && user?.role?.name !== 'admin' && user?.email !== 'admin@neuralingua.com')
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
