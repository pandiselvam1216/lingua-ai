import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Users, UserCheck, BookOpen, Trophy, TrendingUp, Activity,
    Award, Clock, ChevronRight, BarChart2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabaseClient'
export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState('7')

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            // Fetch users
            const { data: users, error: usersError } = await supabase
                .from('user_profiles')
                .select('*')

            if (usersError) throw usersError

            // Fetch scores
            const { data: scores, error: scoresError } = await supabase
                .from('scores')
                .select('*')

            if (scoresError) throw scoresError

            const studentsCount = (users || []).filter(u => u.role === 'student').length
            const activeThisWeek = (users || []).filter(u => {
                const createdDate = new Date(u.created_at)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return createdDate >= oneWeekAgo // roughly tracking
            }).length

            const newStudentsThisMonth = (users || []).filter(u => {
                if (u.role !== 'student') return false;
                const createdDate = new Date(u.created_at);
                const oneMonthAgo = new Date();
                oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
                return createdDate >= oneMonthAgo;
            }).length

            const recentMonthScoresList = (scores || []).filter(s => {
                const createdDate = new Date(s.created_at)
                const oneMonthAgo = new Date();
                oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
                return createdDate >= oneMonthAgo
            })
            const recentMonthScores = recentMonthScoresList.length

            const totalScoreSum = (scores || []).reduce((acc, curr) => acc + curr.score, 0)
            const average_score = scores && scores.length > 0 ? Math.round(totalScoreSum / scores.length) : 0

            // Assuming passing score is > 0 and using it to measure completion rate of practice sessions
            const recentMonthPasses = recentMonthScoresList.filter(s => s.score > 0).length
            const completionRate = recentMonthScores > 0 ? Math.round((recentMonthPasses / recentMonthScores) * 100) : 0

            // Helper to generate chart data for N days
            const generateChartData = (days) => {
                const data = [];
                const scoresList = scores || [];
                const maxDate = new Date();
                maxDate.setHours(23, 59, 59, 999);

                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date(maxDate);
                    date.setDate(date.getDate() - i);

                    const startOfDay = new Date(date);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(date);
                    endOfDay.setHours(23, 59, 59, 999);

                    const dayScores = scoresList.filter(s => {
                        const sDate = new Date(s.created_at);
                        return sDate >= startOfDay && sDate <= endOfDay;
                    }).length;

                    data.push({
                        label: i === 0 && days > 7 ? 'Today' : (days === 7 ? date.toLocaleDateString('en-US', { weekday: 'short' }) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                        value: dayScores
                    });
                }
                return data;
            };

            const chartData7 = generateChartData(7);
            const chartData30 = generateChartData(30);
            const chartData90 = generateChartData(90);

            setAnalytics({
                users: {
                    total: users?.length || 0,
                    students: studentsCount,
                    new_students_this_month: newStudentsThisMonth,
                    teachers: 0,
                    admins: (users || []).filter(u => u.role === 'admin').length,
                    active_this_week: activeThisWeek
                },
                attempts: {
                    total: scores?.length || 0,
                    recent_month: recentMonthScores,
                    average_score,
                    completion_rate: completionRate
                },
                modules: [],
                chart: {
                    data7: chartData7,
                    data30: chartData30,
                    data90: chartData90
                }
            })
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
            setAnalytics(null)
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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Activity size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Admin Dashboard
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            Welcome back! Here's an overview of your platform.
                        </p>
                    </div>
                </div>
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
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                color: '#374151',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                            }}>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                        </select>
                    </div>

                    {/* Bar Chart */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: timeframe === '90' ? '2px' : timeframe === '30' ? '4px' : '16px',
                        height: '200px',
                        paddingBottom: '40px',
                    }}>
                        {analytics?.chart?.[`data${timeframe}`]?.map((dataPoint, idx) => {
                            const maxVal = Math.max(...(analytics.chart[`data${timeframe}`].map(d => d.value) || [1]));
                            // Minimum height of 4px just to show there's a day, 
                            // otherwise scale up to 160px proportionally
                            const height = dataPoint.value === 0 ? 0 : Math.max(4, (dataPoint.value / (maxVal || 1)) * 160);

                            // Determine if we should show the label based on timeframe to avoid crowding
                            let showLabel = true;
                            if (timeframe === '30' && idx % 3 !== 0 && idx !== 29) showLabel = false;
                            if (timeframe === '90' && idx % 10 !== 0 && idx !== 89) showLabel = false;

                            return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                    {/* Tooltip on hover can be added here if needed */}
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}px` }}
                                        transition={{ delay: 0.1 + (idx % 10) * 0.05 }}
                                        title={`${dataPoint.label}: ${dataPoint.value} sessions`}
                                        style={{
                                            width: '100%',
                                            background: dataPoint.value > 0 ? 'linear-gradient(180deg, #3B82F6 0%, #60A5FA 100%)' : '#F3F4F6',
                                            borderRadius: timeframe === '90' ? '2px 2px 0 0' : '6px 6px 0 0',
                                            minHeight: dataPoint.value > 0 ? '4px' : '0px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {showLabel ? (
                                        <span style={{
                                            fontSize: timeframe === '90' ? '10px' : '12px',
                                            color: '#6B7280',
                                            marginTop: '8px',
                                            whiteSpace: 'nowrap',
                                            transform: timeframe === '90' ? 'rotate(-45deg)' : 'none',
                                            transformOrigin: 'top left'
                                        }}>
                                            {dataPoint.label}
                                        </span>
                                    ) : (
                                        <span style={{ height: '22px', marginTop: '8px' }}></span>
                                    )}
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
                                    +{analytics?.users?.new_students_this_month || 0}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>Practice Sessions</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                    {analytics?.attempts?.recent_month || 0}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>Completion Rate</span>
                                <span style={{ fontSize: '16px', fontWeight: '600', color: '#22C55E' }}>
                                    {analytics?.attempts?.completion_rate !== undefined ? analytics.attempts.completion_rate : 0}%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
