import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, Plus, Edit2, Trash2, X, Check, Search,
    Headphones, Mic, FileText, PenTool, CheckSquare, Upload, FileUp, Eye
} from 'lucide-react'
import api from '../../services/api'
import { supabase } from '../../utils/supabaseClient'
import Modal from '../../components/common/Modal'

const moduleIcons = {
    listening: Headphones,
    speaking: Mic,
    reading: FileText,
    writing: PenTool,
    grammar: CheckSquare,
}

const moduleColors = {
    listening: '#3B82F6',
    speaking: '#22C55E',
    reading: '#8B5CF6',
    writing: '#F97316',
    grammar: '#EF4444',
}

export default function QuestionManagement() {
    const [activeModule, setActiveModule] = useState('grammar')
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [usingLocalStorage, setUsingLocalStorage] = useState(false)
    const [alertConfig, setAlertConfig] = useState({ isOpen: false })

    const showAlert = (title, message, theme = 'info') => {
        setAlertConfig({ isOpen: true, title, message, theme, type: 'alert' })
    }

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        difficulty: 1,
        options: [{ text: '', value: 'A' }, { text: '', value: 'B' }, { text: '', value: 'C' }, { text: '', value: 'D' }],
        correct_answer: 'A',
        explanation: '',
        audio_data: null,  // base64 data URL for listening audio
        pdf_name: null,    // uploaded PDF filename
    })
    const [pdfLoading, setPdfLoading] = useState(false)
    const [pdfDragOver, setPdfDragOver] = useState(false)
    const pdfInputRef = useRef(null)

    // --- LocalStorage helpers ---
    const LS_KEY = `neuralingua_questions_${activeModule}`

    const getLocalQuestions = () => {
        try { return JSON.parse(localStorage.getItem(`neuralingua_questions_${activeModule}`)) || [] }
        catch { return [] }
    }
    const saveLocalQuestions = (list) =>
        localStorage.setItem(`neuralingua_questions_${activeModule}`, JSON.stringify(list))

    useEffect(() => {
        fetchQuestions()
    }, [activeModule])

    const fetchQuestions = async () => {
        setLoading(true)
        try {
            const { data: sbData, error } = await supabase
                .from('questions')
                .select('*')
                .eq('module', activeModule)
                .order('created_at', { ascending: false })

            if (!error) {
                // Supabase table exists — use it
                setUsingLocalStorage(false)
                const normalized = (sbData || []).map(item => ({
                    id: item.id,
                    content: item.content,
                    difficulty: item.difficulty || 1,
                    options: item.options,
                    correct_answer: item.correct_answer,
                    explanation: item.explanation,
                    type: ['speaking', 'writing'].includes(activeModule) ? 'prompt' : 'mcq'
                }))
                setQuestions(normalized)
                setLoading(false)
                return
            }
        } catch (_) { /* ignore */ }

        // Supabase table missing — use localStorage
        setUsingLocalStorage(true)
        setQuestions(getLocalQuestions())
        setLoading(false)
    }

    const handleOpenModal = (question = null) => {
        if (question) {
            setEditingQuestion(question)
            setFormData({
                title: question.title || '',
                content: question.content,
                difficulty: question.difficulty,
                options: question.options || [{ text: '', value: 'A' }, { text: '', value: 'B' }, { text: '', value: 'C' }, { text: '', value: 'D' }],
                correct_answer: question.correct_answer,
                explanation: question.explanation || '',
                audio_data: question.audio_data || null,
                pdf_name: question.pdf_name || null,
            })
        } else {
            setEditingQuestion(null)
            setFormData({
                title: '',
                content: '',
                difficulty: 1,
                options: [{ text: '', value: 'A' }, { text: '', value: 'B' }, { text: '', value: 'C' }, { text: '', value: 'D' }],
                correct_answer: 'A',
                explanation: '',
                audio_data: null,
                pdf_name: null,
            })
        }
        setShowModal(true)
    }

    // ---- PDF Text Extraction (pdfjs via CDN) ----
    const extractPdfText = async (file) => {
        setPdfLoading(true)
        try {
            // Load pdfjs from CDN dynamically (no npm install needed)
            if (!window.pdfjsLib) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
                    script.onload = resolve
                    script.onerror = reject
                    document.head.appendChild(script)
                })
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            }

            const arrayBuffer = await file.arrayBuffer()
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let fullText = ''
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map(item => item.str).join(' ')
                fullText += (i > 1 ? '\n\n' : '') + pageText
            }
            setFormData(p => ({
                ...p,
                content: fullText.trim(),
                pdf_name: file.name,
                title: p.title || file.name.replace(/\.pdf$/i, ''),
            }))
        } catch (err) {
            console.error('PDF extraction failed:', err)
            showAlert('PDF Error', 'Could not read PDF. Please try again or type the passage manually.', 'danger')
        } finally {
            setPdfLoading(false)
        }
    }

    const handlePdfDrop = (e) => {
        e.preventDefault()
        setPdfDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type === 'application/pdf') extractPdfText(file)
    }

    const handlePdfFileInput = (e) => {
        const file = e.target.files[0]
        if (file) extractPdfText(file)
    }

    const handleAudioUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            setFormData(p => ({ ...p, audio_data: ev.target.result }))
        }
        reader.readAsDataURL(file)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingQuestion(null)
    }

    const handleOptionChange = (index, text) => {
        const newOptions = [...formData.options]
        newOptions[index] = { ...newOptions[index], text }
        setFormData(p => ({ ...p, options: newOptions }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setSaveError('')
        setSaveSuccess(false)

        const basePayload = {
            module: activeModule,
            content: formData.content,
            difficulty: formData.difficulty,
            options: ['grammar', 'listening', 'reading'].includes(activeModule) ? formData.options : null,
            correct_answer: ['grammar', 'listening', 'reading'].includes(activeModule) ? formData.correct_answer : null,
            explanation: formData.explanation || null,
            audio_data: activeModule === 'listening' ? (formData.audio_data || null) : null,
        }

        // Extended fields (may not exist in older table schemas)
        const extendedPayload = {
            ...basePayload,
            title: formData.title || null,
            pdf_name: activeModule === 'reading' ? (formData.pdf_name || null) : null,
        }

        // Try Supabase (always, even if previously fell back)
        let savedToSupabase = false
        let supabaseData = null

        for (const payload of [extendedPayload, basePayload]) {
            try {
                if (editingQuestion) {
                    const { error } = await supabase.from('questions').update(payload).eq('id', editingQuestion.id)
                    if (error) throw error
                    setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...payload } : q))
                } else {
                    const { data, error } = await supabase.from('questions').insert(payload).select().single()
                    if (error) throw error
                    supabaseData = data
                    setQuestions(prev => [{ ...data, type: payload.options ? 'mcq' : 'prompt' }, ...prev])
                }
                savedToSupabase = true
                setUsingLocalStorage(false)
                break   // success — stop retrying
            } catch (err) {
                // If first attempt (extended) fails with column error, retry with base
                const isColumnError = err?.message?.includes('column') || err?.code === '42703' || err?.code === 'PGRST204'
                if (payload === extendedPayload && isColumnError) continue
                // For any other error on base payload, stop and fall through to localStorage
                console.warn('Supabase save failed:', err)
                break
            }
        }

        if (savedToSupabase) {
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
            handleCloseModal()
        } else {
            // localStorage fallback
            const current = getLocalQuestions()
            if (editingQuestion) {
                const updated = current.map(q => q.id === editingQuestion.id ? { ...q, ...extendedPayload } : q)
                saveLocalQuestions(updated)
                setQuestions(updated)
            } else {
                const newQ = { ...extendedPayload, id: Date.now().toString(), created_at: new Date().toISOString(), type: extendedPayload.options ? 'mcq' : 'prompt' }
                const updated = [newQ, ...current]
                saveLocalQuestions(updated)
                setQuestions(updated)
            }
            setUsingLocalStorage(true)
            handleCloseModal()
        }

        setSaving(false)
    }

    const handleDelete = (questionId) => {
        setAlertConfig({
            isOpen: true,
            title: 'Delete Question',
            message: 'Are you sure you want to delete this question?',
            theme: 'danger',
            type: 'confirm',
            confirmText: 'Delete',
            onConfirm: async () => {
                setAlertConfig({ isOpen: false })
                try {
                    if (!usingLocalStorage) {
                        const { error } = await supabase.from('questions').delete().eq('id', questionId)
                        if (error) throw error
                    }
                } catch (_) { /* ignore Supabase errors, still remove locally */ }
                const updated = questions.filter(q => q.id !== questionId)
                setQuestions(updated)
                if (usingLocalStorage) saveLocalQuestions(updated)
            }
        })
    }

    const filteredQuestions = questions.filter(q =>
        q.content.toLowerCase().includes(search.toLowerCase())
    )

    const modules = [
        { key: 'grammar', label: 'Grammar' },
        { key: 'listening', label: 'Listening' },
        { key: 'speaking', label: 'Speaking' },
        { key: 'reading', label: 'Reading' },
        { key: 'writing', label: 'Writing' },
    ]

    return (
        <div style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}>
            {/* Local Storage Mode Banner */}
            {usingLocalStorage && (
                <div style={{
                    marginBottom: '20px',
                    padding: '12px 16px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                }}>
                    <span>⚠️</span>
                    <div>
                        <strong>Saved locally (browser only).</strong> Questions are not synced to the database yet because the Supabase <code>questions</code> table is missing or doesn't have the required columns.<br />
                        <strong>Run this SQL in your Supabase SQL Editor to fix:</strong>
                        <pre style={{ marginTop: '8px', padding: '10px', backgroundColor: '#FEF3C7', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{`-- Create questions table (if missing)\nCREATE TABLE IF NOT EXISTS public.questions (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  module text NOT NULL,\n  title text,\n  content text NOT NULL,\n  difficulty integer DEFAULT 1,\n  options jsonb,\n  correct_answer text,\n  explanation text,\n  audio_data text,\n  pdf_name text,\n  created_at timestamptz DEFAULT now()\n);\n\n-- Or add missing columns to existing table:\nALTER TABLE public.questions\n  ADD COLUMN IF NOT EXISTS title text,\n  ADD COLUMN IF NOT EXISTS pdf_name text;\n\n-- Allow authenticated users\nALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;\nCREATE POLICY IF NOT EXISTS \"allow_all\" ON public.questions FOR ALL USING (true);`}</pre>
                    </div>
                </div>
            )}

            {/* Save success toast (top-right fixed) */}
            {saveSuccess && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    padding: '14px 20px',
                    backgroundColor: '#22C55E',
                    color: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <Check size={18} />
                    Question saved to database!
                </div>
            )}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <BookOpen size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Question Management
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            Manage questions for all learning modules
                        </p>
                    </div>
                </div>
 
                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${moduleColors[activeModule]} 0%, ${moduleColors[activeModule]}99 100%)`,
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 14px ${moduleColors[activeModule]}66`,
                    }}
                >
                    <Plus size={18} />
                    Add Question
                </button>
            </div>

            {/* Module Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                flexWrap: 'wrap',
            }}>
                {modules.map((module) => {
                    const Icon = moduleIcons[module.key]
                    const isActive = activeModule === module.key
                    return (
                        <button
                            key={module.key}
                            onClick={() => setActiveModule(module.key)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: isActive ? moduleColors[module.key] : 'transparent',
                                color: isActive ? 'white' : '#6B7280',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Icon size={18} />
                            {module.label}
                        </button>
                    )
                })}
            </div>

            {/* Search */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9CA3AF',
                    }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search questions..."
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 44px',
                            borderRadius: '10px',
                            border: '2px solid #E5E7EB',
                            fontSize: '14px',
                            outline: 'none',
                        }}
                    />
                </div>
            </div>

            {/* Questions List */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid #E5E7EB',
                            borderTop: `4px solid ${moduleColors[activeModule]}`,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto',
                        }} />
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', color: '#6B7280', margin: 0 }}>No questions found</p>
                    </div>
                ) : (
                    <div>
                        {filteredQuestions.map((question, idx) => (
                            <motion.div
                                key={question.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                style={{
                                    padding: '20px 24px',
                                    borderTop: idx > 0 ? '1px solid #F3F4F6' : 'none',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            backgroundColor: question.difficulty === 1 ? '#F0FDF4' : question.difficulty === 2 ? '#FEF3C7' : '#FEE2E2',
                                            color: question.difficulty === 1 ? '#166534' : question.difficulty === 2 ? '#D97706' : '#991B1B',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                        }}>
                                            {question.difficulty === 1 ? 'Easy' : question.difficulty === 2 ? 'Medium' : 'Hard'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                            Answer: {question.correct_answer}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#111827',
                                        margin: 0,
                                        lineHeight: '1.5',
                                    }}>
                                        {question.content}
                                    </p>
                                    {question.options && (
                                        <div style={{
                                            display: 'flex',
                                            gap: '12px',
                                            marginTop: '12px',
                                            flexWrap: 'wrap',
                                        }}>
                                            {question.options.map((opt) => (
                                                <span
                                                    key={opt.value}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        backgroundColor: opt.value === question.correct_answer ? '#EFF6FF' : '#F9FAFB',
                                                        border: opt.value === question.correct_answer ? '1px solid #3B82F6' : '1px solid #E5E7EB',
                                                        fontSize: '13px',
                                                        color: opt.value === question.correct_answer ? '#1D4ED8' : '#374151',
                                                    }}
                                                >
                                                    <strong>{opt.value}.</strong> {opt.text}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleOpenModal(question)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: 'white',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Edit2 size={16} style={{ color: '#6B7280' }} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(question.id)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid #FECACA',
                                            backgroundColor: '#FEF2F2',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Trash2 size={16} style={{ color: '#EF4444' }} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px',
                        }}
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                width: '100%',
                                maxWidth: '600px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '24px',
                            }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#F3F4F6',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={18} style={{ color: '#6B7280' }} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>

                                {/* Title — Reading & Speaking/Writing prompts */}
                                {(activeModule === 'reading' || activeModule === 'speaking' || activeModule === 'writing') && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                                            placeholder={activeModule === 'reading' ? 'e.g. The Water Cycle' : 'Topic or prompt title'}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                border: '2px solid #E5E7EB',
                                                fontSize: '14px',
                                                outline: 'none',
                                                fontFamily: 'inherit',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* PDF Upload — Reading only */}
                                {activeModule === 'reading' && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                            Upload Passage PDF <span style={{ fontWeight: '400', color: '#9CA3AF' }}>(optional — extracts text automatically)</span>
                                        </label>
                                        {/* Drop Zone */}
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true) }}
                                            onDragLeave={() => setPdfDragOver(false)}
                                            onDrop={handlePdfDrop}
                                            onClick={() => pdfInputRef.current?.click()}
                                            style={{
                                                border: `2px dashed ${pdfDragOver ? '#8B5CF6' : '#D1D5DB'}`,
                                                borderRadius: '12px',
                                                padding: '24px',
                                                textAlign: 'center',
                                                backgroundColor: pdfDragOver ? '#F5F3FF' : '#FAFAFA',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <input
                                                ref={pdfInputRef}
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={handlePdfFileInput}
                                                style={{ display: 'none' }}
                                            />
                                            {pdfLoading ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '24px', height: '24px',
                                                        border: '3px solid #E5E7EB',
                                                        borderTop: '3px solid #8B5CF6',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite',
                                                    }} />
                                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>Extracting text from PDF...</span>
                                                </div>
                                            ) : formData.pdf_name ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                    <FileText size={24} style={{ color: '#8B5CF6' }} />
                                                    <div style={{ textAlign: 'left' }}>
                                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{formData.pdf_name}</p>
                                                        <p style={{ fontSize: '12px', color: '#22C55E', margin: 0 }}>✓ Text extracted — you may edit below</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, pdf_name: null })) }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <FileUp size={32} style={{ color: '#9CA3AF', marginBottom: '8px' }} />
                                                    <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 4px' }}>
                                                        <strong>Drag & drop a PDF</strong> or click to browse
                                                    </p>
                                                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Passage text will be extracted automatically</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        {activeModule === 'reading' ? 'Passage Text' : 'Question'}
                                    </label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                        required
                                        rows={activeModule === 'reading' ? 6 : 3}
                                        placeholder={activeModule === 'reading' ? 'Paste or type the reading passage here, or upload a PDF above...' : ''}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            outline: 'none',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Difficulty
                                    </label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData(p => ({ ...p, difficulty: parseInt(e.target.value) }))}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            backgroundColor: 'white',
                                        }}
                                    >
                                        <option value={1}>Easy</option>
                                        <option value={2}>Medium</option>
                                        <option value={3}>Hard</option>
                                    </select>
                                </div>

                                {/* Audio Upload — Listening only */}
                                {activeModule === 'listening' && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                            Audio File
                                        </label>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleAudioUpload}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: '2px dashed #E5E7EB',
                                                fontSize: '14px',
                                                backgroundColor: '#F9FAFB',
                                                cursor: 'pointer',
                                            }}
                                        />
                                        {formData.audio_data && (
                                            <div style={{ marginTop: '10px' }}>
                                                <audio
                                                    controls
                                                    src={formData.audio_data}
                                                    style={{ width: '100%', borderRadius: '8px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, audio_data: null }))}
                                                    style={{
                                                        marginTop: '6px',
                                                        fontSize: '12px',
                                                        color: '#EF4444',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                    }}
                                                >
                                                    ✕ Remove audio
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {['grammar', 'listening', 'reading'].includes(activeModule) && (
                                    <>
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
                                                Answer Options
                                            </label>
                                            {formData.options.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                                    <span style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#F3F4F6',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        color: '#374151',
                                                    }}>
                                                        {opt.value}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={opt.text}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        placeholder={`Option ${opt.value}`}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 14px',
                                                            borderRadius: '8px',
                                                            border: '2px solid #E5E7EB',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                                Correct Answer
                                            </label>
                                            <select
                                                value={formData.correct_answer}
                                                onChange={(e) => setFormData(p => ({ ...p, correct_answer: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    border: '2px solid #E5E7EB',
                                                    fontSize: '14px',
                                                    backgroundColor: 'white',
                                                }}
                                            >
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Explanation (optional)
                                    </label>
                                    <textarea
                                        value={formData.explanation}
                                        onChange={(e) => setFormData(p => ({ ...p, explanation: e.target.value }))}
                                        rows={2}
                                        placeholder="Explain why this is the correct answer..."
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            outline: 'none',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                        }}
                                    />
                                </div>

                                {saveError && (
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '12px 16px',
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        color: '#DC2626',
                                    }}>
                                        ⚠️ {saveError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        disabled={saving}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.6 : 1,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: saving ? '#9CA3AF' : `linear-gradient(135deg, ${moduleColors[activeModule]} 0%, ${moduleColors[activeModule]}99 100%)`,
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <Check size={16} />
                                        {saving ? 'Saving...' : editingQuestion ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Modal for Alerts and Confirms */}
            <Modal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ isOpen: false })}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
                theme={alertConfig.theme}
                type={alertConfig.type}
                confirmText={alertConfig.confirmText || 'OK'}
            />
        </div>
    )
}
