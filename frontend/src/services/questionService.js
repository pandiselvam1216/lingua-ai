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
        sub_module: item.sub_module || null,
        tts_config: item.tts_config || null,
    }));

    // Helper to safely cache data — strips large audio blobs to avoid quota errors
    const safeCache = (data) => {
        try {
            // Strip base64 audio data before caching (too large for localStorage ~5MB limit)
            const lightweight = data.map(item => ({
                ...item,
                audio_data: item.audio_data && item.audio_data.startsWith('data:')
                    ? '[base64-audio]'  // placeholder — will be re-fetched from API
                    : item.audio_data   // keep URLs (small)
            }));
            localStorage.setItem(cacheKey, JSON.stringify(lightweight));
        } catch (e) {
            // localStorage full — silently ignore, data will be fetched fresh next time
            console.warn(`[QuestionService] Cache write failed for ${module}:`, e.message);
        }
    };

    // Network-First: Always try the API first
    try {
        console.log(`[QuestionService] Fetching ${module} from ${endpoint.path}`)
        const response = await api.get(endpoint.path);
        const data = response.data[endpoint.key];

        if (data && data.length > 0) {
            const formatted = formatData(data);
            console.log(`[QuestionService] Got ${formatted.length} questions for ${module}`)
            safeCache(formatted);  // cache in background, never blocks return
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
                // Filter out placeholder audio — those need fresh API data
                return list.map(item => ({
                    ...item,
                    audio_data: item.audio_data === '[base64-audio]' ? null : item.audio_data
                }));
            }
        }
    } catch (_) {
        // Cache read failed
    }

    console.log(`[QuestionService] No questions found for ${module}`)
    return [];
}
