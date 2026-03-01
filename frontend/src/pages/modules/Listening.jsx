import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Pause, Volume2, VolumeX, Check, X, ChevronRight, Award } from 'lucide-react'
import { getModuleQuestions } from '../../services/questionService'

export default function Listening() {
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [showResult, setShowResult] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [loading, setLoading] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [isMuted, setIsMuted] = useState(false)
    const audioRef = useRef(null)

    useEffect(() => {
        fetchQuestions()
    }, [])

    // Sync mute state with audio element
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted
    }, [isMuted])

    // When question changes, reset audio
    useEffect(() => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        setDuration(0)
    }, [currentIndex])

    const fetchQuestions = async () => {
        try {
            const questions = await getModuleQuestions('listening')
            setQuestions(questions)
        } catch (error) {
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }

    const currentQuestion = questions[currentIndex]

    const handlePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleAudioTimeUpdate = () => {
        const audio = audioRef.current
        if (!audio) return
        setCurrentTime(audio.currentTime)
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }

    const handleAudioLoaded = () => {
        const audio = audioRef.current
        if (!audio) return
        setDuration(audio.duration)
    }

    const handleAudioEnded = () => {
        setIsPlaying(false)
        setProgress(100)
    }

    const handleSelectAnswer = (value) => {
        if (showResult) return
        setSelectedAnswer(value)
    }

    const handleSubmit = async () => {
        if (!selectedAnswer) return

        const correct = selectedAnswer === currentQuestion.correct_answer
        setIsCorrect(correct)
        setShowResult(true)
        setScore(prev => ({
            correct: prev.correct + (correct ? 1 : 0),
            total: prev.total + 1
        }))

        // Score tracked locally — no backend submission needed
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedAnswer(null)
            setShowResult(false)
            setProgress(0)
            setCurrentTime(0)
            setIsPlaying(false)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            }
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
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
                    borderTop: '4px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    if (!questions.length) {
        return (
            <div style={{ padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Headphones size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>No listening exercises available</h3>
                    <p style={{ color: '#6B7280', marginTop: '8px' }}>Check back later for new content.</p>
                </div>
            </div>
        )
    }

    const questionProgress = ((currentIndex + 1) / questions.length) * 100

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
                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Headphones size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Listening Practice
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                            Improve your audio comprehension skills
                        </p>
                    </div>
                </div>

                {/* Score */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Award size={24} style={{ color: '#F59E0B' }} />
                    <div>
                        <p style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            {score.correct}/{score.total}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>Correct</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span style={{ fontSize: '14px', color: '#6B7280' }}>
                        {Math.round(questionProgress)}%
                    </span>
                </div>
                <div style={{
                    height: '6px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                    <motion.div
                        animate={{ width: `${questionProgress}%` }}
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                            borderRadius: '3px',
                        }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
            >
                {/* Audio Player */}
                <div style={{
                    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                    padding: '32px',
                }}>
                    {/* Hidden real audio element */}
                    {currentQuestion.audio_data && (
                        <audio
                            ref={audioRef}
                            src={currentQuestion.audio_data}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onLoadedMetadata={handleAudioLoaded}
                            onEnded={handleAudioEnded}
                            muted={isMuted}
                        />
                    )}

                    {/* Track label */}
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '16px', margin: '0 0 16px' }}>
                        {currentQuestion.audio_data ? '🎵 ' + (currentQuestion.title || 'Listening Exercise') : '📝 Read the passage below carefully'}
                    </p>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        marginBottom: '24px',
                    }}>
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            disabled={!currentQuestion.audio_data}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                cursor: currentQuestion.audio_data ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                opacity: currentQuestion.audio_data ? 1 : 0.4,
                            }}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        <motion.button
                            onClick={handlePlayPause}
                            disabled={!currentQuestion.audio_data}
                            whileHover={currentQuestion.audio_data ? { scale: 1.05 } : {}}
                            whileTap={currentQuestion.audio_data ? { scale: 0.95 } : {}}
                            style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'white',
                                cursor: currentQuestion.audio_data ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                                opacity: currentQuestion.audio_data ? 1 : 0.5,
                            }}
                        >
                            {isPlaying ? (
                                <Pause size={32} style={{ color: '#1E40AF' }} />
                            ) : (
                                <Play size={32} style={{ color: '#1E40AF', marginLeft: '4px' }} />
                            )}
                        </motion.button>

                        <div style={{ width: '48px' }} />
                    </div>

                    {/* Progress Slider */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{
                            height: '6px',
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                        }}>
                            <motion.div
                                animate={{ width: `${progress}%` }}
                                style={{
                                    height: '100%',
                                    backgroundColor: 'white',
                                    borderRadius: '3px',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '13px',
                    }}>
                        <span>{formatTime(currentTime)}</span>
                        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
                    </div>
                </div>

                {/* Question Content */}
                <div style={{ padding: '32px' }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '8px',
                    }}>
                        {currentQuestion.title}
                    </h3>
                    <p style={{
                        fontSize: '15px',
                        color: '#6B7280',
                        marginBottom: '24px',
                    }}>
                        {currentQuestion.content}
                    </p>

                    {/* Answer Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {currentQuestion.options?.map((option, idx) => {
                            const isSelected = selectedAnswer === option.value
                            const isCorrectOption = option.value === currentQuestion.correct_answer
                            const showCorrect = showResult && isCorrectOption
                            const showWrong = showResult && isSelected && !isCorrectOption

                            return (
                                <motion.button
                                    key={idx}
                                    onClick={() => handleSelectAnswer(option.value)}
                                    whileHover={!showResult ? { scale: 1.01, x: 4 } : {}}
                                    style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        border: '2px solid',
                                        borderColor: showCorrect ? '#22C55E'
                                            : showWrong ? '#EF4444'
                                                : isSelected ? '#3B82F6'
                                                    : '#E5E7EB',
                                        backgroundColor: showCorrect ? '#F0FDF4'
                                            : showWrong ? '#FEF2F2'
                                                : isSelected ? '#EFF6FF'
                                                    : 'white',
                                        cursor: showResult ? 'default' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <span style={{
                                        fontSize: '15px',
                                        fontWeight: isSelected ? '500' : '400',
                                        color: '#1F2937',
                                    }}>
                                        {option.text}
                                    </span>
                                    {showResult && (
                                        <>
                                            {showCorrect && <Check size={20} style={{ color: '#22C55E' }} />}
                                            {showWrong && <X size={20} style={{ color: '#EF4444' }} />}
                                        </>
                                    )}
                                </motion.button>
                            )
                        })}
                    </div>

                    {/* Result Feedback */}
                    <AnimatePresence>
                        {showResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    backgroundColor: isCorrect ? '#F0FDF4' : '#FEF2F2',
                                    borderLeft: `4px solid ${isCorrect ? '#22C55E' : '#EF4444'}`,
                                    marginBottom: '24px',
                                }}
                            >
                                <p style={{
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    color: isCorrect ? '#166534' : '#991B1B',
                                    margin: 0,
                                }}>
                                    {isCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect. The right answer is highlighted above.'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        {!showResult ? (
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedAnswer}
                                style={{
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: selectedAnswer
                                        ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                                        : '#E5E7EB',
                                    color: selectedAnswer ? 'white' : '#9CA3AF',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: selectedAnswer ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none',
                                }}
                            >
                                <Check size={18} />
                                Submit Answer
                            </button>
                        ) : currentIndex < questions.length - 1 && (
                            <button
                                onClick={handleNext}
                                style={{
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                }}
                            >
                                Next Question
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
