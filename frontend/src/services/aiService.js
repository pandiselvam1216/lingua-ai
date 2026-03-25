/**
 * OpenRouter AI Service
 * Powers AI feedback across all NeuraLingua modules using any LLM via OpenRouter.
 * Model: meta-llama/llama-3.1-8b-instruct:free (free tier)
 */

const OPENROUTER_API_URL = import.meta.env.VITE_OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions'
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL = import.meta.env.VITE_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'

/**
 * Basic exponential backoff and timeout logic for LLM fetch calls
 */
const fetchWithRetryAndTimeout = async (url, options, retries = 2, timeoutMs = 30000) => {
    try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeoutMs)

        const response = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(id)

        if (!response.ok) {
            // If it's a 5xx error (OpenRouter overloaded), retry with backoff
            if (response.status >= 500 && retries > 0) {
                console.warn(`[AI Service] 5xx Error, retrying... (${retries} left)`)
                await new Promise(r => setTimeout(r, 1500)) // simple 1.5s backoff
                return fetchWithRetryAndTimeout(url, options, retries - 1, timeoutMs)
            }
            const err = await response.text()
            console.error('[AI Service] OpenRouter error:', err)
            return null
        }

        return await response.json()
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[AI Service] Request timed out after', timeoutMs, 'ms')
        } else if (retries > 0) {
            console.warn(`[AI Service] Network error, retrying... (${retries} left)`)
            await new Promise(r => setTimeout(r, 1000))
            return fetchWithRetryAndTimeout(url, options, retries - 1, timeoutMs)
        }
        console.error('[AI Service] Fetch failed:', error.message)
        return null
    }
}

const chat = async (systemPrompt, userMessage) => {
    if (!API_KEY) {
        console.warn('OpenRouter API key not configured')
        return null
    }

    const payload = {
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        max_tokens: 400,
        temperature: 0.7
    }

    const data = await fetchWithRetryAndTimeout(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin || 'http://localhost:5173',
            'X-Title': 'NeuraLingua',
        },
        body: JSON.stringify(payload)
    })

    return data?.choices?.[0]?.message?.content || null
}

// --- AI Feedback Functions ---

/**
 * Get AI feedback for a speaking session
 */
export const getAISpeakingFeedback = async (transcript, topic, wpm) => {
    const system = `You are an expert English speaking coach specializing in Indian English (IndE). 
Give concise, encouraging, and specific feedback in 2-3 sentences. 
Focus on fluency, clarity, and content. Always be constructive.
Note: Respect Indian cultural terms, regional accents, and proper nouns.`

    const user = `The student spoke about "${topic}" at ${wpm} WPM.
Their transcript: "${transcript.substring(0, 500)}"
Provide brief coaching feedback.`

    return await chat(system, user)
}

/**
 * Get AI feedback for a writing submission
 */
export const getAIWritingFeedback = async (text, topic, errorCount) => {
    const system = `You are an expert English writing coach specializing in Indian English (IndE).
Give concise, constructive feedback in 2-3 sentences covering content quality, 
vocabulary range, and one key improvement suggestion. 
Respect Indian cultural context, names, and regional terms.`

    const user = `Topic: "${topic || 'General Writing'}"
Text: "${text.substring(0, 600)}"
Grammar issues found: ${errorCount}
Provide brief coaching feedback.`

    return await chat(system, user)
}

/**
 * Get AI feedback for a critical thinking / JAM session
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
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch (e) {
        console.warn('Failed to parse AI response as JSON:', e)
    }
    return null
}

/**
 * Generate AI-powered JAM session topics
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
        if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch (e) {
        console.warn('Failed to parse AI topics:', e)
    }
    return null
}

/**
 * Perform a deep analysis of writing content with knowledge of Indian English and task accuracy
 */
export const evaluateWritingAI = async (text, promptTitle = "General Writing", promptContent = "") => {
    const system = `You are a professional English editor specializing in Indian English (IndE). 
Your primary task is to evaluate the student's writing for grammar, vocabulary, and most importantly, Task Accuracy (how well they addressed the specific prompt).

The prompt was: "${promptTitle}"
Prompt Description: "${promptContent}"

Return ONLY valid JSON in this exact format:
{
  "score": 85,
  "accuracy_level": "Excellent / Good / Fair / Poor",
  "accuracy_score": 90,
  "feedback": {
    "grammar": "Brief summary of grammar quality.",
    "content": "Brief summary of content quality.",
    "vocabulary": "Brief summary of vocabulary range.",
    "accuracy": "Assessment of how accurately the student followed the prompt instructions."
  },
  "suggestions": [
     "Specific suggestion 1",
     "Specific suggestion 2"
  ]
}
Values for score and accuracy_score should be 0-100. Factor Indian cultural context into positive vocabulary score.`

    const user = `Analyze this writing text in response to the prompt: "${text.substring(0, 2000)}"`

    const result = await chat(system, user)
    if (!result) return null

    try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch (e) {
        console.error('AI Writing Analysis failed to parse JSON:', e)
    }
    return null
}
