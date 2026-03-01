import { supabase } from '../utils/supabaseClient'

/**
 * Fetch questions for a given module.
 * Tries Supabase first; falls back to localStorage.
 * @param {string} module - 'grammar' | 'listening' | 'reading' | 'writing' | 'speaking'
 * @returns {Promise<Array>} array of question objects
 */
export async function getModuleQuestions(module) {
    // 1. Try Supabase
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('module', module)
            .order('created_at', { ascending: false })

        if (!error && data) {
            return data.map(item => ({
                id: item.id,
                content: item.content,
                title: item.title || item.content?.substring(0, 60) || 'Untitled',
                difficulty: item.difficulty || 1,
                options: item.options || null,
                correct_answer: item.correct_answer || null,
                explanation: item.explanation || null,
                time_limit: item.time_limit || 60,
                word_limit: item.word_limit || 150,
                audio_data: item.audio_data || null,
            }))
        }
    } catch (_) {
        // Supabase unavailable — fall through to localStorage
    }

    // 2. Fall back to localStorage
    try {
        const raw = localStorage.getItem(`neuralingua_questions_${module}`)
        const list = JSON.parse(raw) || []
        return list.map(item => ({
            id: item.id,
            content: item.content,
            title: item.title || item.content?.substring(0, 60) || 'Untitled',
            difficulty: item.difficulty || 1,
            options: item.options || null,
            correct_answer: item.correct_answer || null,
            explanation: item.explanation || null,
            time_limit: item.time_limit || 60,
            word_limit: item.word_limit || 150,
            audio_data: item.audio_data || null,
        }))
    } catch (_) {
        return []
    }
}
