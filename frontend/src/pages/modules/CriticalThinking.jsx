import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic, MicOff, Edit, Send, Clock, Play, Square, Award, AlertCircle, CheckCircle, Info } from 'lucide-react'
import api from '../../services/api'
import { getAICriticalThinkingFeedback, generateJAMTopics } from '../../services/aiService'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import syncService from '../../services/syncService'
import ModuleRulesModal from '../../components/common/ModuleRulesModal'

export default function CriticalThinking() {
    const [prompts, setPrompts] = useState([])
    const [currentPrompt, setCurrentPrompt] = useState(null)
    const [mode, setMode] = useState('written')
    const [response, setResponse] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [timeLeft, setTimeLeft] = useState(120)
    const [isTimerActive, setIsTimerActive] = useState(false)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showRules, setShowRules] = useState(false)
    const [completedTopics, setCompletedTopics] = useState(() => JSON.parse(localStorage.getItem('neuraLingua_completed_critical_thinking') || '[]'))

    useEffect(() => localStorage.setItem('neuraLingua_completed_critical_thinking', JSON.stringify(completedTopics)), [completedTopics])

    const recognitionRef = useRef(null)

    useEffect(() => {
        fetchPrompts()
        initSpeechRecognition()
    }, [])
    
    // Subscribe to live updates from other tabs (Admin)
    useEffect(() => {
        const unsubscribe = syncService.subscribe((type, payload) => {
            if (type === 'questions_updated' && payload.module === 'critical-thinking') {
                console.log('[Sync] Critical Thinking questions updated, re-fetching...')
                fetchPrompts()
            }
        })
        return unsubscribe
    }, [])

    useEffect(() => {
        let interval
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000)
        } else if (timeLeft === 0) {
            setIsTimerActive(false)
            if (isRecording) {
                recognitionRef.current?.stop()
                setIsRecording(false)
            }
        }
        return () => clearInterval(interval)
    }, [isTimerActive, timeLeft])

    const initSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = 'en-US'

            recognitionRef.current.onresult = (event) => {
                let transcript = ''
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript + ' '
                }
                setResponse(transcript)
            }
        }
    }

    async function fetchPrompts() {
        try {
            const aiTopics = await generateJAMTopics()
            if (aiTopics && aiTopics.length > 0) {
                setPrompts(aiTopics); selectPrompt(aiTopics[0]); setLoading(false); return
            }
        } catch (_) { }

        try {
            const res = await api.get('/critical-thinking/prompts')
            if (res.data.prompts?.length > 0) {
                setPrompts(res.data.prompts); selectPrompt(res.data.prompts[0]); setLoading(false); return
            }
        } catch (_) { }

        try {
            const questions = await getModuleQuestions('critical-thinking')
            const mapped = questions.map(q => ({
                id: q.id, title: q.title || q.content?.substring(0, 60) || 'JAM Topic',
                content: q.content, time_limit: q.time_limit || 120,
            }))
            setPrompts(mapped)
            if (mapped.length > 0) selectPrompt(mapped[0])
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const selectPrompt = (prompt) => {
        setCurrentPrompt(prompt)
        setTimeLeft(prompt.time_limit || 120)
        setResponse('')
        setResult(null)
        setIsTimerActive(false)
        if (isRecording) {
            recognitionRef.current?.stop()
            setIsRecording(false)
        }
    }

    const startSession = () => {
        setIsTimerActive(true)
        setResult(null)
        if (mode === 'spoken' && recognitionRef.current) {
            recognitionRef.current.start()
            setIsRecording(true)
        }
    }

    const stopSession = () => {
        setIsTimerActive(false)
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop()
            setIsRecording(false)
        }
    }

    const handleSubmit = async () => {
        if (!response.trim()) return
        stopSession()

        try {
            const timeTaken = (currentPrompt?.time_limit || 120) - timeLeft
            const aiResult = await getAICriticalThinkingFeedback(response, currentPrompt?.content || currentPrompt?.title)
            if (aiResult) {
                setResult(aiResult)
                saveModuleScore('critical_thinking', aiResult.score?.total_score || 0, timeTaken)
                if (!completedTopics.includes(currentPrompt?.id)) setCompletedTopics(prev => [...prev, currentPrompt.id])
                return
            }
            const res = await api.post('/critical-thinking/submit', { prompt_id: currentPrompt?.id, response: response.trim(), type: mode, time_taken: timeTaken })
            setResult(res.data)
            saveModuleScore('critical_thinking', res.data.score?.total_score || 0, timeTaken)
            if (!completedTopics.includes(currentPrompt?.id)) setCompletedTopics(prev => [...prev, currentPrompt.id])
        } catch (error) {
            const timeTaken = (currentPrompt?.time_limit || 120) - timeLeft
            const fallbackResult = { score: { total_score: 70, breakdown: { content: 70, structure: 70, argument: 70 }, feedback: 'Good effort! Keep practicing to improve your critical thinking skills.' } }
            setResult(fallbackResult)
            saveModuleScore('critical_thinking', fallbackResult.score.total_score, timeTaken)
            if (!completedTopics.includes(currentPrompt?.id)) setCompletedTopics(prev => [...prev, currentPrompt.id])
        }
    }

    const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

    if (loading) return null

    return (
        <div className="page-container" style={{ padding: '24px 16px' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #EC4899, #DB2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Brain size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontWeight: '800', margin: '0 0 4px' }}>Critical Thinking (JAM)</h1>
                            <p style={{ color: '#6B7280', margin: 0, fontSize: '15px' }}>Analytical thinking and communication skills</p>
                        </div>
                    </div>
                    <button onClick={() => setShowRules(true)} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
                        <Info size={16} /> Instructions
                    </button>
                </div>

                <div className="grid-sidebar">
                    {/* Sidebar */}
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Award size={18} color="#EC4899" /> Available Topics
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {prompts.map(prompt => (
                                <button key={prompt.id} onClick={() => selectPrompt(prompt)} className="btn" style={{ justifyContent: 'space-between', width: '100%', background: currentPrompt?.id === prompt.id ? '#FDF2F8' : 'transparent', border: currentPrompt?.id === prompt.id ? '2px solid #EC4899' : '2px solid transparent', color: currentPrompt?.id === prompt.id ? '#BE185D' : '#4B5563' }}>
                                    <span>{prompt.title}</span>
                                    {completedTopics.includes(prompt.id) && <CheckCircle size={16} color="#22C55E" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {currentPrompt ? (
                            <>
                                {/* Controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', width: 'auto' }}>
                                        <Clock size={24} color={timeLeft < 30 ? '#EF4444' : '#EC4899'} className={timeLeft < 30 ? 'animate-pulse' : ''} />
                                        <span style={{ fontSize: '32px', fontWeight: 'bold', fontFamily: 'monospace', color: timeLeft < 30 ? '#EF4444' : '#111827' }}>
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>

                                    <div className="card" style={{ display: 'flex', padding: '4px', gap: '4px', width: 'auto' }}>
                                        <button onClick={() => setMode('written')} className="btn" style={{ background: mode === 'written' ? '#EC4899' : 'transparent', color: mode === 'written' ? 'white' : '#6B7280' }}><Edit size={16}/> Written</button>
                                        <button onClick={() => setMode('spoken')} className="btn" style={{ background: mode === 'spoken' ? '#EC4899' : 'transparent', color: mode === 'spoken' ? 'white' : '#6B7280' }}><Mic size={16}/> Spoken</button>
                                    </div>
                                </div>

                                {/* Prompt & Input area */}
                                <div className="card" style={{ padding: '24px 20px' }}>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>{currentPrompt.title}</h2>
                                    <p style={{ fontSize: '18px', color: '#4B5563', marginBottom: '24px' }}>{currentPrompt.content}</p>

                                    {mode === 'written' ? (
                                        <textarea
                                            value={response} onChange={(e) => setResponse(e.target.value)} disabled={!!result}
                                            placeholder="Type your response here... Start the timer to begin!"
                                            style={{ width: '100%', minHeight: '200px', padding: '20px', borderRadius: '16px', border: '2px solid #E5E7EB', fontSize: '16px', outline: 'none', background: '#F9FAFB', resize: 'vertical', marginBottom: '24px', boxSizing: 'border-box' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', minHeight: '200px', padding: '24px', borderRadius: '16px', border: `2px solid ${isRecording ? '#EC4899' : '#E5E7EB'}`, background: isRecording ? '#FDF2F8' : '#F9FAFB', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            {isRecording ? (
                                                <>
                                                    <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '16px' }}>
                                                        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EC4899' }} />
                                                        <Mic size={32} style={{ position: 'relative', top: '14px', left: '14px', color: '#BE185D', zIndex: 1 }} />
                                                    </div>
                                                    <p style={{ color: '#BE185D', fontWeight: 'bold' }}>Listening...</p>
                                                    <p style={{ color: '#9CA3AF', fontSize: '14px' }}>{response}</p>
                                                </>
                                            ) : (
                                                <><MicOff size={48} color="#9CA3AF" style={{ marginBottom: '16px' }}/><p style={{ color: '#6B7280' }}>Click 'Start Session' to begin speaking</p></>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        {!isTimerActive && !result ? (
                                            <button onClick={startSession} className="btn btn-primary" style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}><Play size={20}/> Start Session</button>
                                        ) : isTimerActive ? (
                                            <button onClick={stopSession} className="btn btn-primary" style={{ flex: 1, padding: '16px', background: '#EF4444' }}><Square size={20}/> Stop</button>
                                        ) : null}
                                        {response.trim() && !result && (
                                            <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #10B981, #059669)' }}><Send size={20}/> Submit Response</button>
                                        )}
                                    </div>
                                </div>

                                {/* Results area */}
                                <AnimatePresence>
                                    {result && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                            <div style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', color: 'white', padding: '32px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '16px', opacity: 0.9 }}>Overall Score</div>
                                                <div style={{ fontSize: '56px', fontWeight: 'bold' }}>{result.score?.total_score || 0}%</div>
                                            </div>
                                            <div style={{ padding: '32px' }}>
                                                <div className="grid-3col" style={{ marginBottom: '32px' }}>
                                                    {['content', 'structure', 'argument'].map(key => (
                                                        <div key={key} style={{ textAlign: 'center' }}>
                                                            <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', marginBottom: '12px' }}>
                                                                <div style={{ width: `${result.score?.breakdown?.[key] || 0}%`, height: '100%', background: '#EC4899', borderRadius: '4px' }} />
                                                            </div>
                                                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{result.score?.breakdown?.[key] || 0}%</div>
                                                            <div style={{ color: '#6B7280', textTransform: 'capitalize' }}>{key}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {result.score?.feedback && (
                                                    <div style={{ background: '#FDF2F8', padding: '24px', borderRadius: '16px', display: 'flex', gap: '16px' }}>
                                                        <AlertCircle color="#EC4899" />
                                                        <div>
                                                            <h4 style={{ color: '#9D174D', fontWeight: 'bold', margin: '0 0 8px' }}>AI Feedback</h4>
                                                            <p style={{ margin: 0, color: '#BE185D', lineHeight: '1.6' }}>{result.score.feedback}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
                                <AlertCircle size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                                <p style={{ fontSize: '18px', color: '#6B7280' }}>Select a topic from the sidebar to begin your JAM session</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            <ModuleRulesModal
                isOpen={showRules} onClose={() => setShowRules(false)}
                title="Critical Thinking Rules"
                description="Challenge yourself to speak or write on a given topic:"
                rules={[
                    "Select a prompt topic to get started.",
                    "Choose between 'Written' mode (typing) and 'Spoken' mode (speech-to-text input).",
                    "Click 'Start Session' to begin the countdown timer.",
                    "Articulate your thoughts on the given topic within the provided time limit.",
                    "Submit to get AI feedback on your structure, content, and argumentation."
                ]}
            />
        </div>
    )
}
