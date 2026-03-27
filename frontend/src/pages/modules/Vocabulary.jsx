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

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function ModeCard({ icon, title, description, color, onClick, isCompleted }) {
    return (
        <button onClick={onClick} className="card" style={{ textAlign: 'left', border: `2px solid ${color}30`, transition: 'all 0.2s', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'white' }}>
                {icon}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px' }}>
                {title} {isCompleted && <CheckCircle size={18} color="#22C55E" />}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>{description}</p>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', color, fontWeight: 'bold', fontSize: '14px' }}>
                Start <ChevronRight size={16} />
            </div>
        </button>
    )
}

function SummaryScreen({ score, total, onRetry, onHome }) {
    const pct = Math.round((score / total) * 100)
    return (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px' }}>{score} / {total}</h2>
            <p style={{ color: '#6B7280', marginBottom: '32px' }}>{pct >= 80 ? 'Outstanding!' : 'Keep practicing!'}</p>
            
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#8B5CF6 ${pct}%, #E5E7EB ${pct}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>
                    {pct}%
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={onRetry} className="btn btn-secondary"><RotateCcw size={16} /> Try Again</button>
                <button onClick={onHome} className="btn btn-primary" style={{ background: '#8B5CF6' }}><Trophy size={16} /> Finish</button>
            </div>
        </div>
    )
}

function FlashcardMode({ words, onFinish }) {
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [results, setResults] = useState([])
    const [done, setDone] = useState(false)

    const card = words[index]
    const handleResult = (type) => {
        const updated = [...results, type]
        setResults(updated)
        setFlipped(false)
        if (index + 1 >= words.length) {
            setTimeout(() => {
                setDone(true)
                saveModuleScore('vocabulary', Math.round((updated.filter(r => r === 'know').length / words.length) * 100), words.length * 10)
            }, 300)
        } else {
            setTimeout(() => setIndex(i => i + 1), 200)
        }
    }

    if (done) return <SummaryScreen score={results.filter(r => r === 'know').length} total={words.length} onRetry={() => { setIndex(0); setResults([]); setFlipped(false); setDone(false) }} onHome={onFinish} />

    return (
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold', color: '#6B7280' }}>
                <span>Card {index + 1} of {words.length}</span>
                <span style={{ color: '#8B5CF6' }}>{results.filter(r => r === 'know').length} known</span>
            </div>
            
            <div onClick={() => setFlipped(!flipped)} style={{ perspective: '1000px', cursor: 'pointer', marginBottom: '24px', height: '300px', position: 'relative' }}>
                <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5 }} style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '24px' }}>
                        <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 16px' }}>{card.word}</h2>
                        {card.part_of_speech && <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '14px' }}>{card.part_of_speech}</span>}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'white', border: '2px solid #E5E7EB', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                        <p style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>{card.definition || 'No definition saved.'}</p>
                    </div>
                </motion.div>
            </div>

            {flipped && (
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => handleResult('learn')} className="btn" style={{ flex: 1, padding: '16px', background: '#FFF1F2', color: '#E11D48', border: '2px solid #FECDD3', fontWeight: 'bold', fontSize: '16px' }}><X size={18} /> Learning</button>
                    <button onClick={() => handleResult('know')} className="btn" style={{ flex: 1, padding: '16px', background: '#ECFDF5', color: '#059669', border: '2px solid #A7F3D0', fontWeight: 'bold', fontSize: '16px' }}><Check size={18} /> Know It</button>
                </div>
            )}
        </div>
    )
}

