import { useState } from 'react'
import logoImg from '../../assets/logo.png'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuth()


    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-container"
            >
                {/* Logo */}
                <Link to="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    textDecoration: 'none',
                    marginBottom: '32px',
                }}>
                    <img
                        src={logoImg}
                        alt="NeuraLingua Logo"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            objectFit: 'contain',
                        }}
                    />
                    <span style={{ fontWeight: '600', fontSize: '24px', color: '#111827' }}>NeuraLingua</span>
                </Link>

                {/* Card */}
                <div className="card" style={{ padding: '40px' }}>
                    <h1 style={{ fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: '8px' }}>
                        Welcome back
                    </h1>
                    <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '32px' }}>
                        Sign in to continue learning
                    </p>

                    {error && (
                        <div style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            marginBottom: '24px',
                            color: '#DC2626',
                            fontSize: '14px',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Email address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 14px 14px 44px',
                                        borderRadius: '10px',
                                        border: '1px solid #D1D5DB',
                                        fontSize: '16px',
                                        color: '#111827',
                                        backgroundColor: '#FFFFFF',
                                        transition: 'border-color 0.2s',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '14px 44px 14px 44px',
                                        borderRadius: '10px',
                                        border: '1px solid #D1D5DB',
                                        fontSize: '16px',
                                        color: '#111827',
                                        backgroundColor: '#FFFFFF',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#9CA3AF',
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#1A73E8',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                            }}
                        >
                            {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
                        </button>
                    </form>

                    {/* Register Link */}
                    <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: '#6B7280' }}>
                        Don't have an account?{' '}
                        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=neuraglobalindia@gmail.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8', textDecoration: 'none', fontWeight: '500' }}>
                            Contact admin
                        </a>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
