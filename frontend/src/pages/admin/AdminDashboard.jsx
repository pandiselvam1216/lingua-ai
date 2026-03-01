import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Users, UserCheck, BookOpen, Trophy, TrendingUp, Activity,
    Award, Clock, ChevronRight, BarChart2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/admin/analytics')
            setAnalytics(response.data)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
            // Mock data for demo
            setAnalytics({
                users: { total: 156, students: 145, teachers: 8, admins: 3, active_this_week: 89 },
                attempts: { total: 2450, recent_month: 340, average_score: 75.5 },
                modules: []
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F9FAFB',
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #E5E7EB',
                    borderTop: '4px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    const stats = [
        { label: 'Total Students', value: analytics?.users?.students || 0, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
        { label: 'Active This Week', value: analytics?.users?.active_this_week || 0, icon: UserCheck, color: '#22C55E', bg: '#F0FDF4' },
        { label: 'Total Attempts', value: analytics?.attempts?.total || 0, icon: BookOpen, color: '#8B5CF6', bg: '#F5F3FF' },
        { label: 'Avg Score', value: `${analytics?.attempts?.average_score || 0}%`, icon: Trophy, color: '#F59E0B', bg: '#FFFBEB' },
    ]

    const quickLinks = [
        { label: 'Manage Students', path: '/admin/students', icon: Users, color: '#3B82F6' },
        { label: 'View Reports', path: '/admin/reports', icon: BarChart2, color: '#22C55E' },
        { label: 'Question Bank', path: '/admin/questions', icon: BookOpen, color: '#8B5CF6' },
    ]

    return (
        <div className="page-container" style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '8px' }}>
                    Admin Dashboard
                </h1>
                <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
                    Welcome back! Here's an overview of your platform.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid-4col" style={{ marginBottom: '32px' }}>
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '16px',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: stat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <stat.icon size={24} style={{ color: stat.color }} />
                            </div>
                            <TrendingUp size={20} style={{ color: '#22C55E' }} />
                        </div>
                        <p style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            color: '#111827',
                            margin: 0,
                            marginBottom: '4px',
                        }}>
                            {stat.value}
                        </p>
                        <p style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            margin: 0,
                        }}>
                            {stat.label}
                        </p>
                    </motion.div>
                ))}
            </div>

            <div className="grid-chart">
                {/* Activity Chart Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '24px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={20} style={{ color: '#3B82F6' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                Platform Activity
                            </h3>
                        </div>
                        <select style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '14px',
                            color: '#374151',
                            backgroundColor: 'white',
                        }}>
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>Last 90 days</option>
                        </select>
                    </div>

                    {/* Simple Bar Chart */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '16px',
                        height: '200px',
                        paddingBottom: '40px',
                    }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                            const height = 40 + Math.random() * 120
                            return (
                                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}px` }}
                                        transition={{ delay: 0.5 + idx * 0.1 }}
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(180deg, #3B82F6 0%, #60A5FA 100%)',
                                            borderRadius: '6px 6px 0 0',
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '12px',
                                        color: '#6B7280',
                                        marginTop: '8px',
                                    }}>
                                        {day}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        paddingTop: '16px',
                        borderTop: '1px solid #F3F4F6',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#3B82F6', borderRadius: '3px' }} />
                            <span style={{ fontSize: '13px', color: '#6B7280' }}>Practice Sessions</span>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions & Recent Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0, marginBottom: '16px' }}>
                            Quick Actions
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 16px',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <link.icon size={18} style={{ color: link.color }} />
                                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                            {link.label}
                                        </span>
                                    </div>
                                    <ChevronRight size={18} style={{ color: '#9CA3AF' }} />
                                </Link>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Performance */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '20px',
                        }}>
                            <Award size={20} style={{ color: '#F59E0B' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                This Month
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>New Students</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                    +{Math.floor(Math.random() * 20) + 5}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>Practice Sessions</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                    {analytics?.attempts?.recent_month || 340}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>Completion Rate</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#22C55E' }}>
                                    87%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
