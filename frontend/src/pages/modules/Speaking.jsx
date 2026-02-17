import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Clock, Send, RotateCcw, CheckCircle, AlertCircle, Volume2 } from 'lucide-react'
import api from '../../services/api'
import { evaluateSpeaking } from '../../utils/localScoring'

export default function Speaking() {
    const [prompts, setPrompts] = useState([])
    const [selectedPrompt, setSelectedPrompt] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [timeLeft, setTimeLeft] = useState(60)
    const [feedback, setFeedback] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const recognitionRef = useRef(null)
    const timerRef = useRef(null)

    useEffect(() => {
        fetchPrompts()
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (recognitionRef.current) recognitionRef.current.abort()
        }
    }, [])

    const fetchPrompts = async () => {
        try {
            const response = await api.get('/speaking/prompts')
            setPrompts(response.data.prompts || [])
            if (response.data.prompts?.length > 0) {
                setSelectedPrompt(response.data.prompts[0])
                setTimeLeft(response.data.prompts[0].time_limit || 60)
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
            alert('Speech recognition is not supported in this browser.')
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

    const handleSubmit = async () => {
        if (!transcript.trim()) return

        setSubmitting(true)
        try {
            // Local Evaluation
            const totalTime = selectedPrompt.time_limit || 60
            const elapsed = totalTime - timeLeft // Rough estimate
            const result = evaluateSpeaking(transcript, elapsed)

            // Artificial delay to feel like "Analysis"
            setTimeout(() => {
                setFeedback(result)
                setSubmitting(false)
            }, 1500)

        } catch (error) {
            console.error('Failed to submit:', error)
            setSubmitting(false)
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

    return (
        <div style={{
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
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Mic size={24} style={{ color: 'white' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        Speaking Practice
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                        Improve your pronunciation and fluency with AI feedback
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
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
                                }}>
                                    {prompt.title}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Prompt Card */}
                    {selectedPrompt && (
                        <motion.div
                            key={selectedPrompt.id}
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
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
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
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '40px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                    }}>
                        {/* Circular Timer */}
                        <div style={{
                            position: 'relative',
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 24px',
                        }}>
                            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    stroke="#E5E7EB"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    stroke={isRecording ? '#22C55E' : '#3B82F6'}
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeProgress / 100)}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                            }}>
                                <p style={{
                                    fontSize: '28px',
                                    fontWeight: '700',
                                    color: '#111827',
                                    margin: 0,
                                    fontFamily: 'monospace',
                                }}>
                                    {formatTime(timeLeft)}
                                </p>
                            </div>
                        </div>

                        {/* Microphone Button */}
                        <motion.button
                            onClick={isRecording ? stopRecording : startRecording}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            animate={isRecording ? {
                                boxShadow: ['0 0 0 0 rgba(34, 197, 94, 0.4)', '0 0 0 20px rgba(34, 197, 94, 0)', '0 0 0 0 rgba(34, 197, 94, 0.4)']
                            } : {}}
                            transition={isRecording ? { duration: 1.5, repeat: Infinity } : {}}
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                border: 'none',
                                background: isRecording
                                    ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
                                    : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                            }}
                        >
                            {isRecording ? (
                                <MicOff size={32} style={{ color: 'white' }} />
                            ) : (
                                <Mic size={32} style={{ color: 'white' }} />
                            )}
                        </motion.button>

                        <p style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            marginBottom: '24px',
                        }}>
                            {isRecording ? 'Recording... Click to stop' : 'Click the microphone to start speaking'}
                        </p>

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
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

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
        </div>
    )
}
