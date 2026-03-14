import api from './api'

/**
 * Fetch questions for a given module using a Network-First strategy.
 * Returns fresh data from the API, falling back to cache if the API fails.
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
    }));

    // Function to fetch fresh data from Local Flask API and update cache
    const fetchFromAPI = async () => {
        try {
            // Using the correct endpoint for each module
            const response = await api.get(endpoint.path);
            const data = response.data[endpoint.key];

            if (data && data.length > 0) {
                const formatted = formatData(data);
                localStorage.setItem(cacheKey, JSON.stringify(formatted));
                return formatted;
            }
        } catch (error) {
            console.error(`Failed to fetch ${module} questions from local API:`, error);
        }
        return null;
    };

    // 1. Try API First (Network-first strategy to always show latest published questions)
    const freshData = await fetchFromAPI();
    if (freshData && freshData.length > 0) {
        return freshData;
    }

    // 2. Fallback to cache if API fails
    try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
            const list = JSON.parse(raw);
            if (list && list.length > 0) {
                return formatData(list);
            }
        }
    } catch (_) {
        // Cache read failed
    }

    return [];
}
