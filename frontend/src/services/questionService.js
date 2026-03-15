import api from './api'

/**
 * Fetch questions for a given module using a Network-First strategy.
 * Always fetches fresh data from the API. Falls back to cache only on failure.
 * @param {string} module - 'grammar' | 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary' | 'critical-thinking'
 * @returns {Promise<Array>} array of question objects
 */

// Each backend module uses a different endpoint and response key
const MODULE_ENDPOINTS = {
    grammar:            { path: '/grammar/questions',            key: 'questions' },
    listening:          { path: '/listening/questions',           key: 'questions' },
    speaking:           { path: '/speaking/prompts',              key: 'prompts' },
    writing:            { path: '/writing/prompts',               key: 'prompts' },
    reading:            { path: '/reading/passages',              key: 'passages' },
    'critical-thinking':{ path: '/critical-thinking/prompts',     key: 'prompts' },
}

// Clear any stale cache from previous broken endpoint calls (one-time cleanup)
const CACHE_VERSION_KEY = 'neuralingua_cache_v'
const CURRENT_CACHE_VERSION = '2'
if (localStorage.getItem(CACHE_VERSION_KEY) !== CURRENT_CACHE_VERSION) {
    // Purge all old question caches
    Object.keys(MODULE_ENDPOINTS).forEach(mod => {
        localStorage.removeItem(`neuralingua_questions_${mod}`)
    })
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION)
    console.log('[QuestionService] Cleared stale question caches')
}

export async function getModuleQuestions(module) {
    const cacheKey = `neuralingua_questions_${module}`;
    const endpoint = MODULE_ENDPOINTS[module] || { path: `/${module}/questions`, key: 'questions' };
    
    // Helper to format API data consistently
    const formatData = (items) => items.map(item => ({
        id: item.id,
        content: item.content || item.passage_text || '',
        title: item.title || item.content?.substring(0, 60) || 'Untitled',
        difficulty: item.difficulty || 1,
        options: item.options || null,
        correct_answer: item.correct_answer || null,
        explanation: item.explanation || null,
        time_limit: item.time_limit || 60,
        word_limit: item.word_limit || 150,
        audio_data: item.audio_data || item.media_url || null,
    }));

    // Network-First: Always try the API first
    try {
        console.log(`[QuestionService] Fetching ${module} from ${endpoint.path}`)
        const response = await api.get(endpoint.path);
        const data = response.data[endpoint.key];

        if (data && data.length > 0) {
            const formatted = formatData(data);
            localStorage.setItem(cacheKey, JSON.stringify(formatted));
            console.log(`[QuestionService] Got ${formatted.length} questions for ${module}`)
            return formatted;
        } else {
            console.log(`[QuestionService] API returned empty data for ${module}`)
        }
    } catch (error) {
        console.error(`[QuestionService] API failed for ${module}:`, error?.response?.status, error?.message);
    }

    // Fallback: try cache only if API failed
    try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
            const list = JSON.parse(raw);
            if (list && list.length > 0) {
                console.log(`[QuestionService] Using cached data for ${module} (${list.length} items)`)
                return list;
            }
        }
    } catch (_) {
        // Cache read failed
    }

    console.log(`[QuestionService] No questions found for ${module}`)
    return [];
}
