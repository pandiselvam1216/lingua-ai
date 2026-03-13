import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, CheckCircle, Info, CheckSquare, Check, X, ChevronRight, Award } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleRulesModal from '../../components/common/ModuleRulesModal'

export default function Grammar() {
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [loading, setLoading] = useState(true)
    const [showExplanation, setShowExplanation] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [completedQuestions, setCompletedQuestions] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_grammar');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_grammar', JSON.stringify(completedQuestions));
    }, [completedQuestions]);

    useEffect(() => {
        fetchQuestions()
    }, [])

    const fetchQuestions = async () => {
        try {
            const questions = await getModuleQuestions('grammar')
            setQuestions(questions)
        } catch (error) {
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentQuestion = questions[currentIndex]

    const handleSelectAnswer = (value) => {
        if (showResult) return
        setSelectedAnswer(value)
    }

    const handleCheckAnswer = async () => {
        if (!selectedAnswer) return

        const correct = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
        setIsCorrect(correct)
        setShowResult(true)
        setShowExplanation(true)
        setScore(prev => {
            const newScore = {
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1
            };

            // Check if this is the last question
            if (currentIndex === questions.length - 1) {
                const finalPercent = Math.round((newScore.correct / newScore.total) * 100);
                saveModuleScore('grammar', finalPercent, newScore.total * 60);
            }

            return newScore;
        })
        if (correct && !completedQuestions.includes(currentIndex)) {
            setCompletedQuestions(prev => [...prev, currentIndex])
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedAnswer(null)
            setShowResult(false)
            setShowExplanation(false)
            setIsCorrect(false)
        }
    }

    const handleRestart = () => {
        setCurrentIndex(0)
        setSelectedAnswer(null)
        setShowResult(false)
        setShowExplanation(false)
        setIsCorrect(false)
        setScore({ correct: 0, total: 0 })
        setCompletedQuestions([])
    }

    const handleSelectExercise = (index) => {
        if (showResult && !isCorrect && currentIndex === index) return // Stay on wrong answer to see explanation
        setCurrentIndex(index)
        setSelectedAnswer(null)
        setShowResult(false)
        setShowExplanation(false)
        setIsCorrect(false)
    }

    const grammarRules = [
        "Read each sentence carefully and identify the grammatical error or the best completion.",
        "Select the single best answer from the options provided.",
        "You can retry an exercise at any time during the session, but your first attempt defines your score.",
        "Your score will be saved automatically once you complete all exercises in the session.",
        "Pay special attention to verb tense, subject-verb agreement, and proper preposition usage."
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
                    borderTop: '4px solid #EF4444',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    if (!questions.length) {
        return (
            <div style={{
                padding: '32px',
                backgroundColor: '#F9FAFB',
                minHeight: '100vh',
            }}>
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
                    <CheckSquare size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>No questions available</h3>
                    <p style={{ color: '#6B7280', marginTop: '8px', margin: '8px 0 0 0' }}>Check back later for new grammar exercises.</p>
                </div>
            </div>
        )
    }

    const progress = ((currentIndex + 1) / questions.length) * 100
    const scorePercent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

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
                        background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <CheckSquare size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Grammar Practice
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            Master English grammar rules with interactive exercises
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

                    {/* Score Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {score.correct}/{score.total}
                    </span>
                    <span style={{ fontSize: '13px', color: '#9CA3AF' }}>•</span>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: scorePercent >= 70 ? '#16A34A' : '#EF4444',
                    }}>
                        {scorePercent}%
                    </span>
                </div>
                </div>
            </div>

            <div className="grid-sidebar">
                {/* Exercises Sidebar */}
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
                        Exercises
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {questions.map((q, idx) => (
                            <motion.button
                                key={q.id || idx}
                                onClick={() => handleSelectExercise(idx)}
                                whileHover={{ x: 4 }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: currentIndex === idx ? '#FEF2F2' : 'transparent',
                                    borderLeft: currentIndex === idx ? '3px solid #EF4444' : '3px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{
                                            fontSize: '14px',
                                            fontWeight: currentIndex === idx ? '600' : '500',
                                            color: currentIndex === idx ? '#991B1B' : '#374151',
                                            margin: 0,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '180px'
                                        }}>
                                            {q.content?.substring(0, 30)}...
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
                                            Exercise {idx + 1}
                                        </p>
                                    </div>
                                    {completedQuestions.includes(idx) && (
                                        <CheckCircle size={14} style={{ color: '#22C55E' }} />
                                    )}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Question Card */}
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                                Difficulty: {currentQuestion.difficulty === 1 ? 'Easy' : currentQuestion.difficulty === 2 ? 'Medium' : 'Hard'}
                            </span>
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '32px', lineHeight: '1.6' }}>
                            {currentQuestion.content}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                            {currentQuestion.options?.map((option, idx) => {
                                const isSelected = selectedAnswer === option.value
                                const isCorrectOption = option.value === currentQuestion.correct_answer
                                const showCorrect = showResult && isCorrectOption
                                const showWrong = showResult && isSelected && !isCorrectOption

                                return (
                                    <motion.button
                                        key={idx}
                                        onClick={() => handleSelectAnswer(option.value)}
                                        whileHover={!showResult ? { x: 4 } : {}}
                                        style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            borderRadius: '12px',
                                            border: '2px solid',
                                            borderColor: showCorrect ? '#22C55E' : showWrong ? '#EF4444' : isSelected ? '#EF4444' : '#F3F4F6',
                                            backgroundColor: showCorrect ? '#F0FDF4' : showWrong ? '#FEF2F2' : isSelected ? '#FEF2F2' : 'white',
                                            cursor: showResult ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            backgroundColor: showCorrect ? '#22C55E' : showWrong ? '#EF4444' : isSelected ? '#EF4444' : '#F3F4F6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: (showCorrect || showWrong || isSelected) ? 'white' : '#6B7280',
                                            fontWeight: '700', fontSize: '14px'
                                        }}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span style={{ fontSize: '16px', color: '#374151', fontWeight: isSelected ? '600' : '400' }}>
                                            {option.text}
                                        </span>
                                        {showCorrect && <Check size={20} style={{ color: '#22C55E', marginLeft: 'auto' }} />}
                                        {showWrong && <X size={20} style={{ color: '#EF4444', marginLeft: 'auto' }} />}
                                    </motion.button>
                                )
                            })}
                        </div>

                        {showExplanation && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                style={{
                                    padding: '20px',
                                    backgroundColor: '#F0F9FF',
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #3B82F6',
                                    marginBottom: '32px',
                                }}
                            >
                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1E40AF', marginBottom: '8px' }}>Explanation</p>
                                <p style={{ fontSize: '14px', color: '#1E3A8A', margin: 0, lineHeight: '1.6' }}>{currentQuestion.explanation}</p>
                            </motion.div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            {!showResult ? (
                                <button
                                    onClick={handleCheckAnswer}
                                    disabled={!selectedAnswer}
                                    style={{
                                        padding: '14px 32px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: selectedAnswer ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : '#E5E7EB',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <Check size={18} />
                                    Check Answer
                                </button>
                            ) : currentIndex < questions.length - 1 ? (
                                <button
                                    onClick={handleNext}
                                    style={{
                                        padding: '14px 32px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                        color: 'white',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    Next Question
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowPopup(true)}
                                    style={{
                                        padding: '14px 32px',
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
                    </motion.div>
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
                                background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
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
                                You've finished the Grammar practice session.
                            </p>

                            <div style={{
                                marginBottom: '32px',
                                padding: '20px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '16px',
                            }}>
                                <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 4px 0' }}>Final accuracy</p>
                                <p style={{ fontSize: '36px', fontWeight: '800', color: '#EF4444', margin: 0 }}>
                                    {scorePercent}%
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button
                                    onClick={() => {
                                        setShowPopup(false);
                                        handleRestart();
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
                title="Grammar Rules"
                description="Follow these guidelines to master your grammar exercises:"
                rules={grammarRules}
            />
        </div>
    )
}
