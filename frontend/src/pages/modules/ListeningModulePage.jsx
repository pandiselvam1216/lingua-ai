import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Headphones, ChevronLeft, Calendar, FileText, Activity, Check, X, 
    ChevronRight, Award, MessagesSquare, Mic2, GraduationCap, BookOpen, 
    Newspaper, ListChecks, Mic, Users, Presentation, Radio, Lightbulb, 
    Search, Smile, LayoutGrid
} from 'lucide-react'
import { Link } from 'react-router-dom'
import listeningService from '../../services/listeningService'
import { getModuleQuestions } from '../../services/questionService'
import { saveModuleScore } from '../../utils/localScoring'
import AudioPlayer from '../../components/common/AudioPlayer'

const LISTENING_CATEGORIES = [
    { id: 'conversations', name: 'Conversations', icon: MessagesSquare, description: 'Social dialogues and turn-taking', color: '#6366F1' },
    { id: 'speeches', name: 'Speeches', icon: Mic2, description: 'Rhetoric and public address', color: '#8B5CF6' },
    { id: 'lectures', name: 'Lectures', icon: GraduationCap, description: 'Academic comprehension', color: '#EC4899' },
    { id: 'stories', name: 'Stories', icon: BookOpen, description: 'Narrative sequence tracking', color: '#3B82F6' },
    { id: 'news', name: 'News', icon: Newspaper, description: 'Fast-paced factual reporting', color: '#10B981' },
    { id: 'instructions', name: 'Instructions', icon: ListChecks, description: 'Procedural language', color: '#F59E0B' },
    { id: 'interviews', name: 'Interviews', icon: Mic, description: 'Q&A and investigative dialogue', color: '#EF4444' },
    { id: 'discussions', name: 'Discussions', icon: Users, description: 'Multi-speaker viewpoints', color: '#06B6D4' },
    { id: 'presentations', name: 'Presentations', icon: Presentation, description: 'Data explanation samples', color: '#8B5CF6' },
    { id: 'podcasts', name: 'Podcasts', icon: Radio, description: 'Episodic conversational flow', color: '#6366F1' },
    { id: 'main-ideas', name: 'Main Ideas', icon: Lightbulb, description: 'Gist and high-level synthesis', color: '#F59E0B' },
    { id: 'specific-details', name: 'Specific Details', icon: Search, description: 'Scanning for granular facts', color: '#3B82F6' },
    { id: 'tone-emotion', name: 'Tone & Emotion', icon: Smile, description: 'Subtext and emotional states', color: '#EC4899' },
    { id: 'inference', name: 'Inference', icon: Lightbulb, description: 'Logic and implied meanings', color: '#8B5CF6' }
]

const LISTENING_RULES = [
    "Listen to the audio clip carefully by clicking the Play button.",
    "You can pause or replay the audio as many times as you need.",
    "Read the question and select the best answer based on what you heard.",
    "Your score will be logged at the end of the session.",
    "Make sure your device volume is turned up!"
]

