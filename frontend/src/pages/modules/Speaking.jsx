import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, Clock, RotateCcw, AlertCircle, Volume2, CheckCircle, ChevronRight, Award, ChevronLeft, ArrowLeft, MessageCircle, User, Users, Megaphone, Presentation, Briefcase, List, Smile, BookOpen, Image as ImageIcon, MessageSquare } from 'lucide-react'
import { evaluateSpeaking, saveModuleScore } from '../../utils/localScoring'
import { getModuleQuestions } from '../../services/questionService'
import useSyncUpdate from '../../hooks/useSyncUpdate'
import ModuleLayout from '../../components/common/ModuleLayout'
import Modal from '../../components/common/Modal'

const SPEAKING_RULES = [
    "Select a speaking prompt from the list to begin.",
    "When ready, click 'Start Recording' and speak clearly into your microphone.",
    "You have a time limit for each prompt. Try to speak for the entire duration.",
    "Once you finish (or time runs out), click 'Get Feedback'.",
    "Our AI will evaluate your fluency, vocabulary, and grammar based on your audio."
]

const SUBMODULES = [
    { id: 'conversations', title: 'Speaking in Conversations', icon: MessageCircle, desc: 'Practice everyday dialogues and natural interactions.', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'self_introduction', title: 'Speaking for Self-Introduction', icon: User, desc: 'Learn how to introduce yourself professionally and personally.', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'public_speeches', title: 'Speaking in Public (Speeches)', icon: Megaphone, desc: 'Master the art of delivering compelling speeches to an audience.', color: '#EC4899', bg: '#FDF2F8' },
    { id: 'discussions', title: 'Speaking in Discussions', icon: Users, desc: 'Engage actively in group discussions and debates.', color: '#10B981', bg: '#ECFDF5' },
    { id: 'presentations', title: 'Speaking in Presentations', icon: Presentation, desc: 'Deliver structured and engaging presentations.', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'interviews', title: 'Speaking for Interviews', icon: Briefcase, desc: 'Prepare for job interviews with confident responses.', color: '#6366F1', bg: '#EEF2FF' },
    { id: 'instructions', title: 'Speaking for Instructions', icon: List, desc: 'Give clear, step-by-step instructions and directions.', color: '#14B8A6', bg: '#F0FDFA' },
    { id: 'pronunciation', title: 'Speaking with Proper Pronunciation', icon: Volume2, desc: 'Focus on clear articulation and correct sound production.', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'tone_emotion', title: 'Speaking with Tone & Emotion', icon: Smile, desc: 'Convey feelings and attitudes through vocal variety.', color: '#EC4899', bg: '#FDF2F8' },
    { id: 'storytelling', title: 'Speaking for Storytelling', icon: BookOpen, desc: 'Narrate experiences and stories captivatingly.', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'description', title: 'Speaking for Description', icon: ImageIcon, desc: 'Describe people, places, and objects vividly.', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'opinions', title: 'Speaking for Opinions', icon: MessageSquare, desc: 'Express and defend your viewpoints effectively.', color: '#10B981', bg: '#ECFDF5' }
]

