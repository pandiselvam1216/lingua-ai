import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Check, X, ChevronRight, Award } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleLayout from '../../components/common/ModuleLayout'
import AudioPlayer from '../../components/common/AudioPlayer'

const LISTENING_RULES = [
    "Listen to the audio clip carefully by clicking the Play button.",
    "You can pause or replay the audio as many times as you need.",
    "Read the question and select the best answer based on what you heard.",
    "Your score will be logged at the end of the session.",
    "Make sure your device volume is turned up!"
]

export default function Listening() {
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [loading, setLoading] = useState(true)
    const [showRules, setShowRules] = useState(false)
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)
    const [completedQuestions, setCompletedQuestions] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_listening')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_listening', JSON.stringify(completedQuestions))
    }, [completedQuestions])

    useEffect(() => {
        fetchQuestions()
    }, [])

    const fetchQuestions = async () => {
        try {
            const data = await getModuleQuestions('listening')
            setQuestions(data)
        } catch (error) {
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }

    // Convert Google Drive sharing links to direct download URLs
    const getPlayableAudioUrl = (url) => {
        if (!url) return null
        if (url.startsWith('data:')) return url
        const match1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
        if (match1) return `https://drive.google.com/uc?export=download&id=${match1[1]}`
        const match2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
        if (match2) return `https://drive.google.com/uc?export=download&id=${match2[1]}`
        return url
    }

    const currentQuestion = questions[currentIndex]
    const audioSrc = currentQuestion ? getPlayableAudioUrl(currentQuestion.audio_data) : null

    const handleSelectAnswer = (value) => {
        if (showResult) return
        setSelectedAnswer(value)
    }

    const handleSubmit = async () => {
        if (!selectedAnswer) return

        const correct = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
        setIsCorrect(correct)
        setShowResult(true)
        setScore(prev => {
            const newScore = {
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1
            }
            if (currentIndex === questions.length - 1) {
                const finalPercent = Math.round((newScore.correct / newScore.total) * 100)
                saveModuleScore('listening', finalPercent, newScore.total * 60)
            }
            return newScore
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
            setIsCorrect(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #22C55E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <ModuleLayout
            icon={Headphones}
            iconColor="#22C55E"
            iconBgBase="#22C55E"
            iconBgHover="#166534"
            title="Listening Practice"
            description="Improve your audio comprehension skills"
            score={score.correct}
            totalScore={score.total}
            questions={questions}
            currentIndex={currentIndex}
            completedQuestions={completedQuestions}
            onSelectQuestion={(idx) => {
                setCurrentIndex(idx)
                setSelectedAnswer(null)
                setShowResult(false)
            }}
            showRules={showRules}
            onShowRules={() => setShowRules(true)}
            onCloseRules={() => setShowRules(false)}
            rulesList={LISTENING_RULES}
        >
            {/* Audio Player Component */}
            <motion.div
                key={`audio-${currentIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
            >
                <AudioPlayer
                    src={audioSrc}
                    title={currentQuestion?.title || 'Listening Exercise'}
                />

                <div style={{ padding: '32px' }}>
                    {currentQuestion && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentQuestion.title}</h2>
                                <span style={{ padding: '4px 10px', backgroundColor: '#F0FDF4', color: '#166534', fontSize: '13px', borderRadius: '16px', fontWeight: '500' }}>
                                    Question {currentIndex + 1}
                                </span>
                            </div>
                            <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}>
                                {currentQuestion.content}
                            </p>
                        </div>
                    )}

                    {/* Options List utilizing index.css answer-option classes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {currentQuestion?.options?.map((option, idx) => {
                            const isSelected = selectedAnswer === option.value
                            const isCorrectOption = option.value === currentQuestion.correct_answer
                            let stateClass = ''
                            if (showResult) {
                                if (isCorrectOption) stateClass = 'correct'
                                else if (isSelected) stateClass = 'wrong'
                            } else if (isSelected) {
                                stateClass = 'selected'
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectAnswer(option.value)}
                                    disabled={showResult}
                                    className={`answer-option ${stateClass}`}
                                >
                                    <span>{option.text}</span>
                                    {showResult && isCorrectOption && <Check size={20} className="text-green-600" />}
                                    {showResult && isSelected && !isCorrectOption && <X size={20} className="text-red-500" />}
                                </button>
                            )
                        })}
                    </div>

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {showResult && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    backgroundColor: isCorrect ? '#F0FDF4' : '#FEF2F2',
                                    borderLeft: `4px solid ${isCorrect ? '#22C55E' : '#EF4444'}`,
                                    marginBottom: '24px',
                                }}
                            >
                                <p style={{ fontSize: '15px', fontWeight: '600', color: isCorrect ? '#166534' : '#991B1B', margin: 0 }}>
                                    {isCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect. The right answer is highlighted above.'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions utilizing btn- classes */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        {!showResult ? (
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedAnswer}
                                className="btn btn-primary"
                                style={{ background: selectedAnswer ? undefined : '#E5E7EB', color: selectedAnswer ? undefined : '#9CA3AF' }}
                            >
                                <Check size={18} /> Submit Answer
                            </button>
                        ) : currentIndex < questions.length - 1 ? (
                            <button onClick={handleNext} className="btn btn-primary">
                                Next Question <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button onClick={() => setShowCompletionTracker(true)} className="btn btn-primary" style={{ background: '#22C55E' }}>
                                <Award size={18} /> Final Submit
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Module Complete!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Final score: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => window.location.reload()} className="btn btn-secondary">Retest</button>
                                <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary">Dashboard</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ModuleLayout>
    )
}
