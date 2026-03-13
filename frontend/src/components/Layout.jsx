import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './common/Sidebar'
import Navbar from './common/Navbar'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)
            if (!mobile) {
                setSidebarOpen(true)
            } else {
                setSidebarOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
            {/* Mobile backdrop */}
            {isMobile && sidebarOpen && (
                <div
                    className="sidebar-backdrop active"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                isMobile={isMobile}
            />

            <div
                className="main-content-area"
                style={{
                    marginLeft: isMobile ? 0 : (sidebarOpen ? '260px' : '72px'),
                    transition: 'margin-left 0.3s ease',
                }}
            >
                <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
