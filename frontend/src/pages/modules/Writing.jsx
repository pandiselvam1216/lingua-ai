import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenTool, Send, Clock, CheckCircle, ChevronRight, Award, RotateCcw, AlertCircle, Sparkles, FileText } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'
import { evaluateWriting, saveModuleScore } from '../../utils/localScoring'
import { getAIWritingFeedback } from '../../services/aiService'
import ModuleLayout from '../../components/common/ModuleLayout'

const WRITING_RULES = [
    "Choose a Prompt: Select a writing prompt from the list to begin.",
    "Write Your Essay: Type your essay in the provided text area. Aim to meet the word count requirement.",
    "Submit for Feedback: Once you're done, click 'Submit' to receive instant feedback on your grammar, spelling, and style.",
    "Review AI Feedback: An AI will also provide additional insights and suggestions to improve your writing.",
    "Practice Regularly: The more you write and review feedback, the better your writing skills will become!"
]

export default function Writing() {
    const [prompts, setPrompts] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [essay, setEssay] = useState('')
    const [feedback, setFeedback] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [timeElapsed, setTimeElapsed] = useState(0)
    const [showRules, setShowRules] = useState(false)
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)

    const [completedTopics, setCompletedTopics] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_writing')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_writing', JSON.stringify(completedTopics))
    }, [completedTopics])

    useEffect(() => {
        fetchPrompts()
    }, [])

    useEffect(() => {
        const timer = setInterval(() => {
            if (!feedback) setTimeElapsed(prev => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [feedback])

    const fetchPrompts = async () => {
        try {
            const data = await getModuleQuestions('writing')
            setPrompts(data)
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentPrompt = prompts[currentIndex]
    const minWords = currentPrompt?.word_limit || 150
    const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
    const wordProgress = Math.min((wordCount / minWords) * 100, 100)

    const handleSubmit = async () => {
        if (!essay.trim() || submitting || wordCount < minWords) return

        setSubmitting(true)
        try {
            const result = await evaluateWriting(essay, timeElapsed)
            const aiFeedback = await getAIWritingFeedback(essay, currentPrompt?.title || 'General Writing', result.suggestions?.length || 0)
            
            if (aiFeedback) result.aiFeedback = aiFeedback
            setFeedback(result)

            if (!completedTopics.includes(currentIndex)) {
                setCompletedTopics(prev => [...prev, currentIndex])
            }
        } catch (error) {
            console.error('Failed to submit:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setEssay('')
        setFeedback(null)
        setTimeElapsed(0)
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #F59E0B', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <ModuleLayout
            icon={PenTool}
            iconColor="#F59E0B"
            iconBgBase="#F59E0B"
            iconBgHover="#D97706"
            title="Writing Practice"
            description="Develop your essay writing skills with AI feedback"
            score={completedTopics.length}
            totalScore={prompts.length}
            questions={prompts}
            currentIndex={currentIndex}
            completedQuestions={completedTopics}
            onSelectQuestion={(idx) => {
                setCurrentIndex(idx)
                handleReset()
            }}
            showRules={showRules}
            onShowRules={() => setShowRules(true)}
            onCloseRules={() => setShowRules(false)}
            rulesList={WRITING_RULES}
        >
            <motion.div key={`prompt-${currentIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                
                {/* Timer Header Component */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: 'fit-content', marginBottom: '16px' }}>
                    <Clock size={16} color="#6B7280" />
                    <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>
                        {formatTime(timeElapsed)}
                    </span>
                </div>

                {/* Prompt Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentPrompt?.title}</h2>
                    <div style={{ padding: '6px 12px', backgroundColor: '#FEF3C7', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} style={{ color: '#D97706' }} />
                        <span style={{ fontSize: '13px', color: '#92400E', fontWeight: '500' }}>{minWords} words limit</span>
                    </div>
                </div>
                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6', marginBottom: '24px' }}>
                    {currentPrompt?.content}
                </p>

                {/* Editor Area */}
                <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
                    {/* Word progress */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid #E5E7EB' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#6B7280' }}>
                                <span>{wordCount} words</span>
                                <span style={{ color: wordCount >= minWords ? '#F59E0B' : '#6B7280' }}>Min: {minWords} words</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div animate={{ width: `${wordProgress}%` }} style={{ height: '100%', borderRadius: '3px', background: wordCount >= minWords ? 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)' : 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', backgroundColor: wordCount >= minWords ? '#FEF3C7' : '#FFF7ED', color: wordCount >= minWords ? '#92400E' : '#C2410C' }}>
                            {wordCount >= minWords ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                {wordCount >= minWords ? 'Ready for review' : `${minWords - wordCount} more words needed`}
                            </span>
                        </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                        value={essay}
                        onChange={(e) => setEssay(e.target.value)}
                        disabled={!!feedback}
                        placeholder="Start writing your essay here..."
                        style={{ width: '100%', minHeight: '350px', padding: '24px', border: 'none', backgroundColor: feedback ? '#F9FAFB' : 'white', fontSize: '15px', lineHeight: '1.8', outline: 'none', resize: 'vertical' }}
                    />

                    {/* Actions */}
                    <div style={{ padding: '20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#F9FAFB' }}>
                        <button onClick={handleReset} disabled={!essay && !feedback} className="btn btn-secondary">
                            <RotateCcw size={16} /> Reset
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={wordCount < minWords || submitting || !!feedback}
                            className="btn btn-primary"
                            style={{ background: (wordCount >= minWords && !feedback) ? '#F59E0B' : '#E5E7EB', color: (wordCount >= minWords && !feedback) ? 'white' : '#9CA3AF' }}
                        >
                            <Sparkles size={16} /> {submitting ? 'Analyzing...' : 'Analyze Writing'}
                        </button>
                    </div>
                </div>

                {/* AI Feedback */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Sparkles size={20} color="#F59E0B" />
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>AI Feedback</h3>
                                </div>
                                <div style={{ padding: '8px 16px', backgroundColor: feedback.score >= 70 ? '#FEF3C7' : '#FEF2F2', borderRadius: '20px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: '700', color: feedback.score >= 70 ? '#D97706' : '#EF4444' }}>
                                        {feedback.score}/100
                                    </span>
                                </div>
                            </div>

                            <div className="grid-2col" style={{ marginBottom: '24px' }}>
                                {Object.entries(feedback.feedback || {}).map(([key, value]) => (
                                    <div key={key} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <CheckCircle size={16} color="#F59E0B" />
                                            <span style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize' }}>{key}</span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {feedback.suggestions && feedback.suggestions.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Suggestions for Improvement</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                        {feedback.suggestions.map((s, idx) => (
                                            <li key={idx} style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px', lineHeight: '1.5' }}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                {currentIndex < prompts.length - 1 ? (
                                    <button onClick={() => { setCurrentIndex(i => i + 1); handleReset(); }} className="btn btn-primary" style={{ background: '#F59E0B' }}>
                                        Next Topic <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button onClick={() => setShowCompletionTracker(true)} className="btn btn-primary" style={{ background: '#F59E0B' }}>
                                        <Award size={18} /> Finish Module
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>All Prompts Completed!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Excellent work practicing your essay writing.</p>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => window.location.reload()} className="btn btn-secondary">Restart Module</button>
                                <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary" style={{ background: '#F59E0B' }}>Back to Dashboard</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ModuleLayout>
    )
}
