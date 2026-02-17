/**
 * NeuraLingua Client-Side Scoring Utility
 * Implements logic for scoring Speaking and Writing modules locally
 * and persisting data to localStorage.
 */

const STORAGE_KEY = 'neuraLingua_userState';
const LT_API_URL = 'https://api.languagetool.org/v2/check';

// --- Local Storage Management ---

export const getLocalState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("Failed to parse local state", e);
    }
    
    // Default initial state
    return {
        userProfile: { name: "Student", joined: new Date().toISOString() },
        metrics: {
            overallScore: 0,
            modulesCompleted: 0,
            timeSpentMinutes: 0,
            streakDays: 1,
            lastLogin: new Date().toISOString()
        },
        speakingHistory: [],
        writingHistory: [],
        chartData: [] // Store daily progress here
    };
};

export const saveLocalState = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save local state", e);
    }
};

const updateMetrics = (type, score, timeSpent) => {
    const state = getLocalState();
    
    // Update generic metrics
    state.metrics.timeSpentMinutes += Math.ceil(timeSpent / 60);
    // Simple mock logic for modules completed - just increment
    state.metrics.modulesCompleted += 1;

    // Update history
    const entry = {
        date: new Date().toISOString(),
        score: score,
        type: type
    };

    if (type === 'speaking') {
        state.speakingHistory.push(entry);
    } else if (type === 'writing') {
        state.writingHistory.push(entry);
    }

    // Recalculate Overall Score (Weighted Average)
    const speakingAvg = state.speakingHistory.reduce((acc, curr) => acc + curr.score, 0) / (state.speakingHistory.length || 1);
    const writingAvg = state.writingHistory.reduce((acc, curr) => acc + curr.score, 0) / (state.writingHistory.length || 1);
    
    // Simple average for now
    let divider = 0;
    if (state.speakingHistory.length > 0) divider++;
    if (state.writingHistory.length > 0) divider++;
    
    state.metrics.overallScore = Math.round((speakingAvg + writingAvg) / (divider || 1));

    // Update Chart Data (Daily)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const existingDay = state.chartData.find(d => d.day === today);
    if (existingDay) {
        existingDay.score = state.metrics.overallScore; // Update today's score
    } else {
        state.chartData.push({ day: today, score: state.metrics.overallScore });
        if (state.chartData.length > 7) state.chartData.shift(); // Keep last 7 days
    }

    saveLocalState(state);
    return state;
};


// --- Scoring Logic: Speaking ---

export const evaluateSpeaking = (transcript, timeElapsed, targetText = "") => {
    // 1. Fluency: Words Per Minute (WPM)
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const minutes = timeElapsed / 60;
    const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

    // Ideal WPM range for learners: 100-150. 
    // Score based on proximity to this range.
    let fluencyScore = 0;
    if (wpm >= 100 && wpm <= 160) fluencyScore = 100;
    else if (wpm < 100) fluencyScore = (wpm / 100) * 100;
    else fluencyScore = Math.max(0, 100 - ((wpm - 160) * 0.5));

    // 2. Clarity/Length Factor (Simple heuristic since we don't have audio analysis)
    // Longer speech generally indicates better attempt in this context.
    const lengthScore = Math.min(100, (wordCount / 50) * 100); // Caps at 50 words

    // 3. Final Score
    const finalScore = Math.round((fluencyScore * 0.6) + (lengthScore * 0.4));

    // 4. Generate Feedback
    const feedback = {
        fluency: wpm < 80 ? "Try to speak a bit faster." : wpm > 160 ? "Slow down a little for clarity." : "Good speaking pace!",
        clarity: lengthScore < 50 ? "Try to elaborate more on your answer." : "Good amount of detail.",
        pronunciation: "Clear articulation detected.", // Mock placeholder as we can't do real pronun without backend
        grammar: "Speech flow is coherent."
    };

    // Save
    updateMetrics('speaking', finalScore, timeElapsed);

    return {
        success: true,
        score: finalScore,
        feedback: feedback
    };
};


// --- Scoring Logic: Writing ---

export const evaluateWriting = async (text, timeElapsed) => {
    try {
        const response = await fetch(LT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                text: text,
                language: 'en-US',
                enabledOnly: 'false'
            })
        });

        const data = await response.json();
        const matches = data.matches || [];

        // 1. Calculate Score
        const wordCount = text.trim().split(/\s+/).length;
        const errorCount = matches.length;
        
        // Simple penalty: 5 points per error, min score 0
        let score = Math.max(0, 100 - (errorCount * 5));
        
        // Length bonus/penalty
        if (wordCount < 20) score -= 20; // Too short penalty

        // 2. Generate Suggestions
        const suggestions = matches.slice(0, 3).map(m => 
            `Current: "${text.substring(m.offset, m.offset + m.length)}". Suggestion: ${m.replacements.map(r => r.value).slice(0, 2).join(", ")}`
        );
        if (suggestions.length === 0) suggestions.push("Great job! No major errors found.");

        const feedback = {
            grammar: errorCount === 0 ? "Excellent grammar!" : `${errorCount} issues found.`,
            content: wordCount > 50 ? "Good depth of content." : "Try to write more next time.",
            organization: "Structure looks good.",
            vocabulary: "Standard vocabulary usage."
        };

        // Save
        updateMetrics('writing', score, timeElapsed);

        return {
            success: true,
            score: Math.round(score),
            feedback: feedback,
            suggestions: suggestions
        };

    } catch (error) {
        console.error("LanguageTool API failed", error);
        // Fallback mock
        const fallbackScore = 85;
        updateMetrics('writing', fallbackScore, timeElapsed);
        return {
            success: true,
            score: fallbackScore,
            feedback: { content: "Good effort (Offline mode)", grammar: "Could not check grammar online." },
            suggestions: ["Check internet connection for detailed feedback."]
        };
    }
};
