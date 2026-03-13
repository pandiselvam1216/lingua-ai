import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    BarChart2, Download, Search, TrendingUp, TrendingDown,
    Award, User, BookOpen, ChevronDown
} from 'lucide-react'
import { supabase } from '../../utils/supabaseClient'
export default function Reports() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState('overall_average')
    const [sortOrder, setSortOrder] = useState('desc')

    useEffect(() => {
        fetchReports()
    }, [])

    const calculateModuleAverage = (scores, module) => {
        const moduleScores = scores.filter(s => s.module_type === module)
        if (moduleScores.length === 0) return 0
        const total = moduleScores.reduce((acc, curr) => acc + curr.score, 0)
        return Math.round(total / moduleScores.length)
    }

    const fetchReports = async () => {
        setLoading(true)
        try {
            // Fetch users with role 'student'
            const { data: users, error: usersError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('role', 'student')

            if (usersError) throw usersError

            // Fetch scores to get stats
            const { data: scores, error: scoresError } = await supabase
                .from('scores')
                .select('*')

            if (scoresError) throw scoresError

            const reportsData = (users || []).map(student => {
                const studentScores = (scores || []).filter(s => s.user_id === student.id)
                const total_attempts = studentScores.length
                const overall_average = total_attempts > 0 ? studentScores.reduce((acc, curr) => acc + curr.score, 0) / total_attempts : 0

                const module_scores = {
                    Listening: calculateModuleAverage(studentScores, 'listening'),
                    Speaking: calculateModuleAverage(studentScores, 'speaking'),
                    Reading: calculateModuleAverage(studentScores, 'reading'),
                    Writing: calculateModuleAverage(studentScores, 'writing'),
                    Grammar: calculateModuleAverage(studentScores, 'grammar'),
                }

                return {
                    student,
                    total_attempts,
                    overall_average,
                    module_scores
                }
            })

            // Sort by overall average
            reportsData.sort((a, b) => b.overall_average - a.overall_average)
            setReports(reportsData)
        } catch (error) {
            console.error('Failed to fetch reports:', error)
            setReports([])
        } finally {
            setLoading(false)
        }
    }

    const filteredReports = reports
        .filter(r =>
            r.student.full_name.toLowerCase().includes(search.toLowerCase()) ||
            r.student.email.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const aVal = sortBy === 'name' ? a.student.full_name : a[sortBy]
            const bVal = sortBy === 'name' ? b.student.full_name : b[sortBy]
            if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })

    const handleExportCSV = () => {
        const headers = ['Name', 'Email', 'Total Attempts', 'Overall Average', ...Object.keys(reports[0]?.module_scores || {})]
        const rows = filteredReports.map(r => [
            r.student.full_name,
            r.student.email,
            r.total_attempts,
            r.overall_average,
            ...Object.values(r.module_scores || {})
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `student_reports_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const getScoreColor = (score) => {
        if (score >= 80) return '#22C55E'
        if (score >= 60) return '#F59E0B'
        return '#EF4444'
    }

    const getScoreBg = (score) => {
        if (score >= 80) return '#F0FDF4'
        if (score >= 60) return '#FFFBEB'
        return '#FEF2F2'
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
                    borderTop: '4px solid #22C55E',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    // Calculate summary stats
    const avgScore = reports.length > 0
        ? reports.reduce((sum, r) => sum + r.overall_average, 0) / reports.length
        : 0
    const topPerformer = reports.length > 0
        ? reports.reduce((best, r) => r.overall_average > best.overall_average ? r : best)
        : null
    const totalAttempts = reports.reduce((sum, r) => sum + r.total_attempts, 0)

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
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <BarChart2 size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Student Reports
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            View and export student performance data
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExportCSV}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                    }}
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid-4col" style={{ marginBottom: '24px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <User size={20} style={{ color: '#3B82F6' }} />
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>Total Students</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {reports.length}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <BookOpen size={20} style={{ color: '#8B5CF6' }} />
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>Total Attempts</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {totalAttempts}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <TrendingUp size={20} style={{ color: '#22C55E' }} />
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>Platform Average</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {avgScore.toFixed(1)}%
                    </p>
                </motion.div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Award size={20} style={{ color: '#F59E0B' }} />
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>Top Performer</span>
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {topPerformer?.student?.full_name || 'N/A'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#22C55E', margin: 0 }}>
                        {topPerformer?.overall_average?.toFixed(1) || 0}% avg
                    </p>
                </motion.div>
            </div>

            {/* Search & Sort */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9CA3AF',
                    }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 44px',
                            borderRadius: '10px',
                            border: '2px solid #E5E7EB',
                            fontSize: '14px',
                            outline: 'none',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="overall_average">Average Score</option>
                        <option value="total_attempts">Total Attempts</option>
                        <option value="name">Name</option>
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="desc">High to Low</option>
                        <option value="asc">Low to High</option>
                    </select>
                </div>
            </div>

            {/* Reports Table - scrollable on mobile */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Rank</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Student</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Attempts</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Listening</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Speaking</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Reading</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Writing</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Grammar</th>
                            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Overall</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map((report, idx) => (
                            <motion.tr
                                key={report.student.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                style={{ borderTop: '1px solid #F3F4F6' }}
                            >
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F3F4F6' : idx === 2 ? '#FED7AA' : '#F9FAFB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        color: idx === 0 ? '#D97706' : idx === 1 ? '#6B7280' : idx === 2 ? '#EA580C' : '#9CA3AF',
                                    }}>
                                        {idx + 1}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>
                                        {report.student.full_name}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                        {report.student.email}
                                    </p>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#374151' }}>{report.total_attempts}</span>
                                </td>
                                {['Listening', 'Speaking', 'Reading', 'Writing', 'Grammar'].map((module) => {
                                    const score = report.module_scores?.[module] || 0
                                    return (
                                        <td key={module} style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                backgroundColor: getScoreBg(score),
                                                color: getScoreColor(score),
                                            }}>
                                                {score}%
                                            </span>
                                        </td>
                                    )
                                })}
                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        backgroundColor: getScoreBg(report.overall_average),
                                        color: getScoreColor(report.overall_average),
                                    }}>
                                        {report.overall_average?.toFixed(1)}%
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filteredReports.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#6B7280' }}>No students found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
