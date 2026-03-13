import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, BookmarkPlus, Volume2, Trash2, Book,
    Sparkles, ArrowRight, BookmarkCheck, X, Dumbbell,
    ChevronRight, ChevronLeft, Check, RotateCcw, Trophy,
    Zap, PenLine, Brain, CheckCircle, Info
} from 'lucide-react'
import api from '../../services/api'
import { saveModuleScore } from '../../utils/localScoring'
import ModuleRulesModal from '../../components/common/ModuleRulesModal'

// ─── Utility ────────────────────────────────────────────────────────────────
function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// ─── Trainer Sub-components ──────────────────────────────────────────────────

function ModeCard({ icon, title, description, color, onClick, isCompleted }) {
    return (
        <motion.button
            whileHover={{ y: -6, boxShadow: `0 20px 40px ${color}30` }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            style={{
                background: 'white',
                border: `2px solid ${color}30`,
                borderRadius: '20px',
                padding: '32px 28px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s',
                position: 'relative'
            }}
        >
            <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: `0 8px 20px ${color}40`
            }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {title}
                {isCompleted && <CheckCircle size={18} style={{ color: '#22C55E' }} />}
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>{description}</p>
            <div style={{
                marginTop: '20px', display: 'flex', alignItems: 'center',
                gap: '6px', color, fontWeight: '600', fontSize: '14px'
            }}>
                Start <ChevronRight size={16} />
            </div>
        </motion.button>
    )
}