export default function ListeningModulePage() {
    // Shared State
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [loading, setLoading] = useState(false)

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
        if (selectedCategory) {
            fetchCategoryData(selectedCategory.id)
        }
    }, [selectedCategory])

    const fetchCategoryData = async (categoryId) => {
        setLoading(true)
        try {
            // Fetch library content
            const libraryData = await listeningService.getPublicContent()
            const filteredLibrary = libraryData.filter(item => 
                (item.category || '').toLowerCase() === categoryId.toLowerCase()
            )
            setContent(filteredLibrary)
            if (filteredLibrary.length > 0) setSelectedItem(filteredLibrary[0])
            else setSelectedItem(null)

            // Fetch quiz questions
            const quizData = await getModuleQuestions('listening')
            const filteredQuiz = quizData.filter(q => 
                (q.category || '').toLowerCase() === categoryId.toLowerCase()
            )
            setQuestions(filteredQuiz)
            setCurrentIndex(0)
            setScore({ correct: 0, total: 0 })
            setShowResult(false)
            setSelectedAnswer(null)
        } catch (err) {
            console.error('Failed to fetch data:', err)
        }
        setLoading(false)
    }

    // Helper for playable audio URLs
    const getPlayableAudioUrl = (url, question = null) => {
        if (!url) {
            if (question && (question.content || question.passage_text) && !question.tts_config) {
                const textToSpeak = question.passage_text || question.content;
                const safeText = encodeURIComponent(textToSpeak.substring(0, 200));
                return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${safeText}`;
            }
            return null
        }
        if (url.startsWith('data:')) return url
        if (url.length > 500 && !url.includes('http')) return `data:audio/mp3;base64,${url}`
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
        const currentQuestion = filteredQuestions[currentIndex]
        const correct = String(selectedAnswer).trim().toLowerCase() === String(currentQuestion.correct_answer).trim().toLowerCase()
        setIsCorrect(correct)
        setShowResult(true)
        setScore(prev => {
            const newScore = {
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1
            }
            if (currentIndex === filteredQuestions.length - 1) {
                const finalPercent = Math.round((newScore.correct / newScore.total) * 100)
                saveModuleScore('listening', finalPercent, newScore.total * 60)
            }
            return newScore
        })
        if (correct && !completedQuestions.includes(currentQuestion.id)) {
            setCompletedQuestions(prev => [...prev, currentQuestion.id])
        }
    }

    const handleNextQuestion = () => {
        if (currentIndex < filteredQuestions.length - 1) {
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

    const filteredQuestions = selectedItem 
        ? questions.filter(q => q.listening_module_id === selectedItem.id)
        : questions.filter(q => !q.listening_module_id)

    const currentQuizQuestion = filteredQuestions[currentIndex]

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
            {!selectedCategory ? (
                /* Category Selection Grid */
                <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <Link to="/dashboard" style={{
                                width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB',
                                color: '#6B7280', textDecoration: 'none'
                            }}>
                                <ChevronLeft size={20} />
                            </Link>
                            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>Listening Categories</h1>
                        </div>
                        <p style={{ color: '#6B7280', margin: 0, fontSize: '15px' }}>Master specialized listening skills</p>
                    </div>

                    <div className="grid-3col">
                        {LISTENING_CATEGORIES.map((cat) => {
                            const Icon = cat.icon
                            return (
                                <motion.button
                                    key={cat.id}
                                    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        textAlign: 'left', padding: '24px', borderRadius: '24px', backgroundColor: 'white',
                                        border: '1px solid #F3F4F6', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', flexDirection: 'column', gap: '16px'
                                    }}
                                >
                                    <div style={{ 
                                        width: '48px', height: '48px', borderRadius: '14px', 
                                        backgroundColor: `${cat.color}15`, color: cat.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>{cat.name}</h3>
                                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.4' }}>{cat.description}</p>
                                    </div>
                                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: cat.color }}>
                                        Start Practice <ChevronRight size={16} />
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* Main Practice View */
                <>
                    {/* Header */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: '32px', 
                        width: '100%',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB',
                                    color: '#6B7280', cursor: 'pointer'
                                }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>{selectedCategory.name}</h1>
                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', backgroundColor: '#EDE9FE', color: '#7C3AED', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Listening Practice
                                    </span>
                                </div>
                                <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>{selectedCategory.description}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '32px' }}>
                        {/* Main Content Area - MCQ Quiz */}
                        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <AnimatePresence mode="wait">
                                {filteredQuestions.length > 0 ? (
                                    <motion.div
                                        key={`${selectedItem?.id || 'all'}-${currentIndex}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    >
                                        <div style={{ marginBottom: '32px' }}>
                                            <AudioPlayer
                                                src={getPlayableAudioUrl(selectedItem?.audio_url || currentQuizQuestion?.media_url, selectedItem || currentQuizQuestion)}
                                                ttsConfig={selectedItem?.tts_config || currentQuizQuestion?.tts_config}
                                                text={selectedItem?.content || currentQuizQuestion?.passage_text}
                                                title={selectedItem?.title || currentQuizQuestion?.title || 'Listening Exercise'}
                                            />
                                        </div>

                                        <div style={{ padding: '0px', marginTop: '32px' }}>
                                            <div style={{ marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                    <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentQuizQuestion?.title || 'Question'}</h2>
                                                    <span style={{ padding: '4px 10px', backgroundColor: '#F0FDF4', color: '#166534', fontSize: '13px', borderRadius: '16px', fontWeight: '500' }}>
                                                        Question {currentIndex + 1} of {filteredQuestions.length}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}>
                                                    {currentQuizQuestion?.content}
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
                                                            <span style={{ 
                                                                width: '24px', height: '24px', borderRadius: '6px', 
                                                                backgroundColor: isSelected ? 'currentColor' : '#F3F4F6',
                                                                color: isSelected ? 'white' : '#6B7280',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '12px', fontWeight: '700'
                                                            }}>
                                                                {option.value}
                                                            </span>
                                                            <span>{option.text}</span>
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
                                                        <p style={{ fontSize: '15px', fontWeight: '600', color: isCorrect ? '#166534' : '#991B1B', margin: '0 0 4px' }}>
                                                            {isCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect.'}
                                                        </p>
                                                        <p style={{ fontSize: '14px', color: '#4B5563', margin: 0 }}>
                                                            {currentQuizQuestion?.explanation || 'The right answer is highlighted above.'}
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
                                                ) : currentIndex < filteredQuestions.length - 1 ? (
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
                                    <motion.div
                                        key="no-mcq-found"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        style={{ backgroundColor: 'white', borderRadius: '24px', padding: '60px', textAlign: 'center', color: '#9CA3AF' }}
                                    >
                                        <Activity size={64} style={{ opacity: 0.1, margin: '0 auto 20px' }} />
                                        <h3 style={{ color: '#374151', marginBottom: '8px' }}>No MCQ found</h3>
                                        <p>We are still adding questions for the <b>{selectedCategory.name}</b> category.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sidebar area */}
                        <div style={{ flex: '1 1 300px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Topic Selection */}
                            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LayoutGrid size={18} style={{ color: '#3B82F6' }} /> Select Topic
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Topic Items */}
                                    {content.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setCurrentIndex(0);
                                                setSelectedAnswer(null);
                                                setShowResult(false);
                                            }}
                                            style={{
                                                textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid',
                                                borderColor: selectedItem?.id === item.id ? '#3B82F6' : '#F3F4F6',
                                                backgroundColor: selectedItem?.id === item.id ? '#F0F9FF' : 'white',
                                                transition: 'all 0.2s', cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', color: selectedItem?.id === item.id ? '#1D4ED8' : '#374151', fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{selectedItem?.id === item.id ? 'Active Topic' : 'Select topic'}</div>
                                        </button>
                                    ))}

                                    {/* Unlinked / General Practice Item */}
                                    {questions.filter(q => !q.listening_module_id).length > 0 && (
                                        <button
                                            onClick={() => {
                                                setSelectedItem(null); 
                                                setCurrentIndex(0);
                                                setSelectedAnswer(null);
                                                setShowResult(false);
                                            }}
                                            style={{
                                                textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid',
                                                borderColor: selectedItem === null ? '#8B5CF6' : '#F3F4F6',
                                                backgroundColor: selectedItem === null ? '#F5F3FF' : 'white',
                                                transition: 'all 0.2s', cursor: 'pointer',
                                                marginTop: content.length > 0 ? '8px' : '0',
                                                borderStyle: 'dashed'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', color: selectedItem === null ? '#7C3AED' : '#374151', fontSize: '14px', marginBottom: '4px' }}>General Practice</div>
                                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Questions without specific audio</div>
                                        </button>
                                    )}

                                    {content.length === 0 && (questions.filter(q => !q.listening_module_id).length === 0) && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', padding: '20px' }}>No specific topics available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Progress Card */}
                            <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} style={{ color: '#22C55E' }} /> Progress
                                </h3>
                                {filteredQuestions.length > 0 ? (
                                    <div style={{ padding: '8px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                            <span style={{ color: '#6B7280' }}>Progress</span>
                                            <span style={{ fontWeight: '600' }}>{currentIndex + 1} / {filteredQuestions.length}</span>
                                        </div>
                                        <div style={{ height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${((currentIndex + 1) / (filteredQuestions.length || 1)) * 100}%`, 
                                                height: '100%', 
                                                backgroundColor: '#22C55E', 
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
                                            <Award size={20} style={{ color: '#166534' }} />
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Correct</div>
                                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>{score.correct}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>No quiz data yet.</p>
                                )}
                            </div>

                            <div style={{ 
                                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
                                borderRadius: '20px', padding: '24px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                            }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700' }}>Quick Tip</h4>
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
                                    Listen carefully to nuances in tone and specific keywords. You can replay the audio as many times as you need.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Completion Popup */}
            <AnimatePresence>
                {showCompletionTracker && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '32px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Award size={40} />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Session Complete!</h2>
                            <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>Final score: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                <button onClick={() => { setShowCompletionTracker(false); setCurrentIndex(0); setScore({correct: 0, total: 0}); setShowResult(false); }} className="btn btn-secondary">Try Again</button>
                                <button onClick={() => setSelectedCategory(null)} className="btn btn-primary">Choose Another Category</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
