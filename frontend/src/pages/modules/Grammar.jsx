import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Star, Check, X, ChevronRight, Award, RotateCcw, Clock, Type, MapPin, Link, User, Sparkles, ChevronLeft, ArrowLeft } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'
import useSyncUpdate from '../../hooks/useSyncUpdate'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleLayout from '../../components/common/ModuleLayout'

const GRAMMAR_RULES = [
    "Read each sentence carefully and identify the grammatical error or the best completion.",
    "Select the single best answer from the options provided.",
    "You can retry an exercise at any time during the session, but your first attempt defines your score.",
    "Your score will be saved automatically once you complete all exercises in the session.",
    "Pay special attention to verb tense, subject-verb agreement, and proper preposition usage."
]

const SUBMODULES = [
    { id: 'tense', title: 'Tense', icon: Clock, desc: 'Master past, present, and future tenses.', color: '#EF4444', bg: '#FEF2F2' },
    { id: 'articles', title: 'Articles', icon: Type, desc: 'Learn to use A, An, and The correctly.', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'prepositions', title: 'Prepositions', icon: MapPin, desc: 'Practice time and place prepositions.', color: '#10B981', bg: '#ECFDF5' },
    { id: 'conjunction', title: 'Conjunction', icon: Link, desc: 'Connect ideas with the right conjunctions.', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'pronoun', title: 'Pronoun', icon: User, desc: 'Use personal and relative pronouns.', color: '#EC4899', bg: '#FDF2F8' },
    { id: 'modal_verbs', title: 'Modal Verbs', icon: Sparkles, desc: 'Master Can, Should, and Must.', color: '#F59E0B', bg: '#FFFBEB' }
]

export default function Grammar() {
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [loading, setLoading] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [showRules, setShowRules] = useState(false)
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)

    const [completedQuestions, setCompletedQuestions] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_grammar')
        return saved ? JSON.parse(saved) : []
    })

    const [activeSubmodule, setActiveSubmodule] = useState(null)

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_grammar', JSON.stringify(completedQuestions))
    }, [completedQuestions])

    useEffect(() => {
        if (activeSubmodule) fetchQuestions()
    }, [activeSubmodule])
    
    // Subscribe to live updates using custom hook
    useSyncUpdate('grammar', fetchQuestions)

    async function fetchQuestions() {
        try {
            setLoading(true)
            const data = await getModuleQuestions('grammar')
            // Filter questions by active submodule
            const filtered = data.filter(q => {
               const qSub = (q.sub_module || '').toLowerCase()
               const activeSub = (activeSubmodule || '').toLowerCase()
               return (qSub === activeSub) || (!qSub && activeSub === 'tense')
            })
            setQuestions(filtered)
            setCurrentIndex(0) // Ensure we start fresh on category change
        } catch (error) {
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : null
    const scorePercent = questions && questions.length > 0 ? Math.round((score.correct / questions.length) * 100) : 0

    const handleCheckAnswer = () => {
        if (!selectedAnswer || showResult) return

        const isCorrect = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
        setShowResult(true)

        setScore(prev => {
            // Only add to score if it's the first time we're answering this question correctly
            const alreadyCorrect = completedQuestions.includes(currentQuestion.id)
            if (alreadyCorrect) return prev
            
            const newScore = { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }
            if (currentIndex === questions.length - 1) {
                const finalPercent = Math.round((newScore.correct / questions.length) * 100)
                saveModuleScore('grammar', finalPercent, questions.length * 60)
            }
            return newScore
        })

        if (isCorrect && !completedQuestions.includes(currentQuestion.id)) {
            setCompletedQuestions(prev => [...prev, currentQuestion.id])
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
    }

    if (!activeSubmodule) {
        return (
            <div className="page-container" style={{ padding: '24px 16px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        style={{
                            width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white',
                            border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#6B7280', transition: 'all 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontWeight: '800', color: '#111827', margin: 0 }}>Grammar Categories</h1>
                        <p style={{ color: '#6B7280', margin: '4px 0 0', fontSize: '15px' }}>Topic-wise practice</p>
                    </div>
                </div>

                {/* Submodules Grid */}
                <div className="grid-3col">
                    {SUBMODULES.map((sub, idx) => (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => {
                                setActiveSubmodule(sub.id)
                                handleReset()
                            }}
                            className="card"
                            style={{
                                borderRadius: '20px',
                                padding: '24px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            whileHover={{
                                y: -10,
                                backgroundColor: sub.bg,
                                borderColor: `${sub.color}30`,
                                boxShadow: `0 20px 25px -5px ${sub.color}15`
                            }}
                        >
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <sub.icon size={24} color={sub.color} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{sub.title}</h2>
                                    <p style={{ color: '#6B7280', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>{sub.desc}</p>
                                </div>
                                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: sub.color, fontSize: '16px', fontWeight: '600' }}>
                                    Start Practice <ChevronRight size={18} />
                                </div>
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
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #EF4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    const currentSubmodule = SUBMODULES.find(s => s.id === activeSubmodule)

    return (
        <ModuleLayout
            icon={currentSubmodule?.icon || CheckSquare}
            iconColor={currentSubmodule?.color || "#EF4444"}
            iconBgBase={currentSubmodule?.color || "#EF4444"}
            iconBgHover={currentSubmodule?.color || "#DC2626"}
            title={currentSubmodule?.title ? `Grammar: ${currentSubmodule.title}` : "Grammar Practice"}
            description={currentSubmodule?.desc || "Master English grammar rules with interactive exercises"}
            score={score.correct}
            totalScore={questions.length}
            scoreDisplay={`${score.correct}/${questions.length} (${Math.round((score.correct / questions.length) * 100) || 0}%)`}
            questions={questions}
            currentIndex={currentIndex}
            completedQuestions={questions ? questions.map((q, i) => (Array.isArray(completedQuestions) && completedQuestions.includes(q.id)) ? i : null).filter(x => x !== null) : []}
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
            onBack={() => setActiveSubmodule(null)}
        >
            <motion.div key={activeSubmodule + '-' + currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
                
                {/* Back Link */}
                <div style={{ marginBottom: '24px' }}>
                    <button
                        onClick={() => setActiveSubmodule(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', color: '#4B5563', fontSize: '14px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <ArrowLeft size={16} /> Back to Categories
                    </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                        Difficulty: {currentQuestion?.difficulty === 1 ? 'Easy' : currentQuestion?.difficulty === 2 ? 'Medium' : 'Hard'}
                    </span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', lineHeight: '1.6' }}>
                    {currentQuestion?.content}
                </h2>

                <div className="grid-2col" style={{ marginBottom: '24px' }}>
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
                                <div className="option-indicator">
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
                        <button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="btn btn-primary btn-submit" style={{ background: selectedAnswer ? undefined : '#E5E7EB', color: selectedAnswer ? 'white' : '#9CA3AF' }}>
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
