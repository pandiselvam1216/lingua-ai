import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Send, Clock, CheckCircle, ChevronRight, XCircle, RotateCcw, AlertCircle, Info, MicOff, Volume2 } from 'lucide-react'
import api from '../../services/api'
import { evaluateSpeaking } from '../../utils/localScoring'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleRulesModal from '../../components/common/ModuleRulesModal'
import Modal from '../../components/common/Modal'

export default function Speaking() {
    const [prompts, setPrompts] = useState([])
    const [selectedPrompt, setSelectedPrompt] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [timeElapsed, setTimeElapsed] = useState(0)
    const [timeLeft, setTimeLeft] = useState(60)
    const [feedback, setFeedback] = useState(null)
    const [showPopup, setShowPopup] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [submitting, setSubmitting] = useState(false)
    const recognitionRef = useRef(null)
    const timerRef = useRef(null)
    const [alertConfig, setAlertConfig] = useState({ isOpen: false })
    const [completedTopics, setCompletedTopics] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_speaking');
        return saved ? JSON.parse(saved) : [];
    });

    const showAlert = (title, message, theme = 'info') => {
        setAlertConfig({ isOpen: true, title, message, theme, type: 'alert' })
    }

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_speaking', JSON.stringify(completedTopics));
    }, [completedTopics]);
    useEffect(() => {
        fetchPrompts()
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (recognitionRef.current) recognitionRef.current.abort()
        }
    }, [])

    const fetchPrompts = async () => {
        try {
            const questions = await getModuleQuestions('speaking')
            const mapped = questions.map(q => ({
                id: q.id,
                title: q.title || q.content?.substring(0, 60) || 'Speaking Topic',
                content: q.content,
                time_limit: q.time_limit || 60,
            }))
            setPrompts(mapped)
            if (mapped.length > 0) {
                setSelectedPrompt(mapped[0])
                setTimeLeft(mapped[0].time_limit || 60)
            }
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectPrompt = (prompt) => {
        if (isRecording) return
        setSelectedPrompt(prompt)
        setTimeLeft(prompt.time_limit || 60)
        setTranscript('')
        setFeedback(null)
    }

    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showAlert('Browser Not Supported', 'Speech recognition is not supported in this browser. Please try Google Chrome.', 'warning')
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
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        setIsRecording(false)
    }

    const handleReset = () => {
        stopRecording()
        setTranscript('')
        setFeedback(null)
        setTimeLeft(selectedPrompt?.time_limit || 60)
    }

    const speakingRules = [
        "Select a speaking prompt from the list to begin.",
        "When ready, click 'Start Recording' and speak clearly into your microphone.",
        "You have a time limit for each prompt. Try to speak for the entire duration.",
        "Once you finish (or time runs out), click 'Get Feedback'.",
        "Our AI will evaluate your fluency, vocabulary, and grammar based on your audio."
    ];

    const handleSubmit = async () => {
        if (!transcript.trim()) return

        setSubmitting(true)
        try {
            // Local Evaluation
            const totalTime = selectedPrompt.time_limit || 60
            const elapsed = Math.max(1, totalTime - timeLeft) // Prevent 0 or negative
            const result = evaluateSpeaking(transcript, elapsed)

            // Artificial delay to feel like "Analysis"
            setTimeout(() => {
                setFeedback(result)
                setSubmitting(false)
                
                // Track completion
                if (!completedTopics.includes(selectedPrompt.id)) {
                    setCompletedTopics(prev => [...prev, selectedPrompt.id])
                }
                
                // Save score
                saveModuleScore('speaking', result.score, elapsed);
            }, 1500)

        } catch (error) {
            console.error('Failed to submit:', error)
            setSubmitting(false)
        }
    }

    const handleNextTopic = () => {
        const currentIndex = prompts.findIndex(p => p.id === selectedPrompt?.id)
        if (currentIndex !== -1 && currentIndex < prompts.length - 1) {
            handleSelectPrompt(prompts[currentIndex + 1])
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const totalTime = selectedPrompt?.time_limit || 60
    const timeProgress = ((totalTime - timeLeft) / totalTime) * 100

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F9FAFB',
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #E5E7EB',
                    borderTop: '4px solid #22C55E',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    if (!prompts.length) {
        return (
            <div style={{ padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Mic size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>No speaking prompts available</h3>
                    <p style={{ color: '#6B7280', marginTop: '8px', margin: '8px 0 0 0' }}>Check back later for new topics to practice.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container" style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap',
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Mic size={24} style={{ color: 'white' }} />
                </div>
                <div>
                    <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                        Speaking Practice
                    </h1>
                    <p style={{ color: '#6B7280', margin: 0 }}>
                        Improve your pronunciation and fluency with AI feedback
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {/* Instructions Button */}
                <button
                    onClick={() => setShowRules(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        color: '#4B5563',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                >
                    <Info size={16} />
                    Instructions
                </button>
            </div>

            <div className="grid-sidebar">
                {/* Topics Sidebar */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    height: 'fit-content',
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '16px',
                    }}>
                        Topics
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {prompts.map((prompt) => (
                            <motion.button
                                key={prompt.id}
                                onClick={() => handleSelectPrompt(prompt)}
                                whileHover={{ x: 4 }}
                                style={{
                                    padding: '14px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: selectedPrompt?.id === prompt.id ? '#F0FDF4' : 'transparent',
                                    borderLeft: selectedPrompt?.id === prompt.id ? '3px solid #22C55E' : '3px solid transparent',
                                    cursor: isRecording ? 'not-allowed' : 'pointer',
                                    textAlign: 'left',
                                    opacity: isRecording ? 0.5 : 1,
                                }}
                            >
                                <p style={{
                                    fontSize: '14px',
                                    fontWeight: selectedPrompt?.id === prompt.id ? '600' : '500',
                                    color: selectedPrompt?.id === prompt.id ? '#166534' : '#374151',
                                    margin: 0,
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                }}>
                                    {prompt.title}
                                    {completedTopics.includes(prompt.id) && <CheckCircle size={14} style={{ color: '#22C55E' }} />}
                                </p>
                                <p style={{
                                    fontSize: '12px',
                                    color: '#9CA3AF',
                                    margin: 0,
                                }}>
                                    {prompt.time_limit}s limit
                                </p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}>
                    {/* Prompt Card */}
                    {selectedPrompt && (
                        <motion.div
                            key={selectedPrompt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <h2 style={{
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    margin: 0,
                                }}>
                                    {selectedPrompt.title}
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    backgroundColor: '#F0FDF4',
                                    borderRadius: '20px',
                                }}>
                                    <Clock size={14} style={{ color: '#22C55E' }} />
                                    <span style={{ fontSize: '13px', color: '#166534', fontWeight: '500' }}>
                                        {selectedPrompt.time_limit}s
                                    </span>
                                </div>
                            </div>
                            <p style={{
                                fontSize: '15px',
                                color: '#4B5563',
                                lineHeight: '1.6',
                                margin: 0,
                            }}>
                                {selectedPrompt.content}
                            </p>
                        </motion.div>
                    )}

                    {/* Recording Area */}
                    <div className="card" style={{
                        padding: 'min(40px, 6vw)',
                        textAlign: 'center',
                    }}>
                        {/* Timer + Mic — side by side */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'min(32px, 5vw)',
                            marginBottom: '20px',
                            flexWrap: 'wrap',
                        }}>
                            {/* Circular Timer */}
                            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="60" cy="60" r="54" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                                    <circle
                                        cx="60" cy="60" r="54"
                                        stroke={isRecording ? '#22C55E' : '#3B82F6'}
                                        strokeWidth="8" fill="none"
                                        strokeDasharray={`${2 * Math.PI * 54}`}
                                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeProgress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)', textAlign: 'center',
                                }}>
                                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0, fontFamily: 'monospace' }}>
                                        {formatTime(timeLeft)}
                                    </p>
                                </div>
                            </div>
 
                            {/* Divider - hide on small screens when wrapping */}
                            <div style={{ width: '1px', height: '80px', backgroundColor: '#E5E7EB', display: window.innerWidth < 480 ? 'none' : 'block' }} />
 
                            {/* Microphone Button */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <motion.button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={isRecording ? {
                                        boxShadow: ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 20px rgba(34,197,94,0)', '0 0 0 0 rgba(34,197,94,0.4)']
                                    } : {}}
                                    transition={isRecording ? { duration: 1.5, repeat: Infinity } : {}}
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '50%', border: 'none',
                                        background: isRecording
                                            ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
                                            : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {isRecording ? <MicOff size={32} style={{ color: 'white' }} /> : <Mic size={32} style={{ color: 'white' }} />}
                                </motion.button>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: '500' }}>
                                    {isRecording ? 'Tap to stop' : 'Tap to speak'}
                                </p>
                            </div>
                        </div>
 
                        <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                            {isRecording ? 'Recording... Click to stop' : 'Click the microphone to start speaking'}
                        </p>

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={handleReset}
                                disabled={isRecording}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: isRecording ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: isRecording ? 0.5 : 1,
                                }}
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!transcript.trim() || submitting}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: transcript.trim()
                                        ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                                        : '#E5E7EB',
                                    color: transcript.trim() ? 'white' : '#9CA3AF',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: transcript.trim() && !submitting ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: transcript.trim() ? '0 4px 14px rgba(34, 197, 94, 0.4)' : 'none',
                                }}
                            >
                                <Send size={16} />
                                {submitting ? 'Analyzing...' : 'Get Feedback'}
                            </button>
                            {/* Added Next Topic button */}
                            {feedback && prompts.findIndex(p => p.id === selectedPrompt.id) < prompts.length - 1 && (
                                <button
                                    onClick={handleNextTopic}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                    }}
                                >
                                    Next Topic
                                    <ChevronRight size={16} />
                                </button>
                            )}
                        </div>

                    </div>

                    {/* Transcript */}
                    {transcript && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '16px',
                            }}>
                                <Volume2 size={18} style={{ color: '#6B7280' }} />
                                <h3 style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    margin: 0,
                                }}>
                                    Your Response
                                </h3>
                            </div>
                            <p style={{
                                fontSize: '15px',
                                color: '#374151',
                                lineHeight: '1.7',
                                margin: 0,
                                padding: '16px',
                                backgroundColor: '#F9FAFB',
                                borderRadius: '10px',
                            }}>
                                {transcript}
                            </p>
                        </motion.div>
                    )}

                    {/* Feedback */}
                    <AnimatePresence>
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '20px',
                                }}>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#111827',
                                        margin: 0,
                                    }}>
                                        AI Feedback
                                    </h3>
                                    <div style={{
                                        padding: '8px 16px',
                                        backgroundColor: feedback.score >= 70 ? '#F0FDF4' : '#FEF3C7',
                                        borderRadius: '20px',
                                    }}>
                                        <span style={{
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: feedback.score >= 70 ? '#166534' : '#D97706',
                                        }}>
                                            Score: {feedback.score}/100
                                        </span>
                                    </div>
                                </div>

                                <div className="grid-2col">
                                    {Object.entries(feedback.feedback || {}).map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: '#F9FAFB',
                                                borderRadius: '10px',
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px',
                                            }}>
                                                <CheckCircle size={16} style={{ color: '#22C55E' }} />
                                                <span style={{
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {key}
                                                </span>
                                            </div>
                                            <p style={{
                                                fontSize: '14px',
                                                color: '#6B7280',
                                                margin: 0,
                                                lineHeight: '1.5',
                                            }}>
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Custom Modal for Alerts and Confirms */}
            <Modal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ isOpen: false })}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
                theme={alertConfig.theme}
                type={alertConfig.type}
                confirmText={alertConfig.confirmText || 'OK'}
            />

            {/* Completion Popup */}
            <AnimatePresence>
                {showPopup && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                padding: '40px',
                                width: '90%',
                                maxWidth: '480px',
                                textAlign: 'center',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                        >
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Topic Completed!</h2>
                            <p style={{ color: '#6B7280', marginBottom: '32px' }}>Here is your performance summary.</p>

                            {/* Circular Score */}
                            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 32px auto' }}>
                                <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="80" cy="80" r="72" stroke="#E5E7EB" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="80" cy="80" r="72"
                                        stroke={feedback?.score >= 70 ? "#22C55E" : (feedback?.score >= 40 ? "#EAB308" : "#EF4444")}
                                        strokeWidth="12" fill="none"
                                        strokeDasharray={`${2 * Math.PI * 72}`}
                                        strokeDashoffset={`${2 * Math.PI * 72 * (1 - (feedback?.score || 0) / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)', textAlign: 'center',
                                }}>
                                    <p style={{ fontSize: '36px', fontWeight: '800', color: '#111827', margin: 0 }}>
                                        {feedback?.score || 0}%
                                    </p>
                                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontWeight: '500' }}>Score</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {prompts.findIndex(p => p.id === selectedPrompt?.id) < prompts.length - 1 && (
                                    <button
                                        onClick={() => { setShowPopup(false); handleNextTopic(); }}
                                        style={{
                                            padding: '14px 24px', borderRadius: '12px', border: 'none',
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                            color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        Next Topic <ChevronRight size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    style={{
                                        padding: '14px 24px', borderRadius: '12px', border: 'none',
                                        background: (prompts.findIndex(p => p.id === selectedPrompt?.id) < prompts.length - 1) ? '#F3F4F6' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                        color: (prompts.findIndex(p => p.id === selectedPrompt?.id) < prompts.length - 1) ? '#374151' : 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    Next Module <ChevronRight size={18} />
                                </button>
                                <button
                                    onClick={() => { setShowPopup(false); handleReset(); }}
                                    style={{
                                        padding: '14px 24px', borderRadius: '12px', border: '2px solid #E5E7EB',
                                        backgroundColor: 'white',
                                        color: '#4B5563', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <RotateCcw size={18} /> Retest
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ModuleRulesModal 
                isOpen={showRules}
                onClose={() => setShowRules(false)}
                title="Speaking Rules"
                description="Follow these guidelines to improve your speaking skills:"
                rules={speakingRules}
            />
        </div>
    )
}
