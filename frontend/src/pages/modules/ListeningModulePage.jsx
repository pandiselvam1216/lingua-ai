import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, ChevronLeft, Calendar, FileText, Activity, Check, X, ChevronRight, Award } from 'lucide-react'
import { Link } from 'react-router-dom'
import listeningService from '../../services/listeningService'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import AudioPlayer from '../../components/common/AudioPlayer'

const LISTENING_RULES = [
    "Listen to the audio clip carefully by clicking the Play button.",
    "You can pause or replay the audio as many times as you need.",
    "Read the question and select the best answer based on what you heard.",
    "Your score will be logged at the end of the session.",
    "Make sure your device volume is turned up!"
]

export default function ListeningModulePage() {
    // Shared State
    const [activeTab, setActiveTab] = useState('library') // 'library' or 'quiz'
    const [loading, setLoading] = useState(true)

    // Library State
    const [content, setContent] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)

    // Quiz State
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [showCompletionTracker, setShowCompletionTracker] = useState(false)
    const [completedQuestions, setCompletedQuestions] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_listening')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_listening', JSON.stringify(completedQuestions))
    }, [completedQuestions])

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            // Fetch library content
            const libraryData = await listeningService.getPublicContent()
            setContent(libraryData)
            if (libraryData.length > 0) setSelectedItem(libraryData[0])

            // Fetch quiz questions
            const quizData = await getModuleQuestions('listening')
            setQuestions(quizData)
        } catch (err) {
            console.error('Failed to fetch data:', err)
        }
        setLoading(false)
    }

    // Helper for playable audio URLs (from Listening.jsx)
    const getPlayableAudioUrl = (url, question = null) => {
        if (!url) {
            // Fallback: If no URL but we have content, we can use a generic TTS as a secondary backup
            if (question && question.content && !question.tts_config) {
                const safeText = encodeURIComponent(question.content.substring(0, 200));
                return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${safeText}`;
            }
            return null
        }
        
        // 1. Handle base64
        if (url.startsWith('data:')) return url
        if (url.length > 500 && !url.includes('http')) {
            // Likely raw base64 data without prefix
            return `data:audio/mp3;base64,${url}`
        }

        // 2. Handle Google Drive URLs
        const match1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
        if (match1) return `https://drive.google.com/uc?export=download&id=${match1[1]}`
        const match2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
        if (match2) return `https://drive.google.com/uc?export=download&id=${match2[1]}`
        
        return url
    }

    // Quiz Handlers
    const handleSelectAnswer = (value) => {
        if (showResult) return
        setSelectedAnswer(value)
    }

    const handleSubmitQuiz = async () => {
        if (!selectedAnswer) return

        const currentQuestion = questions[currentIndex]
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

    const handleNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedAnswer(null)
            setShowResult(false)
            setIsCorrect(false)
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%' }}></div>
            </div>
        )
    }

    const currentQuizQuestion = questions[currentIndex]

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'space-between', marginBottom: '32px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/dashboard" style={{
                        width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB',
                        color: '#6B7280', textDecoration: 'none'
                    }}>
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Listening Module</h1>
                        <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>Improve your comprehension with audio lessons and quizzes</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div style={{ marginLeft: 'auto', display: 'flex', backgroundColor: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <button
                        onClick={() => setActiveTab('library')}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600',
                            backgroundColor: activeTab === 'library' ? '#3B82F6' : 'transparent',
                            color: activeTab === 'library' ? 'white' : '#6B7280',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        Practice Library
                    </button>
                    <button
                        onClick={() => setActiveTab('quiz')}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600',
                            backgroundColor: activeTab === 'quiz' ? '#22C55E' : 'transparent',
                            color: activeTab === 'quiz' ? 'white' : '#6B7280',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        MCQ Quiz
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                {/* Main Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'library' ? (
                            selectedItem ? (
                                <motion.div
                                    key={selectedItem.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                        <span style={{ padding: '6px 12px', backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>Listening Passage</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                                            <Calendar size={14} /> {new Date(selectedItem.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '24px', lineHeight: '1.2' }}>{selectedItem.title}</h2>
                                    
                                    <div style={{ marginBottom: '40px' }}>
                                        <AudioPlayer 
                                            src={getPlayableAudioUrl(selectedItem.audio_url, selectedItem)} 
                                            ttsConfig={selectedItem.tts_config}
                                            text={selectedItem.content}
                                            title={selectedItem.title}
                                        />
                                    </div>

                                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '32px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={18} style={{ color: '#3B82F6' }} /> Passage Text
                                        </h3>
                                        <div style={{ fontSize: '17px', color: '#4B5563', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                            {selectedItem.content}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
                                    <Headphones size={64} style={{ opacity: 0.1, margin: '0 auto 20px' }} />
                                    <p>No episodes in your library yet.</p>
                                </div>
                            )
                        ) : (
                            /* MCQ Quiz View */
                            questions.length > 0 ? (
                                <motion.div
                                    key={`quiz-${currentIndex}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                >
                                    <AudioPlayer
                                        src={getPlayableAudioUrl(currentQuizQuestion.audio_data, currentQuizQuestion)}
                                        ttsConfig={currentQuizQuestion?.tts_config}
                                        text={currentQuizQuestion?.content}
                                        title={currentQuizQuestion?.title || 'Listening Exercise'}
                                    />

                                    <div style={{ padding: '0px', marginTop: '32px' }}>
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentQuizQuestion.title}</h2>
                                                <span style={{ padding: '4px 10px', backgroundColor: '#F0FDF4', color: '#166534', fontSize: '13px', borderRadius: '16px', fontWeight: '500' }}>
                                                    Question {currentIndex + 1}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}>
                                                {currentQuizQuestion.content}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                            {currentQuizQuestion?.options?.map((option, idx) => {
                                                const isSelected = selectedAnswer === option.value
                                                const isCorrectOption = option.value === currentQuizQuestion.correct_answer
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
                                                        {showResult && isCorrectOption && <Check size={20} style={{ color: '#166534' }} />}
                                                        {showResult && isSelected && !isCorrectOption && <X size={20} style={{ color: '#EF4444' }} />}
                                                    </button>
                                                )
                                            })}
                                        </div>

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

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            {!showResult ? (
                                                <button
                                                    onClick={handleSubmitQuiz}
                                                    disabled={!selectedAnswer}
                                                    className="btn btn-primary"
                                                    style={{ background: selectedAnswer ? undefined : '#E5E7EB', color: selectedAnswer ? undefined : '#9CA3AF' }}
                                                >
                                                    <Check size={18} /> Submit Answer
                                                </button>
                                            ) : currentIndex < questions.length - 1 ? (
                                                <button onClick={handleNextQuestion} className="btn btn-primary" style={{ background: '#3B82F6' }}>
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
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
                                    <Activity size={64} style={{ opacity: 0.1, margin: '0 auto 20px' }} />
                                    <p>No quiz questions available for this module yet.</p>
                                </div>
                            )
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar area - Contextual based on tab */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeTab === 'library' ? (
                                <><Activity size={18} style={{ color: '#3B82F6' }} /> Practice Library</>
                            ) : (
                                <><Activity size={18} style={{ color: '#22C55E' }} /> Quiz Progress</>
                            )}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeTab === 'library' ? (
                                content.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        style={{
                                            textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid',
                                            borderColor: selectedItem?.id === item.id ? '#3B82F6' : '#F3F4F6',
                                            backgroundColor: selectedItem?.id === item.id ? '#F0F9FF' : 'white',
                                            transition: 'all 0.2s', cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', color: selectedItem?.id === item.id ? '#1D4ED8' : '#374151', fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{selectedItem?.id === item.id ? 'Now listening' : 'Click to practice'}</div>
                                    </button>
                                ))
                            ) : (
                                /* Quiz Progress Bar for Sidebar */
                                <div style={{ padding: '8px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                        <span style={{ color: '#6B7280' }}>Questions Completed</span>
                                        <span style={{ fontWeight: '600' }}>{currentIndex + 1} / {questions.length}</span>
                                    </div>
                                    <div style={{ height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${((currentIndex + 1) / (questions.length || 1)) * 100}%`, 
                                            height: '100%', 
                                            backgroundColor: '#22C55E', 
                                            borderRadius: '4px',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
                                        <Award size={20} style={{ color: '#166534' }} />
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Current Score</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>{score.correct}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(activeTab === 'library' && content.length === 0) && <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>No practice sets available yet.</p>}
                        </div>
                    </div>

                    <div style={{ 
                        background: activeTab === 'library' 
                            ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' 
                            : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
                        borderRadius: '20px', padding: '24px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                    }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700' }}>{activeTab === 'library' ? 'Top Tip! 💡' : 'Keep going! 🚀'}</h4>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
                            {activeTab === 'library' 
                                ? 'Try listening to the audio first without reading the passage to improve your active listening skills.'
                                : 'Consistency is key. Try to complete the full quiz to test your comprehension of different topics.'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Quiz Complete!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Final score: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => window.location.reload()} className="btn btn-secondary">Retest</button>
                                <button onClick={() => window.location.href = '/dashboard'} className="btn btn-primary">Dashboard</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
