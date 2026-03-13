import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
    // Always use light theme for the new design
    const [theme, setTheme] = useState('light')

    useEffect(() => {
        // Clear any stored dark preference and force light
        localStorage.setItem('theme', 'light')
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
    }, [])

    const toggleTheme = () => {
        // Theme toggle disabled - always light mode
        setTheme('light')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: false }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