export default function Speaking() {
    const [activeSubmodule, setActiveSubmodule] = useState(null)
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
    }, [activeSubmodule])
    
    // Subscribe to live updates using custom hook
    useSyncUpdate('speaking', fetchPrompts)

    const fetchPrompts = async () => {
        try {
            setLoading(true)
            const data = await getModuleQuestions('speaking')
            const filtered = data.filter(p => (p.sub_module === activeSubmodule) || (!p.sub_module && activeSubmodule === 'conversations'))
            setPrompts(filtered)
            if (filtered.length > 0) setTimeLeft(filtered[0].time_limit || 60)
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
            const result = await evaluateSpeaking(
                transcript, 
                elapsed, 
                currentPrompt?.title, 
                currentPrompt?.category || 'General Speaking'
            )

            setFeedback(result)
            setSubmitting(false)
            if (!completedTopics.includes(currentIndex)) {
                setCompletedTopics(prev => [...prev, currentIndex])
            }
        } catch (error) {
            console.error('Failed to submit:', error)
            setSubmitting(false)
            showAlert('Evaluation Failed', 'There was an issue reaching the AI service. Please try again.', 'error')
        }
    }

    // --- Submodule Selection Screen ---
    if (!activeSubmodule) {
        return (
            <div className="page-container" style={{ padding: '40px 32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        style={{
                            width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white',
                            border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#E5E7EB' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: 0 }}>Speaking Categories</h1>
                        <p style={{ color: '#6B7280', margin: '4px 0 0', fontSize: '16px' }}>Select a specialized speaking area to begin your practice</p>
                    </div>
                </div>

                {/* Submodules Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
                    {SUBMODULES.map((sub, idx) => (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                                setActiveSubmodule(sub.id)
                                handleReset()
                                setCurrentIndex(0)
                            }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                padding: '32px',
                                cursor: 'pointer',
                                border: '1px solid #F3F4F6',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            whileHover={{
                                y: -10,
                                backgroundColor: sub.bg,
                                borderColor: `${sub.color}30`,
                                boxShadow: `0 20px 25px -5px ${sub.color}15, 0 10px 10px -5px ${sub.color}10`
                            }}
                        >
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                                <motion.div
                                    style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                                    whileHover={{ scale: 1.15, rotate: 10 }}
                                >
                                    <sub.icon size={24} color={sub.color} />
                                </motion.div>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{sub.title}</h2>
                                    <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{sub.desc}</p>
                                </div>
                                <motion.div
                                    style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: sub.color, fontSize: '15px', fontWeight: '600' }}
                                    whileHover={{ x: 6 }}
                                >
                                    Start Practice <ChevronRight size={18} />
                                </motion.div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    const currentSubmodule = SUBMODULES.find(s => s.id === activeSubmodule)

    return (
        <ModuleLayout
            icon={currentSubmodule?.icon || Mic}
            iconColor={currentSubmodule?.color || "#3B82F6"}
            iconBgBase={currentSubmodule?.color || "#3B82F6"}
            iconBgHover={currentSubmodule?.color ? `${currentSubmodule.color}dd` : "#2563EB"}
            title={currentSubmodule?.title || "Speaking Practice"}
            description={currentSubmodule?.desc || "Improve your pronunciation and fluency with AI feedback"}
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
                {/* Back to submodules header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <button
                        onClick={() => setActiveSubmodule(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', color: '#4B5563', fontSize: '14px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <ArrowLeft size={16} /> Back to Categories
                    </button>
                </div>

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
                            <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                                {/* Primary Metrics */}
                                <div className="grid-2col" style={{ gap: '16px' }}>
                                    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Award size={16} style={{ color: '#3B82F6' }} />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>CLARITY SCORE</span>
                                        </div>
                                        <p style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1E40AF' }}>{feedback.clarity_score}/10</p>
                                    </div>
                                    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Clock size={16} style={{ color: '#F59E0B' }} />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>FLUENCY</span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: '1.4' }}>{feedback.fluency_feedback}</p>
                                    </div>
                                </div>

                                {/* Grammar Issues */}
                                <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <AlertCircle size={16} style={{ color: '#EF4444' }} />
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#991B1B' }}>GRAMMAR & PRAGMATICS</span>
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '6px' }}>
                                        {feedback.grammar_issues?.map((issue, i) => (
                                            <li key={i} style={{ fontSize: '13px', color: '#B91C1C' }}>{issue}</li>
                                        ))}
                                        {(!feedback.grammar_issues || feedback.grammar_issues.length === 0) && (
                                            <li style={{ fontSize: '13px', color: '#059669' }}>Excellent grammatical accuracy!</li>
                                        )}
                                    </ul>
                                </div>

                                {/* Suggested Improvement */}
                                <div style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <CheckCircle size={16} style={{ color: '#10B981' }} />
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#065F46' }}>HOW TO IMPROVE</span>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#047857', margin: 0, fontStyle: 'italic', lineHeight: '1.6' }}>
                                        "{feedback.suggested_improvement}"
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        AI Confidence: {feedback.confidence_level}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                {currentIndex < prompts.length - 1 ? (
                                    <button onClick={() => { setCurrentIndex(i => i + 1); handleReset(); }} className="btn btn-primary">
                                        Next Topic <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button onClick={() => setShowCompletionTracker(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
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
                                <button onClick={() => { setShowCompletionTracker(false); setActiveSubmodule(null); }} className="btn btn-primary">Back to Categories</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ModuleLayout>
    )
}