function MultipleChoiceMode({ words, onFinish }) {
    const shuffled = useRef(shuffle(words)).current
    const [index, setIndex] = useState(0)
    const [selected, setSelected] = useState(null)
    const [score, setScore] = useState(0)
    const [done, setDone] = useState(false)
    const question = shuffled[index]

    const getChoices = (q, all) => shuffle([q, ...shuffle(all.filter(w => w.word !== q.word)).slice(0, 3)])
    const [currentChoices, setCurrentChoices] = useState(() => getChoices(question, shuffled))

    const handleSelect = (choice) => {
        if (selected) return
        setSelected(choice.word)
        const correct = choice.word === question.word
        if (correct) setScore(s => s + 1)
        setTimeout(() => {
            if (index + 1 >= shuffled.length) {
                setDone(true)
                saveModuleScore('vocabulary', Math.round(((score + (correct ? 1 : 0)) / shuffled.length) * 100), shuffled.length * 15)
            } else {
                setIndex(i => {
                    const next = i + 1
                    setCurrentChoices(getChoices(shuffled[next], shuffled))
                    setSelected(null)
                    return next
                })
            }
        }, 1000)
    }

    if (done) return <SummaryScreen score={score} total={shuffled.length} onRetry={() => { setIndex(0); setScore(0); setSelected(null); setDone(false); setCurrentChoices(getChoices(shuffled[0], shuffled)) }} onHome={onFinish} />

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 'bold', color: '#6B7280' }}>
                <span>Question {index + 1} / {shuffled.length}</span>
                <span style={{ color: '#8B5CF6' }}>Score: {score}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white', padding: '24px' }}>
                    <p style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 'bold' }}>Definition</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{question.definition}</p>
                </div>

                <div className="grid-2col">
                {currentChoices.map(c => {
                    const isCorrect = c.word === question.word
                    const isSelected = selected === c.word
                    let bg = 'white', border = '#E5E7EB', color = '#111827'
                    if (selected) {
                        if (isCorrect) { bg = '#ECFDF5'; border = '#6EE7B7'; color = '#065F46' }
                        else if (isSelected) { bg = '#FFF1F2'; border = '#FECDD3'; color = '#9F1239' }
                    }
                    return (
                        <button key={c.word} onClick={() => handleSelect(c)} className="btn" style={{ background: bg, border: `2px solid ${border}`, color, justifyContent: 'space-between', padding: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                            {c.word}
                            {selected && isCorrect && <Check size={18} color="#059669" />}
                            {selected && isSelected && !isCorrect && <X size={18} color="#E11D48" />}
                        </button>
                    )
                })}
                </div>
            </div>
        </div>
    )
}

function FillBlankMode({ words, onFinish }) {
    const shuffled = useRef(shuffle(words)).current
    const [index, setIndex] = useState(0)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState(null)
    const [score, setScore] = useState(0)
    const [done, setDone] = useState(false)
    const card = shuffled[index]

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
            setInput(''); setStatus(null)
        }
    }

    if (done) return <SummaryScreen score={score} total={shuffled.length} onRetry={() => { setIndex(0); setScore(0); setInput(''); setStatus(null); setDone(false) }} onHome={onFinish} />

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 'bold', color: '#6B7280' }}>
                <span>Question {index + 1} / {shuffled.length}</span>
                <span style={{ color: '#8B5CF6' }}>Score: {score}</span>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', marginBottom: '24px', padding: '32px' }}>
                <p style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 'bold' }}>Definition</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{card.definition}</p>
                {card.part_of_speech && <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '12px', marginTop: '16px' }}>{card.part_of_speech}</span>}
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text" value={input} onChange={e => setInput(e.target.value)} disabled={!!status}
                    placeholder="Type the word..."
                    style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: `2px solid ${status === 'correct' ? '#6EE7B7' : status === 'wrong' ? '#FECDD3' : '#E5E7EB'}`, fontSize: '18px', fontWeight: 'bold', outline: 'none', background: status === 'correct' ? '#ECFDF5' : status === 'wrong' ? '#FFF1F2' : '#F9FAFB' }}
                />
                {status && (
                    <div style={{ marginTop: '12px', padding: '16px', borderRadius: '12px', background: status === 'correct' ? '#ECFDF5' : '#FFF1F2', color: status === 'correct' ? '#059669' : '#E11D48', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {status === 'correct' ? <><Check size={18} /> Correct!</> : <><X size={18} /> The answer was: {card.word}</>}
                    </div>
                )}
                <div style={{ marginTop: '24px' }}>
                    {!status ? (
                        <button type="submit" disabled={!input.trim()} className="btn btn-primary" style={{ width: '100%', background: input.trim() ? '#8B5CF6' : '#E5E7EB', padding: '16px' }}>Check Answer</button>
                    ) : (
                        <button type="button" onClick={handleNext} className="btn btn-primary" style={{ width: '100%', background: '#8B5CF6', padding: '16px' }}>{index + 1 >= shuffled.length ? 'See Results' : 'Next'}</button>
                    )}
                </div>
            </form>
        </div>
    )
}

