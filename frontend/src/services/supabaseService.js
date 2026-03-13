/**
 * Supabase API Service
 * Central service for all Supabase database queries.
 */
import { supabase } from '../utils/supabaseClient'

// --- Auth Helpers ---

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// --- Module Scores ---

/**
 * Fetch all scores for the current user
 * @returns {Promise<Array>} Array of score records
 */
export const fetchUserScores = async () => {
    const user = await getCurrentUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('module_scores')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

    if (error) {
        console.warn('Failed to fetch scores from Supabase:', error.message)
        return []
    }
    return data || []
}

/**
 * Get summary dashboard statistics for the current user
 * @returns {Promise<Object>} Stats object
 */
export const fetchDashboardStats = async () => {
    const scores = await fetchUserScores()

    if (!scores.length) {
        return {
            overallScore: 0,
            modulesCompleted: 0,
            speakingAvg: 0,
            writingAvg: 0,
            chartData: [],
            recentActivity: []
        }
    }

    const speakingScores = scores.filter(s => s.module_type === 'speaking')
    const writingScores = scores.filter(s => s.module_type === 'writing')

    const avg = (arr) => arr.length
        ? Math.round(arr.reduce((a, b) => a + b.score, 0) / arr.length)
        : 0

    const speakingAvg = avg(speakingScores)
    const writingAvg = avg(writingScores)
    const overallScore = avg(scores)

    // Build chart data per day (last 7 days)
    const dayMap = {}
    scores.forEach(s => {
        const day = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short' })
        if (!dayMap[day]) dayMap[day] = []
        dayMap[day].push(s.score)
    })

    const chartData = Object.entries(dayMap)
        .slice(-7)
        .map(([day, dayScores]) => ({
            day,
            score: Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
        }))

    return {
        overallScore,
        modulesCompleted: scores.length,
        speakingAvg,
        writingAvg,
        chartData,
        recentActivity: scores.slice(0, 10)
    }
}

/**
 * Insert a new module score record
 * @param {string} moduleType - 'speaking' | 'writing'
 * @param {number} score - Score value 0-100
 * @param {Object} metadata - Additional metadata
 */
export const insertScore = async (moduleType, score, metadata = {}) => {
    const user = await getCurrentUser()
    const { error } = await supabase
        .from('module_scores')
        .insert([{
            user_email: user?.email || 'anonymous',
            module_type: moduleType,
            score,
            metadata,
            created_at: new Date().toISOString()
        }])

    if (error) {
        console.warn('Score insert failed:', error.message)
        return false
    }
    return true
}