// ── Flashcard Mode ────────────────────────────────────────────────────────────
function FlashcardMode({ words, onFinish }) {
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [results, setResults] = useState([]) // 'know' | 'learn'
    const [done, setDone] = useState(false)

    const card = words[index]

    const handleResult = (type) => {
        const updated = [...results, type]
        setResults(updated)
        setFlipped(false)
        if (index + 1 >= words.length) {
            setTimeout(() => {
                setDone(true)
                const know = updated.filter(r => r === 'know').length
                saveModuleScore('vocabulary', Math.round((know / words.length) * 100), words.length * 10)
            }, 300)
        } else {
            setTimeout(() => setIndex(index + 1), 200)
        }
    }

    if (done) {
        const know = results.filter(r => r === 'know').length
        return <SummaryScreen score={know} total={words.length} onRetry={() => { setIndex(0); setResults([]); setFlipped(false); setDone(false) }} onHome={onFinish} />
    }

    const progress = (index / words.length) * 100

    return (
        <div>
            {/* Progress */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>
                        Card {index + 1} of {words.length}
                    </span>
                    <span style={{ fontSize: '14px', color: '#8B5CF6', fontWeight: '600' }}>
                        {results.filter(r => r === 'know').length} known ✓
                    </span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#E5E7EB', overflow: 'hidden' }}>
                    <motion.div
                        style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                    />
                </div>
            </div>

            {/* Card flip */}
            <div
                onClick={() => setFlipped(!flipped)}
                style={{ perspective: '1000px', cursor: 'pointer', marginBottom: '28px' }}
            >
                <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
                    style={{ position: 'relative', transformStyle: 'preserve-3d', height: '260px' }}
                >
                    {/* Front */}
                    <div style={{
                        position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                        borderRadius: '24px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 60px rgba(139,92,246,0.3)'
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500', marginBottom: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Word</p>
                        <h2 style={{ color: 'white', fontSize: '48px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                            {card.word}
                        </h2>
                        {card.part_of_speech && (
                            <span style={{
                                marginTop: '16px', padding: '4px 14px', borderRadius: '99px',
                                background: 'rgba(255,255,255,0.2)', color: 'white',
                                fontSize: '13px', fontWeight: '500'
                            }}>{card.part_of_speech}</span>
                        )}
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '24px' }}>
                            Tap to flip
                        </p>
                    </div>
                    {/* Back */}
                    <div style={{
                        position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'white', borderRadius: '24px',
                        border: '2px solid #EDE9FE',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '32px',
                        boxShadow: '0 20px 60px rgba(139,92,246,0.15)'
                    }}>
                        <p style={{ color: '#8B5CF6', fontSize: '13px', fontWeight: '600', marginBottom: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Definition</p>
                        <p style={{ color: '#1F2937', fontSize: '18px', lineHeight: '1.6', textAlign: 'center', margin: 0, fontWeight: '500' }}>
                            {card.definition || 'No definition saved.'}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Action buttons — only show when flipped */}
            <AnimatePresence>
                {flipped && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        style={{ display: 'flex', gap: '16px' }}
                    >
                        <button
                            onClick={() => handleResult('learn')}
                            style={{
                                flex: 1, padding: '16px', borderRadius: '14px', border: '2px solid #FECDD3',
                                background: '#FFF1F2', color: '#E11D48', fontSize: '16px', fontWeight: '700',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                            <X size={18} /> Still Learning
                        </button>
                        <button
                            onClick={() => handleResult('know')}
                            style={{
                                flex: 1, padding: '16px', borderRadius: '14px', border: '2px solid #A7F3D0',
                                background: '#ECFDF5', color: '#059669', fontSize: '16px', fontWeight: '700',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                            <Check size={18} /> Know It!
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Multiple Choice Mode ──────────────────────────────────────────────────────
function MultipleChoiceMode({ words, onFinish }) {
    const shuffled = useRef(shuffle(words)).current
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState(null)
    const [score, setScore] = useState(0)
    const [done, setDone] = useState(false)

    const question = shuffled[index]

    // Build 4 choices: correct + 3 random wrong definitions
    const choices = useRef([]).current

    function getChoices(q, all) {
        const wrong = shuffle(all.filter(w => w.word !== q.word)).slice(0, 3)
        return shuffle([q, ...wrong])
    }

    const [currentChoices, setCurrentChoices] = useState(() => getChoices(question, shuffled))

    const handleSelect = (choice) => {
        if (selected !== null) return
        setSelected(choice.word)
        const correct = choice.word === question.word
        if (correct) setScore(s => s + 1)
        setTimeout(() => {
            if (index + 1 >= shuffled.length) {
                setDone(true)
                const finalScore = score + (correct ? 1 : 0)
                saveModuleScore('vocabulary', Math.round((finalScore / shuffled.length) * 100), shuffled.length * 15)
            } else {
                setIndex(i => {
                    const next = i + 1
                    setCurrentChoices(getChoices(shuffled[next], shuffled))
                    setSelected(null)
                    return next
                })
            }
        }, 900)
    }

    if (done) {
        return <SummaryScreen score={score} total={shuffled.length}
            onRetry={() => { setIndex(0); setScore(0); setSelected(null); setDone(false); setCurrentChoices(getChoices(shuffled[0], shuffled)) }}
            onHome={onFinish} />
    }

    const progress = (index / shuffled.length) * 100

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Question {index + 1} / {shuffled.length}</span>
                    <span style={{ fontSize: '14px', color: '#8B5CF6', fontWeight: '600' }}>Score: {score}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#E5E7EB', overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
                        animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                </div>
            </div>

            {/* Question box */}
            <div style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                borderRadius: '20px', padding: '32px', marginBottom: '24px',
                boxShadow: '0 12px 40px rgba(124,58,237,0.25)'
            }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Which word matches this definition?
                </p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0, lineHeight: '1.6' }}>
                    {question.definition || 'No definition available.'}
                </p>
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {currentChoices.map((choice) => {
                    const isCorrect = choice.word === question.word
                    const isSelected = selected === choice.word
                    const revealed = selected !== null

                    let bg = 'white', border = '#E5E7EB', color = '#1F2937'
                    if (revealed) {
                        if (isCorrect) { bg = '#ECFDF5'; border = '#6EE7B7'; color = '#065F46' }
                        else if (isSelected) { bg = '#FFF1F2'; border = '#FECDD3'; color = '#9F1239' }
                    }

                    return (
                        <motion.button
                            key={choice.word}
                            whileHover={!revealed ? { scale: 1.02 } : {}}
                            whileTap={!revealed ? { scale: 0.98 } : {}}
                            onClick={() => handleSelect(choice)}
                            style={{
                                padding: '18px 20px', borderRadius: '14px',
                                border: `2px solid ${border}`, background: bg,
                                color, fontSize: '16px', fontWeight: '700',
                                cursor: revealed ? 'default' : 'pointer',
                                textAlign: 'left', transition: 'all 0.25s',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                            }}
                        >
                            <span>{choice.word}</span>
                            {revealed && isCorrect && <Check size={18} color="#059669" />}
                            {revealed && isSelected && !isCorrect && <X size={18} color="#E11D48" />}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Fill in the Blank Mode ────────────────────────────────────────────────────
function FillBlankMode({ words, onFinish }) {
    const shuffled = useRef(shuffle(words)).current
    const [index, setIndex] = useState(0)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState(null) // null | 'correct' | 'wrong'
    const [score, setScore] = useState(0)
    const [done, setDone] = useState(false)
    const inputRef = useRef(null)

    const card = shuffled[index]

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [index])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!input.trim() || status) return
        const correct = input.trim().toLowerCase() === card.word.toLowerCase()
        setStatus(correct ? 'correct' : 'wrong')
        if (correct) setScore(s => s + 1)
    }

    const handleNext = () => {
        if (index + 1 >= shuffled.length) {
            setDone(true)
            saveModuleScore('vocabulary', Math.round((score / shuffled.length) * 100), shuffled.length * 20)
        } else {
            setIndex(i => i + 1)
            setInput('')
            setStatus(null)
        }
    }

    if (done) {
        return <SummaryScreen score={score} total={shuffled.length}
            onRetry={() => { setIndex(0); setScore(0); setInput(''); setStatus(null); setDone(false) }}
            onHome={onFinish} />
    }

    const progress = (index / shuffled.length) * 100

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Question {index + 1} / {shuffled.length}</span>
                    <span style={{ fontSize: '14px', color: '#8B5CF6', fontWeight: '600' }}>Score: {score}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: '#E5E7EB', overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }}
                        animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                </div>
            </div>

            {/* Definition */}
            <div style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                borderRadius: '20px', padding: '32px', marginBottom: '28px',
                boxShadow: '0 12px 40px rgba(79,70,229,0.25)'
            }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Definition
                </p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0, lineHeight: '1.6' }}>
                    {card.definition || 'No definition saved.'}
                </p>
                {card.part_of_speech && (
                    <span style={{
                        display: 'inline-block', marginTop: '16px', padding: '4px 12px',
                        borderRadius: '99px', background: 'rgba(255,255,255,0.2)',
                        color: 'white', fontSize: '12px', fontWeight: '500'
                    }}>{card.part_of_speech}</span>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={!!status}
                    placeholder="Type the word..."
                    style={{
                        width: '100%', padding: '18px 24px', borderRadius: '14px',
                        border: `2px solid ${status === 'correct' ? '#6EE7B7' : status === 'wrong' ? '#FECDD3' : '#E5E7EB'}`,
                        fontSize: '18px', fontWeight: '600', outline: 'none',
                        background: status === 'correct' ? '#ECFDF5' : status === 'wrong' ? '#FFF1F2' : '#F9FAFB',
                        color: status === 'correct' ? '#065F46' : status === 'wrong' ? '#9F1239' : '#111827',
                        transition: 'all 0.2s', boxSizing: 'border-box'
                    }}
                />

                <AnimatePresence>
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: '12px', padding: '14px 20px', borderRadius: '12px',
                                background: status === 'correct' ? '#ECFDF5' : '#FFF1F2',
                                color: status === 'correct' ? '#059669' : '#E11D48',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontWeight: '600', fontSize: '15px'
                            }}>
                            {status === 'correct'
                                ? <><Check size={18} /> Correct! Well done!</>
                                : <><X size={18} /> The answer was: <strong>{card.word}</strong></>}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', gap: '14px', marginTop: '20px' }}>
                    {!status ? (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            style={{
                                flex: 1, padding: '16px', borderRadius: '14px', border: 'none',
                                background: input.trim() ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : '#E5E7EB',
                                color: input.trim() ? 'white' : '#9CA3AF',
                                fontSize: '16px', fontWeight: '700', cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                boxShadow: input.trim() ? '0 6px 20px rgba(139,92,246,0.3)' : 'none'
                            }}>
                            Check Answer
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleNext}
                            style={{
                                flex: 1, padding: '16px', borderRadius: '14px', border: 'none',
                                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                                color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(139,92,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                            {index + 1 >= shuffled.length ? 'See Results' : 'Next'} <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}

// ── Summary Screen ────────────────────────────────────────────────────────────
function SummaryScreen({ score, total, onRetry, onHome }) {
    const pct = Math.round((score / total) * 100)
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'
    const msg = pct >= 80 ? 'Outstanding! You\'re mastering these words!' : pct >= 50 ? 'Good effort! Keep practising!' : 'Keep going — practice makes perfect!'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '40px 24px' }}
        >
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>{emoji}</div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: '0 0 8px' }}>
                {score} / {total}
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px' }}>{msg}</p>

            {/* Score ring */}
            <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: `conic-gradient(#8B5CF6 ${pct}%, #E5E7EB ${pct}%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px',
                boxShadow: '0 8px 30px rgba(139,92,246,0.25)'
            }}>
                <div style={{
                    width: '90px', height: '90px', borderRadius: '50%', background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#8B5CF6' }}>{pct}%</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                    onClick={onRetry}
                    style={{
                        padding: '14px 28px', borderRadius: '12px',
                        border: '2px solid #8B5CF6', background: 'white',
                        color: '#8B5CF6', fontSize: '15px', fontWeight: '700',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                    <RotateCcw size={16} /> Try Again
                </button>
                <button
                    onClick={onHome}
                    style={{
                        padding: '14px 28px', borderRadius: '12px',
                        border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                        color: 'white', fontSize: '15px', fontWeight: '700',
                        cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,92,246,0.3)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                    <Trophy size={16} /> Back to Modes
                </button>
            </div>
        </motion.div>
    )
}

// ── Trainer Tab ───────────────────────────────────────────────────────────────
function TrainerTab({ savedWords, completedModes, onModeComplete }) {
    const [mode, setMode] = useState(null) // null | 'flashcard' | 'mcq' | 'fill'
    const [sessionWords, setSessionWords] = useState([])

    const startMode = (m) => {
        if (savedWords.length < 4) return
        setSessionWords(shuffle(savedWords))
        setMode(m)
    }

    const handleFinish = (m) => {
        onModeComplete(m)
        setMode(null)
    }

    const notEnough = savedWords.length < 4

    if (notEnough) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 24px', opacity: 0.7 }}>
                <Brain size={56} style={{ color: '#DDD6FE', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', margin: '0 0 8px' }}>
                    Need at least 4 saved words
                </h3>
                <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
                    Search for words and save them to start training. You have {savedWords.length} saved so far.
                </p>
            </div>
        )
    }

    if (mode === 'flashcard') {
        return (
            <div>
                <button onClick={() => setMode(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', background: 'none', border: 'none', color: '#8B5CF6', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                    <ChevronLeft size={16} /> All Modes
                </button>
                <FlashcardMode words={sessionWords} onFinish={() => handleFinish('flashcard')} />
            </div>
        )
    }

    if (mode === 'mcq') {
        return (
            <div>
                <button onClick={() => setMode(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', background: 'none', border: 'none', color: '#8B5CF6', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                    <ChevronLeft size={16} /> All Modes
                </button>
                <MultipleChoiceMode words={sessionWords} onFinish={() => handleFinish('mcq')} />
            </div>
        )
    }

    if (mode === 'fill') {
        return (
            <div>
                <button onClick={() => setMode(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', background: 'none', border: 'none', color: '#8B5CF6', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                    <ChevronLeft size={16} /> All Modes
                </button>
                <FillBlankMode words={sessionWords} onFinish={() => handleFinish('fill')} />
            </div>
        )
    }

    // Mode selection
    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 6px' }}>
                    Choose a training mode
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                    Practice your {savedWords.length} saved words with interactive exercises
                </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                <ModeCard
                    icon={<Zap size={28} color="white" />}
                    title="Flashcards"
                    description="Flip through cards. Mark words you know vs. still learning."
                    color="#8B5CF6"
                    onClick={() => startMode('flashcard')}
                    isCompleted={completedModes.includes('flashcard')}
                />
                <ModeCard
                    icon={<Brain size={28} color="white" />}
                    title="Multiple Choice"
                    description="Read a definition and pick the correct word from 4 options."
                    color="#EC4899"
                    onClick={() => startMode('mcq')}
                    isCompleted={completedModes.includes('mcq')}
                />
                <ModeCard
                    icon={<PenLine size={28} color="white" />}
                    title="Fill in the Blank"
                    description="Read the definition and type the correct word from memory."
                    color="#F59E0B"
                    onClick={() => startMode('fill')}
                    isCompleted={completedModes.includes('fill')}
                />
            </div>
        </div>
    )
}

// ─── Main Vocabulary Page ─────────────────────────────────────────────────────
export default function Vocabulary() {
    const [searchWord, setSearchWord] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [savedWords, setSavedWords] = useState([])
    const [searching, setSearching] = useState(false)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('search') // 'search' | 'saved' | 'trainer'
    const [completedModes, setCompletedModes] = useState(() => {
        const saved = localStorage.getItem('neuraLingua_completed_vocab_modes');
        return saved ? JSON.parse(saved) : [];
    });
    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        localStorage.setItem('neuraLingua_completed_vocab_modes', JSON.stringify(completedModes));
    }, [completedModes]);

    useEffect(() => {
        fetchSavedWords()
    }, [])

    // ── localStorage helpers for offline persistence ──────────────────────────
    const LS_KEY = 'lingua_saved_words'
    const lsGetWords = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
    const lsSaveWords = (words) => localStorage.setItem(LS_KEY, JSON.stringify(words))

    const fetchSavedWords = async () => {
        try {
            const res = await api.get('/vocabulary/saved')
            const words = res.data.words || []
            setSavedWords(words)
            lsSaveWords(words) // keep localStorage in sync
        } catch (error) {
            // Backend unavailable — fall back to localStorage
            setSavedWords(lsGetWords())
        } finally {
            setLoading(false)
        }
    }

    // ── Search: calls Merriam-Webster Student Dictionary API ────────────
    const MW_API_KEY = import.meta.env.VITE_DICTIONARY_API_KEY || 'YOUR_LINDAN_LIBRARY_API_KEY' // Replace with your Merriam-Webster API Key

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!searchWord.trim()) return

        setSearching(true)
        setSearchResult(null)
        setActiveTab('search')

        try {
            // If the user hasn't set an API key, fallback to datamuse for simple definitions temporarily
            if (MW_API_KEY === 'YOUR_LINDAN_LIBRARY_API_KEY' || !MW_API_KEY) {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord.trim().toLowerCase())}`)
                if (!res.ok) { setSearchResult({ error: 'Word not found' }); return }
                const data = await res.json()
                const entry = data[0]

                let phonetic = '', audio_url = ''
                for (const p of entry.phonetics || []) {
                    if (p.text) phonetic = p.text
                    if (p.audio) audio_url = p.audio
                }

                const meanings = (entry.meanings || []).map(m => ({
                    part_of_speech: m.partOfSpeech || '',
                    // Simplify definitions heavily for a 5th grader fallback
                    definitions: (m.definitions || []).slice(0, 2).map(d => ({
                        definition: d.definition || '',
                        example: d.example || '',
                    }))
                }))

                setSearchResult({
                    success: true,
                    word: entry.word || searchWord,
                    phonetic,
                    audio_url,
                    meanings,
                    apiName: 'Free Dictionary (Please add your Lindan/Dictionary API Key for 5th grade definitions)'
                })
                return
            }

            // Using Student/Elementary Dictionary API (Merriam-Webster 'sd2' or 'sd3' or custom Lindan API)
            const res = await fetch(
                `https://www.dictionaryapi.com/api/v3/references/sd2/json/${encodeURIComponent(searchWord.trim().toLowerCase())}?key=${MW_API_KEY}`
            )
            if (!res.ok) { setSearchResult({ error: 'Word not found' }); return }
            const data = await res.json()

            // MW API returns an array of suggestions if word is not found exactly
            if (!data.length || typeof data[0] === 'string') {
                setSearchResult({ error: 'Word not found in student dictionary. Did you mean: ' + (data.slice(0, 3).join(', ') || 'nothing') })
                return
            }

            const entry = data[0]

            // Extract MW phonetics
            let phonetic = entry.hwi?.prs?.[0]?.mw ? `/${entry.hwi.prs[0].mw}/` : ''
            let audio_url = ''
            if (entry.hwi?.prs?.[0]?.sound?.audio) {
                const audio = entry.hwi.prs[0].sound.audio
                let subdir = audio.charAt(0)
                if (audio.startsWith('bix')) subdir = 'bix'
                else if (audio.startsWith('gg')) subdir = 'gg'
                else if (/^[^a-zA-Z]/.test(audio)) subdir = 'number'
                audio_url = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audio}.mp3`
            }

            // Extract MW meanings (shortdef)
            const meanings = [{
                part_of_speech: entry.fl || '',
                definitions: (entry.shortdef || []).map(def => ({
                    definition: def,
                    example: '' // MW Student API shortdef doesn't provide easy examples without deep parsing
                }))
            }]

            setSearchResult({
                success: true,
                word: entry.meta?.id?.split(':')[0] || searchWord,
                phonetic,
                audio_url,
                meanings,
                apiName: 'Student Dictionary API'
            })
        } catch (error) {
            setSearchResult({ error: 'Unable to reach the dictionary API. Check your internet connection or API key.' })
        } finally {
            setSearching(false)
        }
    }

    const saveWord = async (word) => {
        const newSavedWord = {
            id: Date.now(),
            word: searchResult.word,
            definition: searchResult.meanings?.[0]?.definitions?.[0]?.definition || '',
            part_of_speech: searchResult.meanings?.[0]?.part_of_speech || ''
        }
        // Optimistic update
        const updated = [newSavedWord, ...savedWords.filter(w => w.word !== newSavedWord.word)]
        setSavedWords(updated)
        lsSaveWords(updated)
        // Try to persist to backend too
        try { await api.post('/vocabulary/saved', { word }) } catch { /* backend optional */ }
    }

    const deleteWord = async (wordId) => {
        const updated = savedWords.filter(w => w.id !== wordId)
        setSavedWords(updated)
        lsSaveWords(updated)
        try { await api.delete(`/vocabulary/saved/${wordId}`) } catch { /* backend optional */ }
    }

    const playAudio = (url) => {
        if (url) new Audio(url).play()
    }

    const isWordSaved = (word) => savedWords.some(w => w.word.toLowerCase() === word.toLowerCase())

    const vocabRules = [
        "Use the 'Search' tab to find new words and save them to your list.",
        "You need at least 4 saved words to unlock the Trainer modes.",
        "Trainer modes include Flashcards, Multiple Choice, and Fill-in-the-Blank.",
        "Practice regularly to master your vocabulary list and boost your score!"
    ];

    const tabs = [
        { key: 'search', icon: <Search size={15} />, label: 'Search' },
        { key: 'saved', icon: <BookmarkCheck size={15} />, label: `Saved (${savedWords.length})` },
        { key: 'trainer', icon: <Dumbbell size={15} />, label: 'Trainer' },
    ]

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', minHeight: 'calc(100vh - 80px)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                            flexShrink: 0,
                        }}>
                            <Book size={24} style={{ color: 'white' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                                Vocabulary
                            </h1>
                            <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, marginTop: '2px' }}>
                                Discover, save, and train new words
                            </p>
                        </div>
                    </div>

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
                </div>

                {/* Tabs & Search Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                    gap: '20px',
                    flexWrap: 'wrap'
                }}>
                    <nav style={{
                        display: 'flex',
                        backgroundColor: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        border: '1px solid #E5E7EB',
                        flexWrap: 'wrap'
                    }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: activeTab === tab.key ? '#8B5CF6' : 'transparent',
                                    color: activeTab === tab.key ? 'white' : '#6B7280',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>

                    <form onSubmit={handleSearch} style={{ flex: '1 1 300px', maxWidth: '100%', position: 'relative' }}>
                        <input
                            type="text"
                            value={searchWord}
                            onChange={(e) => setSearchWord(e.target.value)}
                            placeholder="Enter any word to explore..."
                            style={{
                                width: '100%',
                                padding: '14px 20px 14px 48px',
                                borderRadius: '12px',
                                border: '2px solid #E5E7EB',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        {searching && (
                            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
                                <div style={{ width: '16px', height: '16px', border: '2px solid #E5E7EB', borderTop: '2px solid #8B5CF6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            </div>
                        )}
                    </form>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                            <div style={{
                                backgroundColor: 'white', borderRadius: '16px', padding: 'min(32px, 5vw)',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #F3F4F6'
                            }}>

                                {!searchResult && !searching && (
                                    <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                                        <Sparkles size={48} style={{ color: '#DDD6FE', marginBottom: '16px' }} />
                                        <p style={{ fontSize: '16px', color: '#6B7280', margin: 0 }}>
                                            Enter a word above to see its definition, pronunciation, and more.
                                        </p>
                                    </div>
                                )}

                                {searchResult && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                        {searchResult.error ? (
                                            <div style={{ padding: '24px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#EF4444', textAlign: 'center', fontWeight: '500' }}>
                                                {searchResult.error}
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '16px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                                                            <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                                                                {searchResult.word}
                                                            </h2>
                                                            {searchResult.phonetic && (
                                                                <span style={{ fontSize: '18px', color: '#6B7280', fontFamily: 'monospace' }}>{searchResult.phonetic}</span>
                                                            )}
                                                        </div>
                                                        {searchResult.audio_url && (
                                                            <button
                                                                onClick={() => playAudio(searchResult.audio_url)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
                                                                    padding: '8px 16px', borderRadius: '20px', border: '1px solid #E5E7EB',
                                                                    backgroundColor: 'white', color: '#4B5563', fontSize: '14px',
                                                                    fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#E5E7EB' }}
                                                            >
                                                                <Volume2 size={16} /> Listen
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => isWordSaved(searchResult.word) ? deleteWord(savedWords.find(w => w.word === searchResult.word)?.id) : saveWord(searchResult.word)}
                                                        style={{
                                                            width: '48px', height: '48px', borderRadius: '12px', border: 'none',
                                                            backgroundColor: isWordSaved(searchResult.word) ? '#8B5CF6' : '#F3F4F6',
                                                            color: isWordSaved(searchResult.word) ? 'white' : '#6B7280',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            boxShadow: isWordSaved(searchResult.word) ? '0 4px 12px rgba(139,92,246,0.3)' : 'none'
                                                        }}>
                                                        {isWordSaved(searchResult.word) ? <BookmarkCheck size={24} /> : <BookmarkPlus size={24} />}
                                                    </button>
                                                </div>

                                                <div style={{ display: 'grid', gap: '32px' }}>
                                                    {searchResult.meanings?.map((meaning, i) => (
                                                        <div key={i} style={{ backgroundColor: '#F9FAFB', borderRadius: '16px', padding: '24px' }}>
                                                            <span style={{
                                                                display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                                                                backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '13px',
                                                                fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px'
                                                            }}>{meaning.part_of_speech}</span>

                                                            {meaning.definitions?.map((def, j) => (
                                                                <div key={j} style={{ marginBottom: j !== meaning.definitions.length - 1 ? '20px' : 0 }}>
                                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                                        <span style={{ fontWeight: '700', color: '#9CA3AF', minWidth: '20px' }}>{j + 1}.</span>
                                                                        <div>
                                                                            <p style={{ fontSize: '16px', color: '#1F2937', margin: '0 0 8px 0', lineHeight: '1.5' }}>{def.definition}</p>
                                                                            {def.example && (
                                                                                <p style={{ fontSize: '15px', color: '#6B7280', fontStyle: 'italic', margin: 0, paddingLeft: '12px', borderLeft: '2px solid #E5E7EB' }}>
                                                                                    "{def.example}"
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {meaning.synonyms?.length > 0 && (
                                                                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#4B5563', marginRight: '8px' }}>Synonyms:</span>
                                                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>{meaning.synonyms.slice(0, 5).join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'saved' && (
                        <motion.div key="saved" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '48px' }}>Loading...</div>
                            ) : savedWords.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                    {savedWords.map((word, idx) => (
                                        <motion.div
                                            key={word.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            style={{
                                                backgroundColor: 'white', borderRadius: '16px', padding: '24px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6',
                                                position: 'relative', cursor: 'pointer'
                                            }}
                                            whileHover={{ y: -4, boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                                            onClick={() => { setSearchWord(word.word); handleSearch({ preventDefault: () => { } }) }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>{word.word}</h3>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteWord(word.id) }}
                                                    style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#EF4444' }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {word.part_of_speech && (
                                                <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: '600', color: '#7C3AED', backgroundColor: '#F5F3FF', padding: '2px 8px', borderRadius: '12px', marginBottom: '12px' }}>
                                                    {word.part_of_speech}
                                                </span>
                                            )}
                                            {word.definition && (
                                                <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {word.definition}
                                                </p>
                                            )}
                                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', fontSize: '13px', fontWeight: '500' }}>
                                                View Details <ArrowRight size={14} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.6 }}>
                                    <BookmarkPlus size={48} style={{ color: '#DDD6FE', marginBottom: '16px' }} />
                                    <p style={{ fontSize: '16px', color: '#6B7280' }}>No saved words yet. Search for words and bookmark them to build your collection.</p>
                                    <button onClick={() => setActiveTab('search')} style={{ marginTop: '24px', padding: '10px 20px', borderRadius: '8px', border: '1px solid #8B5CF6', backgroundColor: 'white', color: '#8B5CF6', fontWeight: '600', cursor: 'pointer' }}>
                                        Find Words
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'trainer' && (
                        <motion.div key="trainer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.2 }}>
                            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
                                <TrainerTab
                                    savedWords={savedWords}
                                    completedModes={completedModes}
                                    onModeComplete={(m) => {
                                        if (!completedModes.includes(m)) {
                                            setCompletedModes(prev => [...prev, m])
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <ModuleRulesModal 
                isOpen={showRules}
                onClose={() => setShowRules(false)}
                title="Vocabulary Rules"
                description="Follow these guidelines to expand your vocabulary:"
                rules={vocabRules}
            />
        </div>
    )
}