function TrainerTab({ savedWords, completedModes, onModeComplete }) {
    const [mode, setMode] = useState(null)
    const [sessionWords, setSessionWords] = useState([])

    const startMode = (m) => {
        if (savedWords.length < 4) return
        setSessionWords(shuffle(savedWords))
        setMode(m)
    }

    if (savedWords.length < 4) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <Brain size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>Need at least 4 saved words</h3>
                <p style={{ color: '#6B7280' }}>Save more words from the dictionary to unlock training modes! You have {savedWords.length}.</p>
            </div>
        )
    }

    if (mode === 'flashcard') return <div><button onClick={() => setMode(null)} className="btn" style={{ marginBottom: '24px', color: '#8B5CF6', fontWeight: 'bold', background: 'none' }}><ChevronLeft size={16} /> Back</button><FlashcardMode words={sessionWords} onFinish={() => { onModeComplete('flashcard'); setMode(null) }} /></div>
    if (mode === 'mcq') return <div><button onClick={() => setMode(null)} className="btn" style={{ marginBottom: '24px', color: '#8B5CF6', fontWeight: 'bold', background: 'none' }}><ChevronLeft size={16} /> Back</button><MultipleChoiceMode words={sessionWords} onFinish={() => { onModeComplete('mcq'); setMode(null) }} /></div>
    if (mode === 'fill') return <div><button onClick={() => setMode(null)} className="btn" style={{ marginBottom: '24px', color: '#8B5CF6', fontWeight: 'bold', background: 'none' }}><ChevronLeft size={16} /> Back</button><FillBlankMode words={sessionWords} onFinish={() => { onModeComplete('fill'); setMode(null) }} /></div>

    return (
        <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Choose a training mode</h2>
            <p style={{ color: '#6B7280', marginBottom: '32px' }}>Practice your {savedWords.length} saved words.</p>
            <div className="grid-3col">
                <ModeCard icon={<Zap size={24} />} title="Flashcards" description="Flip through cards based on spaced repetition concepts." color="#8B5CF6" onClick={() => startMode('flashcard')} isCompleted={completedModes.includes('flashcard')} />
                <ModeCard icon={<Brain size={24} />} title="Multiple Choice" description="Pick the correct word from 4 options." color="#EC4899" onClick={() => startMode('mcq')} isCompleted={completedModes.includes('mcq')} />
                <ModeCard icon={<PenLine size={24} />} title="Type It" description="Read the definition and type the word." color="#F59E0B" onClick={() => startMode('fill')} isCompleted={completedModes.includes('fill')} />
            </div>
        </div>
    )
}

