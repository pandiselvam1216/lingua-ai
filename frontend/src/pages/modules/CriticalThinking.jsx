import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic, MicOff, Edit, Send, Clock, Play, Square, Award, AlertCircle, Sparkles } from 'lucide-react'
import api from '../../services/api'
import { getAICriticalThinkingFeedback, generateJAMTopics } from '../../services/aiService'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'

export default function CriticalThinking() {
    const [prompts, setPrompts] = useState([])
    const [currentPrompt, setCurrentPrompt] = useState(null)
    const [mode, setMode] = useState('written') // 'written' or 'spoken'
    const [response, setResponse] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [timeLeft, setTimeLeft] = useState(120)
    const [isTimerActive, setIsTimerActive] = useState(false)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [completedTopics, setCompletedTopics] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_critical_thinking');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_critical_thinking', JSON.stringify(completedTopics));
    }, [completedTopics]);

    const recognitionRef = useRef(null)

    useEffect(() => {
        fetchPrompts()
        initSpeechRecognition()
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

    const fetchPrompts = async () => {
        try {
            // 1. Try AI-generated topics first
            const aiTopics = await generateJAMTopics()
            if (aiTopics && aiTopics.length > 0) {
                setPrompts(aiTopics)
                selectPrompt(aiTopics[0])
                setLoading(false)
                return
            }
        } catch (_) { /* ignore */ }

        try {
            // 2. Fallback to Flask backend
            const res = await api.get('/critical-thinking/prompts')
            if (res.data.prompts?.length > 0) {
                setPrompts(res.data.prompts)
                selectPrompt(res.data.prompts[0])
                setLoading(false)
                return
            }
        } catch (_) { /* ignore */ }

        try {
            // 3. Fallback to admin-created speaking questions from localStorage/Supabase
            const questions = await getModuleQuestions('speaking')
            const mapped = questions.map(q => ({
                id: q.id,
                title: q.title || q.content?.substring(0, 60) || 'JAM Topic',
                content: q.content,
                time_limit: q.time_limit || 120,
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
            // Try AI feedback first
            const aiResult = await getAICriticalThinkingFeedback(response, currentPrompt?.content || currentPrompt?.title)
            if (aiResult) {
                setResult(aiResult)
                saveModuleScore('critical_thinking', aiResult.score?.total_score || 0, timeTaken)
                return
            }
            // Fallback to Flask backend
            const res = await api.post('/critical-thinking/submit', {
                prompt_id: currentPrompt?.id,
                response: response.trim(),
                type: mode,
                time_taken: timeTaken
            })
            setResult(res.data)
            saveModuleScore('critical_thinking', res.data.score?.total_score || 0, timeTaken)
            if (!completedTopics.includes(currentPrompt?.id)) {
                setCompletedTopics(prev => [...prev, currentPrompt.id])
            }
        } catch (error) {
            console.error('Failed to submit:', error)
            const timeTaken = (currentPrompt?.time_limit || 120) - timeLeft
            // Show basic fallback result
            const fallbackResult = {
                score: {
                    total_score: 70, breakdown: { content: 70, structure: 70, argument: 70 },
                    feedback: 'Good effort! Keep practicing to improve your critical thinking skills.'
                }
            }
            setResult(fallbackResult)
            saveModuleScore('critical_thinking', fallbackResult.score.total_score, timeTaken)
            if (!completedTopics.includes(currentPrompt?.id)) {
                setCompletedTopics(prev => [...prev, currentPrompt.id])
            }
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (loading) return null

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '32px 24px',
            minHeight: 'calc(100vh - 80px)'
        }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '32px',
                    flexWrap: 'wrap',
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)',
                        flexShrink: 0,
                    }}>
                        <Brain size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Critical Thinking (JAM)
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            Just A Minute: Develop analytical thinking and communication skills
                        </p>
                    </div>
                </div>

                <div className="grid-sidebar" style={{ gap: '32px' }}>
                    {/* Sidebar - Topics */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        border: '1px solid #E5E7EB',
                        height: 'fit-content'
                    }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Award size={18} className="text-pink-500" /> Available Topics
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {prompts.map(prompt => (
                                <button
                                    key={prompt.id}
                                    onClick={() => selectPrompt(prompt)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        textAlign: 'left',
                                        border: '1px solid',
                                        borderColor: currentPrompt?.id === prompt.id ? '#EC4899' : 'transparent',
                                        backgroundColor: currentPrompt?.id === prompt.id ? '#FDF2F8' : 'transparent',
                                        color: currentPrompt?.id === prompt.id ? '#BE185D' : '#4B5563',
                                        fontSize: '14px',
                                        fontWeight: currentPrompt?.id === prompt.id ? '600' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentPrompt?.id !== prompt.id) {
                                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentPrompt?.id !== prompt.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span>{prompt.title}</span>
                                        {completedTopics.includes(prompt.id) && <CheckCircle size={14} style={{ color: '#22C55E' }} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {currentPrompt ? (
                            <>
                                {/* Timer & Mode Selection */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        backgroundColor: 'white',
                                        padding: '12px 24px',
                                        borderRadius: '16px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <Clock size={24} className={timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-pink-500'} />
                                        <span style={{
                                            fontSize: '32px',
                                            fontWeight: '700',
                                            fontFamily: 'monospace',
                                            color: timeLeft < 30 ? '#EF4444' : '#111827'
                                        }}>
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        backgroundColor: 'white',
                                        padding: '4px',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <button
                                            onClick={() => setMode('written')}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: mode === 'written' ? '#EC4899' : 'transparent',
                                                color: mode === 'written' ? 'white' : '#6B7280',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Edit size={16} /> Written
                                        </button>
                                        <button
                                            onClick={() => setMode('spoken')}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: mode === 'spoken' ? '#EC4899' : 'transparent',
                                                color: mode === 'spoken' ? 'white' : '#6B7280',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Mic size={16} /> Spoken
                                        </button>
                                    </div>
                                </div>

                                {/* Main Interaction Card */}
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '24px',
                                    padding: '32px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid #E5E7EB'
                                }}>
                                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>
                                        {currentPrompt.title}
                                    </h2>
                                    <p style={{ fontSize: '18px', color: '#4B5563', lineHeight: '1.6', marginBottom: '32px' }}>
                                        {currentPrompt.content}
                                    </p>

                                    {mode === 'written' ? (
                                        <textarea
                                            value={response}
                                            onChange={(e) => setResponse(e.target.value)}
                                            disabled={!!result}
                                            placeholder="Type your response here... Start the timer to begin!"
                                            style={{
                                                width: '100%',
                                                minHeight: '200px',
                                                padding: '24px',
                                                borderRadius: '16px',
                                                border: '2px solid #E5E7EB',
                                                fontSize: '16px',
                                                lineHeight: '1.6',
                                                resize: 'vertical',
                                                outline: 'none',
                                                backgroundColor: '#F9FAFB',
                                                transition: 'all 0.2s',
                                                marginBottom: '24px'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#EC4899'}
                                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%',
                                            minHeight: '200px',
                                            padding: '24px',
                                            borderRadius: '16px',
                                            border: '2px solid',
                                            borderColor: isRecording ? '#EC4899' : '#E5E7EB',
                                            backgroundColor: isRecording ? '#FDF2F8' : '#F9FAFB',
                                            marginBottom: '24px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            transition: 'all 0.3s'
                                        }}>
                                            {isRecording ? (
                                                <>
                                                    <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '16px' }}>
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                                            style={{
                                                                position: 'absolute',
                                                                width: '100%',
                                                                height: '100%',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#EC4899'
                                                            }}
                                                        />
                                                        <Mic size={32} style={{ position: 'relative', color: '#BE185D', zIndex: 1, top: '14px', left: '14px' }} />
                                                    </div>
                                                    <p style={{ color: '#BE185D', fontWeight: '500' }}>Listening...</p>
                                                    <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '8px' }}>{response}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <MicOff size={48} style={{ color: '#9CA3AF', marginBottom: '16px' }} />
                                                    <p style={{ color: '#6B7280' }}>Click 'Start Session' to begin speaking</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Control Bar */}
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        {!isTimerActive && !result ? (
                                            <button
                                                onClick={startSession}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '200px',
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                                    transition: 'transform 0.1s'
                                                }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Play size={20} /> Start Session
                                            </button>
                                        ) : isTimerActive ? (
                                            <button
                                                onClick={stopSession}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '200px',
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    backgroundColor: '#EF4444',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                                    transition: 'transform 0.1s'
                                                }}
                                            >
                                                <Square size={20} /> Stop
                                            </button>
                                        ) : null}
 
                                        {(response.trim() && !result) && (
                                            <button
                                                onClick={handleSubmit}
                                                style={{
                                                    flex: 1,
                                                    minWidth: '200px',
                                                    padding: '16px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                                    transition: 'transform 0.1s'
                                                }}
                                            >
                                                <Send size={20} /> Submit Response
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Results Section */}
                                <AnimatePresence>
                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            style={{
                                                marginTop: '32px',
                                                backgroundColor: 'white',
                                                borderRadius: '24px',
                                                overflow: 'hidden',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                            }}
                                        >
                                            <div style={{
                                                background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                                                padding: '32px',
                                                color: 'white',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>Overall Score</div>
                                                <div style={{ fontSize: '56px', fontWeight: '800' }}>{result.score?.total_score || 0}%</div>
                                            </div>

                                            <div style={{ padding: '32px' }}>
                                                <div className="grid-3col" style={{ marginBottom: '32px' }}>
                                                    {['content', 'structure', 'argument'].map(key => (
                                                        <div key={key} style={{ textAlign: 'center' }}>
                                                            <div style={{
                                                                width: '100%',
                                                                height: '8px',
                                                                backgroundColor: '#F3F4F6',
                                                                borderRadius: '4px',
                                                                marginBottom: '12px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${result.score?.breakdown?.[key] || 0}%`,
                                                                    height: '100%',
                                                                    backgroundColor: '#EC4899',
                                                                    borderRadius: '4px'
                                                                }} />
                                                            </div>
                                                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                                                                {result.score?.breakdown?.[key] || 0}%
                                                            </div>
                                                            <div style={{ fontSize: '14px', color: '#6B7280', textTransform: 'capitalize' }}>
                                                                {key}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {result.score?.feedback && (
                                                    <div style={{
                                                        backgroundColor: '#FDF2F8',
                                                        borderRadius: '16px',
                                                        padding: '24px',
                                                        display: 'flex',
                                                        gap: '16px'
                                                    }}>
                                                        <AlertCircle className="text-pink-500 flex-shrink-0" />
                                                        <div>
                                                            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#9D174D', marginBottom: '8px' }}>
                                                                AI Feedback
                                                            </h4>
                                                            <p style={{ color: '#BE185D', lineHeight: '1.6' }}>
                                                                {result.score.feedback}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '24px' }}>
                                <AlertCircle size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                                <p style={{ fontSize: '18px', color: '#6B7280' }}>
                                    Select a topic from the sidebar to begin your JAM session
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
