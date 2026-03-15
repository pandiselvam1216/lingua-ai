import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, Clock, RotateCcw, AlertCircle, Volume2, CheckCircle, ChevronRight, Award } from 'lucide-react'
import { evaluateSpeaking, saveModuleScore } from '../../utils/localScoring'
import { getModuleQuestions } from '../../services/questionService'
import ModuleLayout from '../../components/common/ModuleLayout'
import Modal from '../../components/common/Modal'

const SPEAKING_RULES = [
    "Select a speaking prompt from the list to begin.",
    "When ready, click 'Start Recording' and speak clearly into your microphone.",
    "You have a time limit for each prompt. Try to speak for the entire duration.",
    "Once you finish (or time runs out), click 'Get Feedback'.",
    "Our AI will evaluate your fluency, vocabulary, and grammar based on your audio."
]

export default function Speaking() {
    const [prompts, setPrompts] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [timeLeft, setTimeLeft] = useState(60)
    const [feedback, setFeedback] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [showRules, setShowRules] = useState(false)
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)
    const [alertConfig, setAlertConfig] = useState({ isOpen: false })
    
    const recognitionRef = useRef(null)
    const timerRef = useRef(null)

    const [completedTopics, setCompletedTopics] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_speaking')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_speaking', JSON.stringify(completedTopics))
    }, [completedTopics])

    useEffect(() => {
        fetchPrompts()
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (recognitionRef.current) recognitionRef.current.abort()
        }
    }, [])

    const fetchPrompts = async () => {
        try {
            const data = await getModuleQuestions('speaking')
            setPrompts(data)
            if (data.length > 0) setTimeLeft(data[0].time_limit || 60)
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentPrompt = prompts[currentIndex]
    const totalTime = currentPrompt?.time_limit || 60
    const timeProgress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0

    const showAlert = (title, message, theme = 'info') => {
        setAlertConfig({ isOpen: true, title, message, theme, type: 'alert' })
    }

    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showAlert('Browser Not Supported', 'Speech recognition is not supported in this browser. Please try Chrome.', 'warning')
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event) => {
            let finalTranscript = ''
            for (let i = 0; i < event.results.length; i++) {
                finalTranscript += event.results[i][0].transcript
            }
            setTranscript(finalTranscript)
        }

        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            stopRecording()
        }

        recognitionRef.current.start()
        setIsRecording(true)
        setFeedback(null)

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopRecording()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const stopRecording = () => {
        if (recognitionRef.current) recognitionRef.current.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setIsRecording(false)
    }

    const handleReset = () => {
        stopRecording()
        setTranscript('')
        setFeedback(null)
        setTimeLeft(totalTime)
    }

    const handleSubmit = async () => {
        if (!transcript.trim()) return

        setSubmitting(true)
        try {
            const elapsed = Math.max(1, totalTime - timeLeft)
            const result = evaluateSpeaking(transcript, elapsed)

            setTimeout(() => {
                setFeedback(result)
                setSubmitting(false)
                if (!completedTopics.includes(currentIndex)) {
                    setCompletedTopics(prev => [...prev, currentIndex])
                }
                saveModuleScore('speaking', result.score, elapsed)
            }, 1000)
        } catch (error) {
            console.error('Failed to submit:', error)
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <ModuleLayout
            icon={Mic}
            iconColor="#3B82F6"
            iconBgBase="#3B82F6"
            iconBgHover="#2563EB"
            title="Speaking Practice"
            description="Improve your pronunciation and fluency with AI feedback"
            score={completedTopics.length}
            totalScore={prompts.length}
            questions={prompts}
            currentIndex={currentIndex}
            completedQuestions={completedTopics}
            onSelectQuestion={(idx) => {
                if (isRecording) return
                setCurrentIndex(idx)
                handleReset()
                setTimeLeft(prompts[idx]?.time_limit || 60)
            }}
            showRules={showRules}
            onShowRules={() => setShowRules(true)}
            onCloseRules={() => setShowRules(false)}
            rulesList={SPEAKING_RULES}
        >
            <motion.div key={`prompt-${currentIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Prompt Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentPrompt?.title}</h2>
                    <div style={{ padding: '6px 12px', backgroundColor: '#EFF6FF', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: '#3B82F6' }} />
                        <span style={{ fontSize: '13px', color: '#1E40AF', fontWeight: '500' }}>{totalTime}s</span>
                    </div>
                </div>
                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6', marginBottom: '24px' }}>
                    {currentPrompt?.content}
                </p>

                {/* Recording Area */}
                <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {/* Circular Timer */}
                        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="60" cy="60" r="54" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                                <circle
                                    cx="60" cy="60" r="54"
                                    stroke={isRecording ? '#22C55E' : '#3B82F6'}
                                    strokeWidth="8" fill="none"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeProgress / 100)}`}
                                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, fontFamily: 'monospace' }}>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </p>
                            </div>
                        </div>

                        <div style={{ width: '1px', height: '80px', backgroundColor: '#E5E7EB', display: window.innerWidth < 480 ? 'none' : 'block' }} />

                        {/* Mic Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <motion.button
                                onClick={isRecording ? stopRecording : startRecording}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                animate={isRecording ? { boxShadow: ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 20px rgba(34,197,94,0)', '0 0 0 0 rgba(34,197,94,0.4)'] } : {}}
                                transition={isRecording ? { duration: 1.5, repeat: Infinity } : {}}
                                style={{
                                    width: '80px', height: '80px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    background: isRecording ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                }}
                            >
                                {isRecording ? <MicOff size={32} color="white" /> : <Mic size={32} color="white" />}
                            </motion.button>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: '500' }}>
                                {isRecording ? 'Stop' : 'Speak'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '32px' }}>
                        <button onClick={handleReset} disabled={isRecording} className="btn btn-secondary" style={{ opacity: isRecording ? 0.5 : 1 }}>
                            <RotateCcw size={16} /> Reset
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!transcript.trim() || submitting}
                            className="btn btn-primary"
                            style={{ background: transcript.trim() ? '#22C55E' : '#E5E7EB', color: transcript.trim() ? 'white' : '#9CA3AF' }}
                        >
                            <Send size={16} /> {submitting ? 'Analyzing...' : 'Get Feedback'}
                        </button>
                    </div>
                </div>

                {/* Transcript Display */}
                {transcript && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Volume2 size={18} style={{ color: '#6B7280' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Your Response</h3>
                        </div>
                        <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                            {transcript}
                        </p>
                    </motion.div>
                )}

                {/* Feedback Display */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>AI Feedback</h3>
                                <div style={{ padding: '8px 16px', backgroundColor: feedback.score >= 70 ? '#F0FDF4' : '#FEF3C7', borderRadius: '20px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '700', color: feedback.score >= 70 ? '#166534' : '#D97706' }}>
                                        Score: {feedback.score}/100
                                    </span>
                                </div>
                            </div>
                            <div className="grid-2col" style={{ marginBottom: '24px' }}>
                                {Object.entries(feedback.feedback || {}).map(([key, value]) => (
                                    <div key={key} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <CheckCircle size={16} style={{ color: '#22C55E' }} />
                                            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{key}</span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                {currentIndex < prompts.length - 1 ? (
                                    <button onClick={() => { setCurrentIndex(i => i + 1); handleReset(); }} className="btn btn-primary">
                                        Next Topic <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button onClick={() => setShowCompletionTracker(true)} className="btn btn-primary">
                                        <Award size={18} /> Finish Module
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <Modal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                theme={alertConfig.theme}
                type={alertConfig.type}
            />

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>All Topics Completed!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Great effort practicing your speaking today.</p>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => window.location.reload()} className="btn btn-secondary">Restart Module</button>
                                <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary">Back to Dashboard</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ModuleLayout>
    )
}
