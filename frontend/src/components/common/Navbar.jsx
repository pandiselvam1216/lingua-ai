import { useState, useEffect } from 'react'
import { Menu, Bell, Search, Wifi, WifiOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onMenuClick }) {
    const { user, isAdmin } = useAuth()
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [micStatus, setMicStatus] = useState('unknown')
    const [audioStatus, setAudioStatus] = useState(false)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        const checkMicPermission = async () => {
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const permission = await navigator.permissions.query({ name: 'microphone' })
                    setMicStatus(permission.state)
                    permission.addEventListener('change', () => {
                        setMicStatus(permission.state)
                    })
                }
            } catch (error) {
                console.warn('Mic permission check failed', error)
            }
        }
        checkMicPermission()

        const checkAudio = () => {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            if (AudioContext) {
                const ctx = new AudioContext()
                if (ctx.state === 'running') setAudioStatus(true)
                else if (ctx.state === 'suspended') setAudioStatus(false)
                ctx.close()
            }
        }
        checkAudio()

        const handleInteraction = () => {
            setAudioStatus(true)
            window.removeEventListener('click', handleInteraction)
            window.removeEventListener('keydown', handleInteraction)
        }
        window.addEventListener('click', handleInteraction)
        window.addEventListener('keydown', handleInteraction)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('click', handleInteraction)
            window.removeEventListener('keydown', handleInteraction)
        }
    }, [])

    const StatusIndicator = ({ icon: Icon, color, tooltip, offIcon: OffIcon, isOff }) => (
        <div
            title={tooltip}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: isOff ? '#FEE2E2' : '#EFF6FF',
                color: isOff ? '#EF4444' : '#1A73E8',
                ...((!isOff && color) ? { color: color, backgroundColor: `${color}20` } : {})
            }}
        >
            {isOff ? <OffIcon size={16} /> : <Icon size={16} />}
        </div>
    )

    return (
        <header style={{
            height: '72px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            gap: '12px',
        }}>
            {/* Hamburger - always visible, CSS shows it on mobile */}
            <button
                className="navbar-menu-btn"
                onClick={onMenuClick}
                style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: '#6B7280',
                    display: 'none',
                    alignItems: 'center',
                    flexShrink: 0,
                }}
            >
                <Menu size={20} />
            </button>

            {/* Search - hidden on mobile via CSS */}
            <div className="navbar-search" style={{ flex: 1, maxWidth: '400px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9CA3AF',
                    }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 44px',
                            borderRadius: '10px',
                            border: '1px solid #E5E7EB',
                            backgroundColor: '#F9FAFB',
                            fontSize: '14px',
                            color: '#111827',
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>

                {/* Status Indicators - hidden on mobile via CSS */}
                <div
                    className="navbar-status-indicators"
                    style={{ display: 'flex', gap: '8px', borderRight: '1px solid #E5E7EB', paddingRight: '12px' }}
                >
                    <StatusIndicator
                        icon={Wifi} offIcon={WifiOff}
                        isOff={!isOnline} color={isOnline ? '#10B981' : undefined}
                        tooltip={isOnline ? "Network: Online" : "Network: Offline"}
                    />
                    <StatusIndicator
                        icon={Volume2} offIcon={VolumeX}
                        isOff={!audioStatus} color={audioStatus ? '#10B981' : undefined}
                        tooltip={audioStatus ? "Audio: Ready" : "Audio: Click to Enable"}
                    />
                    <StatusIndicator
                        icon={Mic} offIcon={MicOff}
                        isOff={micStatus !== 'granted'} color={micStatus === 'granted' ? '#10B981' : undefined}
                        tooltip={`Microphone: ${micStatus === 'granted' ? 'Access Granted' : 'Check Permissions'}`}
                    />
                </div>

                {/* Bell */}
                <button className="navbar-bell" style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: '#6B7280',
                    position: 'relative',
                    display: 'flex',
                }}>
                    <Bell size={20} />
                    <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#EF4444',
                        borderRadius: '50%',
                    }} />
                </button>

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Name/role - hidden on mobile */}
                    <div className="navbar-user-text" style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', whiteSpace: 'nowrap' }}>
                            {user?.full_name || 'User'}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>
                            {isAdmin ? 'Admin' : (user?.role?.name || 'Student')}
                        </p>
                    </div>
                    {/* Animated Premium Avatar container container */}
                    <div style={{
                        position: 'relative',
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #4285F4, #9b72cb, #d96570, #f8b83e)',
                        backgroundSize: '300% 300%',
                        animation: 'ai-gradient-shift 8s ease infinite',
                        padding: '2px', // Border thickness
                        flexShrink: 0,
                    }}>
                        {/* Inner element (white background to hide middle of gradient) */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '10px',
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {/* Actual Initial Text */}
                            <span style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                {user?.full_name?.charAt(0) || 'U'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
