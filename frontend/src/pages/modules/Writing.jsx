import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenTool, Clock, Send, FileText, CheckCircle, AlertCircle, Sparkles, RotateCcw } from 'lucide-react'
import { evaluateWriting } from '../../utils/localScoring'
import { getAIWritingFeedback } from '../../services/aiService'
import { getModuleQuestions } from '../../services/questionService'

export default function Writing() {
    const [prompts, setPrompts] = useState([])
    const [selectedPrompt, setSelectedPrompt] = useState(null)
    const [essay, setEssay] = useState('')
    const [feedback, setFeedback] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [timeElapsed, setTimeElapsed] = useState(0)

    useEffect(() => {
        fetchPrompts()
    }, [])

    useEffect(() => {
        const timer = setInterval(() => {
            if (!feedback) {
                setTimeElapsed(prev => prev + 1)
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [feedback])

    const fetchPrompts = async () => {
        try {
            const questions = await getModuleQuestions('writing')
            const mapped = questions.map(q => ({
                id: q.id,
                title: q.title || q.content?.substring(0, 60) || 'Writing Prompt',
                content: q.content,
                word_limit: q.word_limit || 150,
            }))
            setPrompts(mapped)
            if (mapped.length > 0) setSelectedPrompt(mapped[0])
        } catch (error) {
            console.error('Failed to fetch prompts:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectPrompt = (prompt) => {
        setSelectedPrompt(prompt)
        setEssay('')
        setFeedback(null)
        setTimeElapsed(0)
    }

    const handleSubmit = async () => {
        if (!essay.trim() || submitting) return

        setSubmitting(true)
        try {
            // Local grammar evaluation
            const result = await evaluateWriting(essay, timeElapsed)
            // Enhance with AI feedback
            const aiFeedback = await getAIWritingFeedback(
                essay,
                selectedPrompt?.title || 'General Writing',
                result.suggestions?.length || 0
            )
            if (aiFeedback) {
                result.aiFeedback = aiFeedback
            }
            setFeedback(result)
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

    const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
    const minWords = 150
    const progress = Math.min((wordCount / minWords) * 100, 100)

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
                    borderTop: '4px solid #F97316',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
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
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <PenTool size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Writing Practice
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                            Develop your essay writing skills with AI feedback
                        </p>
                    </div>
                </div>

                {/* Timer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Clock size={18} style={{ color: '#6B7280' }} />
                    <span style={{
                        fontSize: '16px',
                        fontWeight: '500',
                        color: '#111827',
                        fontFamily: 'monospace',
                    }}>
                        {formatTime(timeElapsed)}
                    </span>
                </div>
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
                        Essay Topics
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
                                    backgroundColor: selectedPrompt?.id === prompt.id ? '#FFF7ED' : 'transparent',
                                    borderLeft: selectedPrompt?.id === prompt.id ? '3px solid #F97316' : '3px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <p style={{
                                    fontSize: '14px',
                                    fontWeight: selectedPrompt?.id === prompt.id ? '600' : '500',
                                    color: selectedPrompt?.id === prompt.id ? '#C2410C' : '#374151',
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
                                    {prompt.word_limit || minWords}+ words
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
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '12px',
                            }}>
                                <FileText size={18} style={{ color: '#F97316' }} />
                                <h2 style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    margin: 0,
                                }}>
                                    {selectedPrompt.title}
                                </h2>
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

                    {/* Writing Area */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}>
                        {/* Word Count Bar */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ flex: 1, marginRight: '20px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px',
                                }}>
                                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                                        {wordCount} words
                                    </span>
                                    <span style={{
                                        fontSize: '13px',
                                        color: wordCount >= minWords ? '#22C55E' : '#6B7280'
                                    }}>
                                        Min: {minWords} words
                                    </span>
                                </div>
                                <div style={{
                                    height: '6px',
                                    backgroundColor: '#E5E7EB',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                }}>
                                    <motion.div
                                        animate={{ width: `${progress}%` }}
                                        style={{
                                            height: '100%',
                                            background: wordCount >= minWords
                                                ? 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)'
                                                : 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)',
                                            borderRadius: '3px',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: wordCount >= minWords ? '#F0FDF4' : '#FFF7ED',
                                borderRadius: '20px',
                            }}>
                                {wordCount >= minWords ? (
                                    <CheckCircle size={14} style={{ color: '#22C55E' }} />
                                ) : (
                                    <AlertCircle size={14} style={{ color: '#F97316' }} />
                                )}
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    color: wordCount >= minWords ? '#166534' : '#C2410C',
                                }}>
                                    {wordCount >= minWords ? 'Ready to submit' : `${minWords - wordCount} more needed`}
                                </span>
                            </div>
                        </div>

                        {/* Textarea */}
                        <div style={{ padding: '24px' }}>
                            <textarea
                                value={essay}
                                onChange={(e) => setEssay(e.target.value)}
                                disabled={!!feedback}
                                placeholder="Start writing your essay here..."
                                style={{
                                    width: '100%',
                                    minHeight: '300px',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    border: '2px solid #E5E7EB',
                                    backgroundColor: feedback ? '#F9FAFB' : 'white',
                                    fontSize: '15px',
                                    lineHeight: '1.8',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => {
                                    if (!feedback) e.target.style.borderColor = '#F97316'
                                }}
                                onBlur={(e) => {
                                    if (!feedback) e.target.style.borderColor = '#E5E7EB'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #F3F4F6',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                        }}>
                            <button
                                onClick={handleReset}
                                disabled={!essay && !feedback}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: (!essay && !feedback) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: (!essay && !feedback) ? 0.5 : 1,
                                }}
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={wordCount < minWords || submitting || !!feedback}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: (wordCount >= minWords && !feedback)
                                        ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
                                        : '#E5E7EB',
                                    color: (wordCount >= minWords && !feedback) ? 'white' : '#9CA3AF',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: (wordCount >= minWords && !submitting && !feedback) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: (wordCount >= minWords && !feedback) ? '0 4px 14px rgba(249, 115, 22, 0.4)' : 'none',
                                }}
                            >
                                <Send size={16} />
                                {submitting ? 'Analyzing...' : 'Get Feedback'}
                            </button>
                        </div>
                    </div>

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
                                    marginBottom: '24px',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <Sparkles size={20} style={{ color: '#F97316' }} />
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: '#111827',
                                            margin: 0,
                                        }}>
                                            AI Feedback
                                        </h3>
                                    </div>
                                    <div style={{
                                        padding: '10px 20px',
                                        backgroundColor: feedback.score >= 70 ? '#F0FDF4' : '#FEF3C7',
                                        borderRadius: '20px',
                                    }}>
                                        <span style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            color: feedback.score >= 70 ? '#166534' : '#D97706',
                                        }}>
                                            {feedback.score}/100
                                        </span>
                                    </div>
                                </div>

                                {/* Feedback Categories */}
                                <div className="grid-2col" style={{ marginBottom: '24px' }}>
                                    {Object.entries(feedback.feedback || {}).map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: '#F9FAFB',
                                                borderRadius: '12px',
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px',
                                            }}>
                                                <CheckCircle size={16} style={{ color: '#F97316' }} />
                                                <span style={{
                                                    fontSize: '14px',
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

                                {/* Suggestions */}
                                {feedback.suggestions && (
                                    <div>
                                        <h4 style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '12px',
                                        }}>
                                            Suggestions for Improvement
                                        </h4>
                                        <ul style={{
                                            margin: 0,
                                            paddingLeft: '20px',
                                        }}>
                                            {feedback.suggestions.map((suggestion, idx) => (
                                                <li
                                                    key={idx}
                                                    style={{
                                                        fontSize: '14px',
                                                        color: '#6B7280',
                                                        marginBottom: '8px',
                                                        lineHeight: '1.5',
                                                    }}
                                                >
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
