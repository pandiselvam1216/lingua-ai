/**
 * OpenRouter AI Service
 * Powers AI feedback across all NeuraLingua modules using any LLM via OpenRouter.
 * Model: meta-llama/llama-3.1-8b-instruct:free (free tier)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free'

const chat = async (systemPrompt, userMessage) => {
    if (!API_KEY) {
        console.warn('OpenRouter API key not configured')
        return null
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'NeuraLingua',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 400,
            temperature: 0.7
        })
    })

    if (!response.ok) {
        const err = await response.text()
        console.error('OpenRouter error:', err)
        return null
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
}

// --- AI Feedback Functions ---

/**
 * Get AI feedback for a speaking session
 * @param {string} transcript - The speech transcript
 * @param {string} topic - The topic being spoken about  
 * @param {number} wpm - Words per minute
 * @returns {Promise<string>} AI feedback text
 */
export const getAISpeakingFeedback = async (transcript, topic, wpm) => {
    const system = `You are an expert English speaking coach for language learners. 
Give concise, encouraging, and specific feedback in 2-3 sentences. 
Focus on fluency, clarity, and content. Always be constructive.`

    const user = `The student spoke about "${topic}" at ${wpm} WPM.
Their transcript: "${transcript.substring(0, 500)}"
Provide brief coaching feedback.`

    return await chat(system, user)
}

/**
 * Get AI feedback for a writing submission
 * @param {string} text - The written essay/response
 * @param {string} topic - The writing topic/prompt
 * @param {number} errorCount - Number of grammar errors found
 * @returns {Promise<string>} AI feedback text
 */
export const getAIWritingFeedback = async (text, topic, errorCount) => {
    const system = `You are an expert English writing coach for language learners.
Give concise, constructive feedback in 2-3 sentences covering content quality, 
vocabulary range, and one key improvement suggestion. Be encouraging.`

    const user = `Topic: "${topic || 'General Writing'}"
Text: "${text.substring(0, 600)}"
Grammar issues found: ${errorCount}
Provide brief coaching feedback.`

    return await chat(system, user)
}

/**
 * Get AI feedback for a critical thinking / JAM session
 * @param {string} response - The student's response
 * @param {string} prompt - The discussion prompt/question
 * @returns {Promise<Object>} Score and feedback
 */
export const getAICriticalThinkingFeedback = async (response, prompt) => {
    const system = `You are an expert critical thinking evaluator for English learners.
Evaluate the response and return ONLY valid JSON in this exact format:
{
  "score": { "total_score": 75, "breakdown": { "content": 80, "structure": 70, "argument": 75 }, "feedback": "Your feedback here in 2 sentences." }
}
Scores are 0-100. Be encouraging and specific.`

    const user = `Prompt: "${prompt}"
Student Response: "${response.substring(0, 600)}"
Evaluate and return JSON only.`

    const result = await chat(system, user)
    if (!result) return null

    try {
        // Extract JSON even if there's extra text
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }
    } catch (e) {
        console.warn('Failed to parse AI response as JSON:', e)
    }
    return null
}

/**
 * Generate AI-powered JAM session topics
 * @returns {Promise<Array>} Array of topic objects
 */
export const generateJAMTopics = async () => {
    const system = `You are an English language teacher. Generate discussion topics for JAM (Just A Minute) sessions.
Return ONLY valid JSON array with exactly 5 topics in this format:
[{"id": 1, "title": "Topic Title", "content": "Describe the topic in one sentence for the student.", "time_limit": 120, "difficulty": "Medium"}]`

    const user = 'Generate 5 diverse JAM session topics for English learners (mix of easy, medium, hard).'

    const result = await chat(system, user)
    if (!result) return null

    try {
        const jsonMatch = result.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }
    } catch (e) {
        console.warn('Failed to parse AI topics:', e)
    }
    return null
}
