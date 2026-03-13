import api from './api'

/**
 * Fetch questions for a given module using a Cache-First strategy.
 * Returns local data immediately if available, and updates the cache from the Flask API in the background.
 * @param {string} module - 'grammar' | 'listening' | 'reading' | 'writing' | 'speaking'
 * @returns {Promise<Array>} array of question objects
 */
export async function getModuleQuestions(module) {
    const cacheKey = `neuralingua_questions_${module}`;
    
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
            // Using the local API instance configured in api.js
            const response = await api.get(`/${module}/questions`);
            const data = response.data.questions;

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

    // 1. Try Cache First
    try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
            const list = JSON.parse(raw);
            if (list && list.length > 0) {
                // Kick off background refresh without awaiting
                fetchFromAPI();
                // Return cached data immediately for instant UI render
                return formatData(list);
            }
        }
    } catch (_) {
        // Cache read failed, proceed to fetch
    }

    // 2. If no cache, await API (blocking fetch)
    const freshData = await fetchFromAPI();
    return freshData || [];
}
