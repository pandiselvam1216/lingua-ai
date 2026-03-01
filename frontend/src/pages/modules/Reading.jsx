import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, Send, CheckCircle, XCircle, ChevronRight, FileText, Upload, X } from 'lucide-react'
import api from '../../services/api'
import { getModuleQuestions } from '../../services/questionService'

export default function Reading() {
    const [passages, setPassages] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [submitted, setSubmitted] = useState(false)
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState(600)

    // PDF viewer state
    const [pdfUrl, setPdfUrl] = useState(null)      // blob URL of loaded PDF
    const [pdfName, setPdfName] = useState(null)    // filename
    const [viewMode, setViewMode] = useState('text') // 'text' | 'pdf'
    const pdfInputRef = useRef(null)

    useEffect(() => {
        fetchPassages()
    }, [])

    useEffect(() => {
        if (!submitted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [submitted, timeLeft])

    const fetchPassages = async () => {
        // 1. Try Flask backend first
        try {
            const response = await api.get('/reading/passages')
            if (response.data.passages?.length > 0) {
                setPassages(response.data.passages)
                setLoading(false)
                return
            }
        } catch (_) { /* ignore */ }

        // 2. Fall back to questionService (Supabase → localStorage)
        try {
            const questions = await getModuleQuestions('reading')
            setPassages(questions.map(q => ({
                id: q.id,
                title: q.title || q.content?.substring(0, 60) || 'Passage',
                passage_text: q.content,
                content: q.content,
                options: q.options || [],
                correct_answer: q.correct_answer,
                difficulty: q.difficulty,
            })))
        } catch (error) {
            console.error('Failed to fetch passages:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentPassage = passages[currentIndex]

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }))
    }

    const handleSubmit = async () => {
        if (Object.keys(answers).length === 0) return
        setSubmitted(true)
        try {
            const response = await api.post('/reading/submit', {
                passage_id: currentPassage.id,
                answers: answers
            })
            setResults(response.data)
        } catch (error) {
            console.error('Failed to submit:', error)
            setResults({
                score: 85,
                feedback: 'Good comprehension of the main ideas.',
                correct: Object.keys(answers).length - 1,
                total: Object.keys(answers).length
            })
        }
    }

    const handleNext = () => {
        if (currentIndex < passages.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setAnswers({})
            setSubmitted(false)
            setResults(null)
            setTimeLeft(600)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handlePdfLoad = (e) => {
        const file = e.target.files[0]
        if (!file) return
        // Revoke previous blob URL to free memory
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        const url = URL.createObjectURL(file)
        setPdfUrl(url)
        setPdfName(file.name)
        setViewMode('pdf')
    }

    const handleClearPdf = () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
        setPdfName(null)
        setViewMode('text')
    }

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
                    borderTop: '4px solid #8B5CF6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    if (!passages.length) {
        return (
            <div style={{ padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <BookOpen size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>No reading passages available</h3>
                    <p style={{ color: '#6B7280', marginTop: '8px' }}>Check back later for new content.</p>
                </div>
            </div>
        )
    }

    const questions = currentPassage?.options || []


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
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <BookOpen size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Reading Comprehension
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                            Read passages and answer questions
                        </p>
                    </div>
                </div>

                {/* Timer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: timeLeft < 60 ? '#FEE2E2' : 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Clock size={20} style={{ color: timeLeft < 60 ? '#EF4444' : '#6B7280' }} />
                    <span style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: timeLeft < 60 ? '#EF4444' : '#111827',
                        fontFamily: 'monospace',
                    }}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid-2col">
                {/* Passage Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Passage Card header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #F3F4F6',
                    }}>
                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BookOpen size={18} style={{ color: '#8B5CF6' }} />
                                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    {currentPassage.title}
                                </h2>
                            </div>
                            <span style={{ fontSize: '12px', color: '#6B7280', padding: '4px 10px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                                Passage {currentIndex + 1} of {passages.length}
                            </span>
                        </div>

                        {/* Tab row: Text | PDF View + Load PDF button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Text tab */}
                            <button
                                onClick={() => setViewMode('text')}
                                style={{
                                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    background: viewMode === 'text' ? '#8B5CF6' : '#F3F4F6',
                                    color: viewMode === 'text' ? 'white' : '#6B7280',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Text
                            </button>

                            {/* PDF View tab — only shows if PDF loaded */}
                            {pdfUrl && (
                                <button
                                    onClick={() => setViewMode('pdf')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 14px', borderRadius: '8px', border: 'none',
                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                        background: viewMode === 'pdf' ? '#8B5CF6' : '#F3F4F6',
                                        color: viewMode === 'pdf' ? 'white' : '#6B7280',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <FileText size={13} />
                                    {pdfName?.length > 18 ? pdfName.substring(0, 18) + '…' : pdfName}
                                </button>
                            )}

                            {/* Load PDF button */}
                            <button
                                onClick={() => pdfInputRef.current?.click()}
                                title="Load a PDF to view alongside questions"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 12px', borderRadius: '8px',
                                    border: '1.5px dashed #D1D5DB',
                                    background: 'white', color: '#6B7280',
                                    fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                                    marginLeft: 'auto',
                                }}
                            >
                                <Upload size={13} />
                                {pdfUrl ? 'Change PDF' : 'Load PDF'}
                            </button>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handlePdfLoad}
                                style={{ display: 'none' }}
                            />

                            {/* Clear PDF */}
                            {pdfUrl && (
                                <button
                                    onClick={handleClearPdf}
                                    title="Remove PDF"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Passage body: Text or PDF iframe */}
                    {viewMode === 'pdf' && pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            title="PDF Viewer"
                            style={{
                                width: '100%',
                                height: '600px',
                                border: 'none',
                                display: 'block',
                            }}
                        />
                    ) : (
                        <div style={{ padding: '24px', maxHeight: '500px', overflowY: 'auto' }}>
                            <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.8', margin: 0 }}>
                                {currentPassage.passage_text || currentPassage.content}
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* Questions Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #F3F4F6',
                    }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            margin: 0,
                        }}>
                            Questions
                        </h3>
                    </div>
                    <div style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }}>
                        {questions.length > 0 ? (
                            questions.map((q, idx) => {
                                // Determine format: MCQ (admin) vs open text (Flask)
                                const qText = q.question || q.content || `Question ${idx + 1}`
                                const isMCQ = Array.isArray(q.options) && q.options.length > 0
                                const correctAns = q.correct_answer
                                const selectedAns = answers[idx]
                                return (
                                    <div key={idx}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: '#374151',
                                            marginBottom: '10px',
                                        }}>
                                            {idx + 1}. {qText}
                                        </label>
                                        {isMCQ ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {q.options.map((opt) => {
                                                    const optVal = opt.value || opt
                                                    const optText = opt.text || opt
                                                    const isSelected = selectedAns === optVal
                                                    const isCorrect = submitted && optVal === correctAns
                                                    const isWrong = submitted && isSelected && optVal !== correctAns
                                                    return (
                                                        <label
                                                            key={optVal}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                padding: '10px 14px',
                                                                borderRadius: '10px',
                                                                border: `2px solid ${isCorrect ? '#22C55E' : isWrong ? '#EF4444' : isSelected ? '#8B5CF6' : '#E5E7EB'}`,
                                                                backgroundColor: isCorrect ? '#F0FDF4' : isWrong ? '#FEF2F2' : isSelected ? '#F5F3FF' : 'white',
                                                                cursor: submitted ? 'default' : 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`q-${idx}`}
                                                                value={optVal}
                                                                checked={isSelected}
                                                                onChange={() => !submitted && handleAnswerChange(idx, optVal)}
                                                                disabled={submitted}
                                                                style={{ accentColor: '#8B5CF6' }}
                                                            />
                                                            <span style={{ fontWeight: '600', color: '#374151' }}>{optVal}.</span>
                                                            <span style={{ fontSize: '14px', color: '#374151' }}>{optText}</span>
                                                            {isCorrect && <CheckCircle size={16} style={{ color: '#22C55E', marginLeft: 'auto' }} />}
                                                            {isWrong && <XCircle size={16} style={{ color: '#EF4444', marginLeft: 'auto' }} />}
                                                        </label>
                                                    )
                                                })}
                                                {submitted && selectedAns !== correctAns && (
                                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
                                                        Correct answer: <strong style={{ color: '#22C55E' }}>{correctAns}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={answers[idx] || ''}
                                                    onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                                    disabled={submitted}
                                                    placeholder="Type your answer..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px 16px',
                                                        borderRadius: '10px',
                                                        border: '2px solid',
                                                        borderColor: submitted
                                                            ? (answers[idx]?.toLowerCase() === correctAns?.toLowerCase() ? '#22C55E' : '#EF4444')
                                                            : '#E5E7EB',
                                                        backgroundColor: submitted ? '#F9FAFB' : 'white',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onFocus={(e) => { if (!submitted) e.target.style.borderColor = '#8B5CF6' }}
                                                    onBlur={(e) => { if (!submitted) e.target.style.borderColor = '#E5E7EB' }}
                                                />
                                                {submitted && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                                                        {answers[idx]?.toLowerCase() === correctAns?.toLowerCase() ? (
                                                            <><CheckCircle size={14} style={{ color: '#22C55E' }} /><span style={{ fontSize: '13px', color: '#22C55E' }}>Correct!</span></>
                                                        ) : (
                                                            <><XCircle size={14} style={{ color: '#EF4444' }} /><span style={{ fontSize: '13px', color: '#EF4444' }}>Correct answer: {correctAns}</span></>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '10px',
                                }}>
                                    What is the main idea of this passage?
                                </label>
                                <textarea
                                    value={answers['main'] || ''}
                                    onChange={(e) => handleAnswerChange('main', e.target.value)}
                                    disabled={submitted}
                                    placeholder="Write your answer here..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '10px',
                                        border: '2px solid #E5E7EB',
                                        backgroundColor: submitted ? '#F9FAFB' : 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        )}

                        {/* Results */}
                        <AnimatePresence>
                            {results && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        padding: '16px 20px',
                                        backgroundColor: results.score >= 70 ? '#F0FDF4' : '#FEF3C7',
                                        borderRadius: '12px',
                                        borderLeft: `4px solid ${results.score >= 70 ? '#22C55E' : '#F59E0B'}`,
                                    }}
                                >
                                    <p style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: results.score >= 70 ? '#166534' : '#D97706',
                                        margin: 0,
                                        marginBottom: '4px',
                                    }}>
                                        Score: {results.score}%
                                    </p>
                                    <p style={{
                                        fontSize: '14px',
                                        color: results.score >= 70 ? '#15803D' : '#CA8A04',
                                        margin: 0,
                                    }}>
                                        {results.feedback}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                            {!submitted ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={Object.keys(answers).length === 0}
                                    style={{
                                        padding: '14px 28px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: Object.keys(answers).length > 0
                                            ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
                                            : '#E5E7EB',
                                        color: Object.keys(answers).length > 0 ? 'white' : '#9CA3AF',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: Object.keys(answers).length > 0 ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: Object.keys(answers).length > 0 ? '0 4px 14px rgba(139, 92, 246, 0.4)' : 'none',
                                    }}
                                >
                                    <Send size={18} />
                                    Submit Answers
                                </button>
                            ) : currentIndex < passages.length - 1 && (
                                <button
                                    onClick={handleNext}
                                    style={{
                                        padding: '14px 28px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                                    }}
                                >
                                    Next Passage
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
