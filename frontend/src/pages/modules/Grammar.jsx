import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Star, Check, X, ChevronRight, Award, RotateCcw } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleLayout from '../../components/common/ModuleLayout'

const GRAMMAR_RULES = [
    "Read each sentence carefully and identify the grammatical error or the best completion.",
    "Select the single best answer from the options provided.",
    "You can retry an exercise at any time during the session, but your first attempt defines your score.",
    "Your score will be saved automatically once you complete all exercises in the session.",
    "Pay special attention to verb tense, subject-verb agreement, and proper preposition usage."
]

export default function Grammar() {
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [loading, setLoading] = useState(true)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [showRules, setShowRules] = useState(false)
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)

    const [completedQuestions, setCompletedQuestions] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_grammar')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_grammar', JSON.stringify(completedQuestions))
    }, [completedQuestions])

    useEffect(() => {
        fetchQuestions()
    }, [])

    const fetchQuestions = async () => {
        try {
            const data = await getModuleQuestions('grammar')
            setQuestions(data)
        } catch (error) {
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentQuestion = questions[currentIndex]
    const scorePercent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

    const handleCheckAnswer = () => {
        if (!selectedAnswer || showResult) return

        const isCorrect = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
        setShowResult(true)

        setScore(prev => {
            const newScore = { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }
            if (currentIndex === questions.length - 1) {
                const finalPercent = Math.round((newScore.correct / newScore.total) * 100)
                saveModuleScore('grammar', finalPercent, newScore.total * 60)
            }
            return newScore
        })

        if (isCorrect && !completedQuestions.includes(currentIndex)) {
            setCompletedQuestions(prev => [...prev, currentIndex])
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedAnswer(null)
            setShowResult(false)
        } else {
            setShowCompletionTracker(true)
        }
    }

    const handleReset = () => {
        setCurrentIndex(0)
        setSelectedAnswer(null)
        setShowResult(false)
        setScore({ correct: 0, total: 0 })
        setCompletedQuestions([])
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #EF4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <ModuleLayout
            icon={CheckSquare}
            iconColor="#EF4444"
            iconBgBase="#EF4444"
            iconBgHover="#DC2626"
            title="Grammar Practice"
            description="Master English grammar rules with interactive exercises"
            score={score.correct}
            totalScore={score.total}
            scoreDisplay={`${score.correct}/${score.total} (${scorePercent}%)`}
            questions={questions}
            currentIndex={currentIndex}
            completedQuestions={completedQuestions}
            onSelectQuestion={(idx) => {
                if (showResult && currentIndex === idx) return
                setCurrentIndex(idx)
                setSelectedAnswer(null)
                setShowResult(false)
            }}
            showRules={showRules}
            onShowRules={() => setShowRules(true)}
            onCloseRules={() => setShowRules(false)}
            rulesList={GRAMMAR_RULES}
        >
            <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                        Difficulty: {currentQuestion?.difficulty === 1 ? 'Easy' : currentQuestion?.difficulty === 2 ? 'Medium' : 'Hard'}
                    </span>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '32px', lineHeight: '1.6' }}>
                    {currentQuestion?.content}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {currentQuestion?.options?.map((option, idx) => {
                        const isSelected = selectedAnswer === option.value
                        const isCorrectOption = option.value === currentQuestion.correct_answer
                        const showCorrect = showResult && isCorrectOption
                        const showWrong = showResult && isSelected && !isCorrectOption

                        let className = 'answer-option '
                        if (showCorrect) className += 'correct'
                        else if (showWrong) className += 'wrong'
                        else if (isSelected) className += 'selected'

                        return (
                            <button
                                key={idx}
                                onClick={() => !showResult && setSelectedAnswer(option.value)}
                                className={className}
                                style={{ width: '100%', cursor: showResult ? 'default' : 'pointer' }}
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
                                <span style={{ fontSize: '16px', fontWeight: isSelected ? '600' : '400' }}>
                                    {option.text}
                                </span>
                                {showCorrect && <Check size={20} color="#22C55E" style={{ marginLeft: 'auto' }} />}
                                {showWrong && <X size={20} color="#EF4444" style={{ marginLeft: 'auto' }} />}
                            </button>
                        )
                    })}
                </div>

                {showResult && currentQuestion?.explanation && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '20px', backgroundColor: '#F0F9FF', borderRadius: '12px', borderLeft: '4px solid #3B82F6', marginBottom: '32px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#1E40AF', marginBottom: '8px' }}>Explanation</p>
                        <p style={{ fontSize: '14px', color: '#1E3A8A', margin: 0, lineHeight: '1.6' }}>{currentQuestion.explanation}</p>
                    </motion.div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {!showResult ? (
                        <button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="btn btn-primary" style={{ background: selectedAnswer ? '#EF4444' : '#E5E7EB', color: selectedAnswer ? 'white' : '#9CA3AF' }}>
                            <Check size={18} /> Check Answer
                        </button>
                    ) : currentIndex < questions.length - 1 ? (
                        <button onClick={handleNext} className="btn btn-primary" style={{ background: '#EF4444' }}>
                            Next Question <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button onClick={handleNext} className="btn btn-primary" style={{ background: '#22C55E' }}>
                            <Award size={18} /> Final Submit
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Grammar Complete!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Great job practicing your grammar skills.</p>
                            
                            <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px' }}>
                                <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 4px' }}>Final Score</p>
                                <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#EF4444', margin: 0 }}>
                                    {scorePercent}%
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => { setShowCompletionTracker(false); handleReset(); }} className="btn btn-secondary">Retest Module</button>
                                <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary" style={{ background: '#EF4444' }}>Back to Dashboard</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ModuleLayout>
    )
}
