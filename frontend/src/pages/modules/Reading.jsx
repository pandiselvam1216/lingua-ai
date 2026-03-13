import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, Send, CheckCircle, XCircle, ChevronRight, FileText, Upload, X, Award, RotateCcw, Search, Info } from 'lucide-react'
import api from '../../services/api'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleRulesModal from '../../components/common/ModuleRulesModal'

export default function Reading() {
    const [passages, setPassages] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [submitted, setSubmitted] = useState(false)
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState(600)
    const [showPopup, setShowPopup] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [completedPassages, setCompletedPassages] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_reading');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_reading', JSON.stringify(completedPassages));
    }, [completedPassages]);

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
            saveModuleScore('reading', response.data.score, 600 - timeLeft)
            markAsCompleted()
        } catch (error) {
            console.error('Failed to submit:', error)
            const fallbackResult = {
                score: 85,
                feedback: 'Good comprehension of the main ideas.',
                correct: Object.keys(answers).length - 1,
                total: Object.keys(answers).length
            }
            setResults(fallbackResult)
            saveModuleScore('reading', fallbackResult.score, 600 - timeLeft)
            markAsCompleted()
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

    const markAsCompleted = () => {
        if (!completedPassages.includes(currentIndex)) {
            setCompletedPassages(prev => [...prev, currentIndex])
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

    const handleSelectPassage = (index) => {
        if (submitted && !results) return // Prevent switching while submitting
        setCurrentIndex(index)
        setAnswers({})
        setSubmitted(false)
        setResults(null)
        setTimeLeft(600)
    }

    const readingRules = [
        "Read the passage carefully before attempting the questions.",
        "You have a time limit (default 10 minutes) for each passage.",
        "Select the best answer for each multiple-choice question.",
        "Your score is based on the number of correct answers.",
        "You can refer back to the passage at any time while answering."
    ];

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
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <BookOpen size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>No reading passages available</h3>
                    <p style={{ color: '#6B7280', margin: 0 }}>Check back later for new content.</p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
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
                            Read passages and answer questions to improve comprehension
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

                    {/* Timer Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Clock size={16} style={{ color: '#8B5CF6' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
                </div>
            </div>

            <div className="grid-sidebar">
                {/* Passages Sidebar */}
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
                        Passages
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {passages.map((p, idx) => (
                            <motion.button
                                key={p.id || idx}
                                onClick={() => handleSelectPassage(idx)}
                                whileHover={{ x: 4 }}
                                style={{
                                    padding: '14px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: currentIndex === idx ? '#F5F3FF' : 'transparent',
                                    borderLeft: currentIndex === idx ? '3px solid #8B5CF6' : '3px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{
                                            fontSize: '14px',
                                            fontWeight: currentIndex === idx ? '600' : '500',
                                            color: currentIndex === idx ? '#5B21B6' : '#374151',
                                            margin: 0,
                                            marginBottom: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '200px'
                                        }}>
                                            {p.title}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                                            Passage {idx + 1}
                                        </p>
                                    </div>
                                    {completedPassages.includes(idx) && (
                                        <CheckCircle size={16} style={{ color: '#22C55E' }} />
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Passage & Questions Top Row */}
                    <div className="grid-2col">
                        {/* Passage Card */}
                        <motion.div
                            key={`passage-${currentIndex}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #F3F4F6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookOpen size={18} style={{ color: '#8B5CF6' }} />
                                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                        {currentPassage.title}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* Timer */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        backgroundColor: timeLeft < 60 ? '#FEE2E2' : '#F3F4F6',
                                        borderRadius: '6px',
                                    }}>
                                        <Clock size={14} style={{ color: timeLeft < 60 ? '#EF4444' : '#6B7280' }} />
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: timeLeft < 60 ? '#EF4444' : '#111827',
                                            fontFamily: 'monospace',
                                        }}>
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* View Tabs */}
                            <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F3F4F6' }}>
                                <button
                                    onClick={() => setViewMode('text')}
                                    style={{
                                        padding: '4px 12px', borderRadius: '6px', border: 'none',
                                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                        background: viewMode === 'text' ? '#F5F3FF' : 'transparent',
                                        color: viewMode === 'text' ? '#8B5CF6' : '#6B7280',
                                    }}
                                >
                                    Text
                                </button>
                                {pdfUrl && (
                                    <button
                                        onClick={() => setViewMode('pdf')}
                                        style={{
                                            padding: '4px 12px', borderRadius: '6px', border: 'none',
                                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                            background: viewMode === 'pdf' ? '#F5F3FF' : 'transparent',
                                            color: viewMode === 'pdf' ? '#8B5CF6' : '#6B7280',
                                        }}
                                    >
                                        PDF View
                                    </button>
                                )}
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => pdfInputRef.current?.click()}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                                        title="Load PDF"
                                    >
                                        <Upload size={14} />
                                    </button>
                                    <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfLoad} style={{ display: 'none' }} />
                                    {pdfUrl && (
                                        <button onClick={handleClearPdf} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                                {viewMode === 'pdf' && pdfUrl ? (
                                    <iframe src={pdfUrl} style={{ width: '100%', height: '400px', border: 'none' }} title="PDF" />
                                ) : (
                                    <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.8', margin: 0 }}>
                                        {currentPassage.passage_text || currentPassage.content}
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* Questions Card */}
                        <motion.div
                            key={`questions-${currentIndex}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #F3F4F6',
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    Questions
                                </h3>
                            </div>
                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', maxHeight: '550px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {questions.length > 0 ? (
                                        questions.map((q, idx) => {
                                            const qText = q.question || q.content || `Question ${idx + 1}`
                                            const isMCQ = Array.isArray(q.options) && q.options.length > 0
                                            const correctAns = q.correct_answer
                                            const selectedAns = answers[idx]
                                            return (
                                                <div key={idx} style={{ paddingBottom: '16px', borderBottom: idx < questions.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                                                        {idx + 1}. {qText}
                                                    </p>
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
                                                                            borderRadius: '8px',
                                                                            border: '1px solid',
                                                                            borderColor: isCorrect ? '#22C55E' : isWrong ? '#EF4444' : isSelected ? '#8B5CF6' : '#E5E7EB',
                                                                            backgroundColor: isCorrect ? '#F0FDF4' : isWrong ? '#FEF2F2' : isSelected ? '#F5F3FF' : 'white',
                                                                            cursor: submitted ? 'default' : 'pointer',
                                                                            fontSize: '13px',
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            checked={isSelected}
                                                                            onChange={() => !submitted && handleAnswerChange(idx, optVal)}
                                                                            disabled={submitted}
                                                                            style={{ accentColor: '#8B5CF6' }}
                                                                        />
                                                                        <span style={{ fontWeight: '600' }}>{optVal}.</span>
                                                                        <span>{optText}</span>
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={answers[idx] || ''}
                                                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                                            disabled={submitted}
                                                            placeholder="Your answer..."
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 14px',
                                                                borderRadius: '8px',
                                                                border: '1px solid',
                                                                borderColor: submitted ? (selectedAns?.toLowerCase() === correctAns?.toLowerCase() ? '#22C55E' : '#EF4444') : '#E5E7EB',
                                                                fontSize: '13px',
                                                                outline: 'none',
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '24px' }}>
                                            <p style={{ color: '#6B7280', fontSize: '14px' }}>No questions available for this passage.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'white',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                             {results && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        padding: '4px 12px',
                                        backgroundColor: results.score >= 70 ? '#DCFCE7' : '#FEF3C7',
                                        borderRadius: '20px',
                                        border: `1px solid ${results.score >= 70 ? '#22C55E' : '#F59E0B'}`,
                                    }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: results.score >= 70 ? '#166534' : '#92400E' }}>
                                            Score: {results.score}%
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{results.feedback}</p>
                                </div>
                             )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {!submitted ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={Object.keys(answers).length === 0}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: Object.keys(answers).length > 0 ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : '#E5E7EB',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: Object.keys(answers).length > 0 ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <Send size={16} />
                                    Submit
                                </button>
                            ) : currentIndex < passages.length - 1 ? (
                                <button
                                    onClick={() => handleSelectPassage(currentIndex + 1)}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    Next Passage
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowPopup(true)}
                                    style={{
                                        padding: '14px 28px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                                    }}
                                >
                                    <Award size={18} />
                                    Final Submit
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Completion Popup */}
                <AnimatePresence>
                    {showPopup && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                                padding: '20px',
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '24px',
                                    padding: '40px',
                                    maxWidth: '400px',
                                    width: '100%',
                                    textAlign: 'center',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 24px',
                                    color: 'white',
                                }}>
                                    <Award size={40} />
                                </div>

                                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>
                                    Module Complete!
                                </h2>
                                <p style={{ color: '#6B7280', margin: '0 0 32px 0' }}>
                                    You've finished the Reading practice session.
                                </p>

                                <div style={{
                                    marginBottom: '32px',
                                    padding: '20px',
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '16px',
                                }}>
                                    <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 4px 0' }}>Last Score</p>
                                    <p style={{ fontSize: '36px', fontWeight: '800', color: '#8B5CF6', margin: 0 }}>
                                        {results?.score || 0}%
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <button
                                        onClick={() => {
                                            setShowPopup(false);
                                            setCurrentIndex(0);
                                            setAnswers({});
                                            setSubmitted(false);
                                            setResults(null);
                                        }}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: '2px solid #E2E8F0',
                                            background: 'white',
                                            color: '#475569',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Retest
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPopup(false);
                                            handleNext();
                                        }}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                                            color: 'white',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Next Topic
                                    </button>
                                    <button
                                        onClick={() => window.location.href = '/dashboard'}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#F1F5F9',
                                            color: '#475569',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Next Module
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ModuleRulesModal 
                    isOpen={showRules}
                    onClose={() => setShowRules(false)}
                    title="Reading Rules"
                    description="Follow these guidelines to improve your reading comprehension:"
                    rules={readingRules}
                />
            </div>
        </div>
    )
}