export default function Vocabulary() {
    const [searchWord, setSearchWord] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [savedWords, setSavedWords] = useState([])
    const [searching, setSearching] = useState(false)
    const [activeTab, setActiveTab] = useState('search')
    const [showRules, setShowRules] = useState(false)
    const [completedModes, setCompletedModes] = useState(() => JSON.parse(localStorage.getItem('neuraLingua_completed_vocab_modes') || '[]'))

    useEffect(() => localStorage.setItem('neuraLingua_completed_vocab_modes', JSON.stringify(completedModes)), [completedModes])
    useEffect(() => {
        api.get('/vocabulary/saved').then(r => setSavedWords(r.data.words || [])).catch(() => setSavedWords(JSON.parse(localStorage.getItem('lingua_saved_words') || '[]')))
    }, [])
    
    const updateSavedLocally = (words) => { setSavedWords(words); localStorage.setItem('lingua_saved_words', JSON.stringify(words)) }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!searchWord.trim()) return
        setSearching(true); setSearchResult(null); setActiveTab('search')
        
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord.trim().toLowerCase())}`)
            if (!res.ok) { setSearchResult({ error: 'Word not found' }); return }
            const data = await res.json()
            const entry = data[0]
            
            setSearchResult({
                success: true,
                word: entry.word,
                phonetic: entry.phonetics?.find(p => p.text)?.text || '',
                audio_url: entry.phonetics?.find(p => p.audio)?.audio || '',
                meanings: entry.meanings.map(m => ({ part_of_speech: m.partOfSpeech, definitions: m.definitions.slice(0,2) }))
            })
        } catch {
            setSearchResult({ error: 'Unable to reach the dictionary API.' })
        } finally {
            setSearching(false)
        }
    }

    const saveWord = async () => {
        const newWord = { id: Date.now(), word: searchResult.word, definition: searchResult.meanings?.[0]?.definitions?.[0]?.definition || '', part_of_speech: searchResult.meanings?.[0]?.part_of_speech || '' }
        updateSavedLocally([newWord, ...savedWords.filter(w => w.word !== newWord.word)])
    }

    const deleteWord = async (id) => updateSavedLocally(savedWords.filter(w => w.id !== id))
    const isSaved = (word) => savedWords.some(w => w.word.toLowerCase() === word.toLowerCase())

    return (
        <div className="page-container" style={{ padding: '24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Book size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>Vocabulary</h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>Discover, save, and train new words</p>
                    </div>
                </div>
                <button onClick={() => setShowRules(true)} className="btn btn-secondary">
                    <Info size={16} /> Instructions
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
                <nav style={{ display: 'flex', padding: '4px', background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto', maxWidth: '100%' }}>
                    <button onClick={() => setActiveTab('search')} className="btn" style={{ background: activeTab === 'search' ? '#8B5CF6' : 'transparent', color: activeTab === 'search' ? 'white' : '#6B7280', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px' }}><Search size={16} /> Search</button>
                    <button onClick={() => setActiveTab('saved')} className="btn" style={{ background: activeTab === 'saved' ? '#8B5CF6' : 'transparent', color: activeTab === 'saved' ? 'white' : '#6B7280', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px' }}><BookmarkCheck size={16} /> Saved ({savedWords.length})</button>
                    <button onClick={() => setActiveTab('trainer')} className="btn" style={{ background: activeTab === 'trainer' ? '#8B5CF6' : 'transparent', color: activeTab === 'trainer' ? 'white' : '#6B7280', fontWeight: 'bold', padding: '10px 20px', borderRadius: '8px' }}><Dumbbell size={16} /> Trainer</button>
                </nav>
                <form onSubmit={handleSearch} style={{ flex: '1 1 300px', position: 'relative' }}>
                    <input type="text" value={searchWord} onChange={e => setSearchWord(e.target.value)} placeholder="Type a word..." style={{ width: '100%', padding: '14px 20px 14px 48px', borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none' }} />
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                </form>
            </div>

            <div className="card" style={{ padding: '24px 16px' }}>
                {activeTab === 'search' && (
                    <div>
                        {!searchResult && !searching && <div style={{ textAlign: 'center', padding: '64px', color: '#6B7280' }}><Sparkles size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} /><p>Search for a word above!</p></div>}
                        {searchResult?.error && <div style={{ padding: '24px', background: '#FEF2F2', color: '#EF4444', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold' }}>{searchResult.error}</div>}
                        {searchResult?.word && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E5E7EB', paddingBottom: '24px', marginBottom: '32px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: '0 0 12px' }}>{searchResult.word} <span style={{ fontSize: '18px', color: '#6B7280', fontWeight: 'normal', fontFamily: 'monospace' }}>{searchResult.phonetic}</span></h2>
                                        {searchResult.audio_url && <button onClick={() => new Audio(searchResult.audio_url).play()} className="btn btn-secondary"><Volume2 size={16}/> Listen</button>}
                                    </div>
                                    <button onClick={() => isSaved(searchResult.word) ? deleteWord(savedWords.find(w => w.word === searchResult.word)?.id) : saveWord()} className="btn" style={{ width: '48px', height: '48px', padding: 0, justifyContent: 'center', background: isSaved(searchResult.word) ? '#8B5CF6' : '#F3F4F6', color: isSaved(searchResult.word) ? 'white' : '#6B7280', borderRadius: '12px' }}>
                                        {isSaved(searchResult.word) ? <BookmarkCheck size={24} /> : <BookmarkPlus size={24} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {searchResult.meanings.map((m, i) => (
                                        <div key={i} style={{ background: '#F9FAFB', padding: '24px', borderRadius: '16px' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', background: '#EDE9FE', color: '#7C3AED', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>{m.part_of_speech}</span>
                                            {m.definitions.map((d, j) => (
                                                <div key={j} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#9CA3AF' }}>{j + 1}.</span>
                                                    <div>
                                                        <p style={{ margin: '0 0 8px', fontSize: '16px', lineHeight: '1.5' }}>{d.definition}</p>
                                                        {d.example && <p style={{ margin: 0, color: '#6B7280', fontStyle: 'italic', borderLeft: '2px solid #E5E7EB', paddingLeft: '12px' }}>"{d.example}"</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'saved' && (
                    <div className="grid-3col">
                        {savedWords.map(w => (
                            <div key={w.id} className="card" onClick={() => { setSearchWord(w.word); handleSearch({ preventDefault: () => {} }) }} style={{ cursor: 'pointer', padding: '24px', border: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{w.word}</h3>
                                    <button onClick={e => { e.stopPropagation(); deleteWord(w.id) }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                                <span style={{ display: 'inline-block', padding: '2px 8px', background: '#F5F3FF', color: '#7C3AED', fontSize: '12px', fontWeight: 'bold', borderRadius: '12px', marginBottom: '12px' }}>{w.part_of_speech}</span>
                                <p style={{ fontSize: '14px', color: '#4B5563', margin: 0 }}>{w.definition}</p>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'trainer' && <TrainerTab savedWords={savedWords} completedModes={completedModes} onModeComplete={m => setCompletedModes(p => p.includes(m) ? p : [...p, m])} />}
            </div>
            
            <ModuleRulesModal isOpen={showRules} onClose={() => setShowRules(false)} moduleName="Vocabulary" rules={["Search words offline or online", "Train your memory using Flashcards.", "Verify meaning using MCQs", "Test spelling via typing mode"]} />
        </div>
    )
}
