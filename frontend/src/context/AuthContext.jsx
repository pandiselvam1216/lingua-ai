import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(mapUser(session.user))
            }
            setLoading(false)
        })

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(mapUser(session.user))
            } else {
                setUser(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const mapUser = (supabaseUser) => ({
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
        role: { name: supabaseUser.user_metadata?.role || 'student' },
        ...supabaseUser.user_metadata
    })

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw { response: { data: { error: error.message } } }
        return mapUser(data.user)
    }

    const register = async (email, password, fullName, role = 'student') => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, role }
            }
        })
        if (error) throw { response: { data: { error: error.message } } }
        return mapUser(data.user)
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        token: null,
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
