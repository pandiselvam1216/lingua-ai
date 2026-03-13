import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Headphones, Mic, BookOpen, Edit3, CheckSquare, Book, Brain,
    TrendingUp, Award, Target, Clock, ArrowRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useState, useEffect } from 'react'
import { fetchDashboardStats } from '../services/supabaseService'
import { getLocalState, checkAndIncrementStreak } from '../utils/localScoring'

const modules = [
    { path: '/listening', icon: Headphones, title: 'Listening', desc: 'Audio comprehension', color: '#3B82F6', bg: '#EFF6FF' },
    { path: '/speaking', icon: Mic, title: 'Speaking', desc: 'Pronunciation & fluency', color: '#10B981', bg: '#ECFDF5' },
    { path: '/reading', icon: BookOpen, title: 'Reading', desc: 'Text comprehension', color: '#8B5CF6', bg: '#F5F3FF' },
    { path: '/writing', icon: Edit3, title: 'Writing', desc: 'Essay & grammar', color: '#F59E0B', bg: '#FFFBEB' },
    { path: '/grammar', icon: CheckSquare, title: 'Grammar', desc: 'Rules & exercises', color: '#EF4444', bg: '#FEF2F2' },
    { path: '/vocabulary', icon: Book, title: 'Vocabulary', desc: 'Word building', color: '#6366F1', bg: '#EEF2FF' },
    { path: '/critical-thinking', icon: Brain, title: 'Critical Thinking', desc: 'JAM sessions', color: '#EC4899', bg: '#FDF2F8' },
]

export default function Dashboard() {
    const { user, sessionStartTime } = useAuth()
    const [stats, setStats] = useState(null)
    const [chartData, setChartData] = useState([])
    const [loadingStats, setLoadingStats] = useState(true)
    const [currentSessionMinutes, setCurrentSessionMinutes] = useState(0)

    useEffect(() => {
        if (!sessionStartTime) return

        const updateElapsed = () => {
            const now = new Date()
            const diffMs = now - sessionStartTime
            const diffMins = Math.floor(diffMs / 60000)
            setCurrentSessionMinutes(diffMins)
        }

        updateElapsed()
        const interval = setInterval(updateElapsed, 1000)
        return () => clearInterval(interval)
    }, [sessionStartTime])

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            // Check streak first and update local state
            const updatedMetrics = checkAndIncrementStreak();

            // Try Supabase first, fall back to local
            const supabaseStats = await fetchDashboardStats()
            if (supabaseStats.modulesCompleted > 0) {
                setStats({ ...supabaseStats, streakDays: supabaseStats.streakDays || updatedMetrics.streakDays })
                setChartData(supabaseStats.chartData)
            } else {
                // Fall back to localStorage
                const localState = getLocalState()
                setStats(localState.metrics)
                setChartData(localState.chartData || [])
            }
        } catch (e) {
            const localState = getLocalState()
            setStats(localState.metrics)
            setChartData(localState.chartData || [])
        } finally {
            setLoadingStats(false)
        }
    }

    const statCards = [
        {
            icon: TrendingUp, label: 'Overall Score', color: '#3B82F6', bg: '#EFF6FF',
            value: stats ? `${stats.overallScore || 0}%` : '—'
        },
        {
            icon: Award, label: 'Lessons Completed', color: '#10B981', bg: '#ECFDF5',
            value: stats ? `${stats.modulesCompleted || 0}` : '—'
        },
        {
            icon: Target, label: 'Daily Streak', color: '#F59E0B', bg: '#FFFBEB',
            value: stats ? `${stats.streakDays || 0} 🔥` : '—'
        },
        {
            icon: Clock, label: 'Time Spent', color: '#8B5CF6', bg: '#F5F3FF',
            value: stats ? `${(stats.timeSpentMinutes || 0) + currentSessionMinutes}m` : '—'
        },
    ]

    return (
        <div className="page-container" style={{ padding: '24px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '32px' }}
                >
                    <h1 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                        Welcome back, {user?.full_name || 'Student'}! 👋
                    </h1>
                    <p style={{ color: '#6B7280' }}>
                        Continue your learning journey where you left off
                    </p>
                </motion.div>
 
                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid-4col"
                    style={{ marginBottom: '32px' }}
                >
                    {statCards.map((stat, i) => (
                        <div
                            key={i}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: stat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <stat.icon size={24} style={{ color: stat.color }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {loadingStats ? <span style={{ color: '#D1D5DB' }}>—</span> : stat.value}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B7280' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Chart and Quick Actions */}
                <div className="grid-chart" style={{ marginBottom: '32px' }}>
                    {/* Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid #E5E7EB',
                        }}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                            Weekly Progress
                            {!loadingStats && <span style={{ fontSize: '12px', fontWeight: '400', color: '#6B7280', marginLeft: '8px' }}>
                                (from Supabase)
                            </span>}
                        </h3>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                                    <YAxis stroke="#6B7280" fontSize={12} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#1A73E8"
                                        strokeWidth={3}
                                        dot={{ fill: '#1A73E8', r: 4 }}
                                        activeDot={{ r: 6, fill: '#1A73E8' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 14 }}>
                                Complete a module to see your progress chart!
                            </div>
                        )}
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid #E5E7EB',
                        }}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                            Quick Actions
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Link to="/speaking" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px', borderRadius: '12px', backgroundColor: '#ECFDF5',
                                textDecoration: 'none', border: '1px solid #D1FAE5',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Mic size={20} style={{ color: '#10B981' }} />
                                    <span style={{ fontWeight: '500', color: '#111827' }}>Practice Speaking</span>
                                </div>
                                <ArrowRight size={18} style={{ color: '#10B981' }} />
                            </Link>
                            <Link to="/grammar" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px', borderRadius: '12px', backgroundColor: '#FEF2F2',
                                textDecoration: 'none', border: '1px solid #FECACA',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckSquare size={20} style={{ color: '#EF4444' }} />
                                    <span style={{ fontWeight: '500', color: '#111827' }}>Grammar Quiz</span>
                                </div>
                                <ArrowRight size={18} style={{ color: '#EF4444' }} />
                            </Link>
                            <Link to="/vocabulary" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px', borderRadius: '12px', backgroundColor: '#EEF2FF',
                                textDecoration: 'none', border: '1px solid #C7D2FE',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Book size={20} style={{ color: '#6366F1' }} />
                                    <span style={{ fontWeight: '500', color: '#111827' }}>Learn Words</span>
                                </div>
                                <ArrowRight size={18} style={{ color: '#6366F1' }} />
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Learning Modules */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                        Learning Modules
                    </h3>
                    <div className="grid-7col">
                        {modules.map((mod, i) => (
                            <Link key={i} to={mod.path} style={{
                                backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px 16px',
                                border: '1px solid #E5E7EB', textAlign: 'center', textDecoration: 'none',
                                transition: 'all 0.2s ease',
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '14px',
                                    backgroundColor: mod.bg, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', margin: '0 auto 16px',
                                }}>
                                    <mod.icon size={28} style={{ color: mod.color }} />
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                    {mod.title}
                                </div>
                                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{mod.desc}</div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
