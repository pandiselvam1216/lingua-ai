import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, Plus, Edit2, Trash2, X, Check, Search,
    Headphones, Mic, FileText, PenTool, CheckSquare, Upload, FileUp, Eye, EyeOff,
    BookMarked, Brain, Layers, Play, Pause, Save, AlertCircle, Volume2
} from 'lucide-react'
import api from '../../services/api'
import listeningService from '../../services/listeningService'
import Modal from '../../components/common/Modal'
import AudioPlayer from '../../components/common/AudioPlayer'

const moduleIcons = {
    listening: Headphones,
    speaking: Mic,
    reading: FileText,
    writing: PenTool,
    grammar: CheckSquare,
    vocabulary: BookMarked,
    'critical-thinking': Brain,
}

const moduleColors = {
    listening: '#3B82F6',
    speaking: '#22C55E',
    reading: '#8B5CF6',
    writing: '#F97316',
    grammar: '#EF4444',
    vocabulary: '#14B8A6',
    'critical-thinking': '#06B6D4',
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
    const [availableVoices, setAvailableVoices] = useState([])
    const [sourceType, setSourceType] = useState('file') // 'file' or 'tts'
    const [listeningModules, setListeningModules] = useState([])
    const [viewMode, setViewMode] = useState('questions') // 'questions' or 'topics'
    const [showTopicModal, setShowTopicModal] = useState(false)
    const [editingTopic, setEditingTopic] = useState(null)
    const [topicSaving, setTopicSaving] = useState(false)
    const [topicForm, setTopicForm] = useState({
        title: '',
        content: '',
        category: 'conversations',
        audio_url: '',
        tts_config: { voiceName: '', rate: 1, pitch: 1 }
    })
    const [topicSource, setTopicSource] = useState('tts')

    const LISTENING_CATEGORIES = [
        { id: 'conversations', name: 'Conversations' },
        { id: 'speeches', name: 'Speeches' },
        { id: 'lectures', name: 'Lectures' },
        { id: 'stories', name: 'Stories' },
        { id: 'news', name: 'News' },
        { id: 'instructions', name: 'Instructions' },
        { id: 'interviews', name: 'Interviews' },
        { id: 'discussions', name: 'Discussions' },
        { id: 'presentations', name: 'Presentations' },
        { id: 'podcasts', name: 'Podcasts' },
        { id: 'main-ideas', name: 'Main Ideas' },
        { id: 'specific-details', name: 'Specific Details' },
        { id: 'tone-emotion', name: 'Tone & Emotion' },
        { id: 'inference', name: 'Inference' }
    ]

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
        is_published: true,  // Default to published so questions appear on user pages
        audio_data: null,  // base64 data URL for listening audio
        pdf_name: null,    // uploaded
        category: 'conversations',
        listening_module_id: '',
        tts_config: {
            voiceName: '',
            rate: 1,
            pitch: 1,
            textOverride: ''
        }
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
        loadVoices()
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [activeModule])

    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
        if (voices.length > 0 && !formData.tts_config?.voiceName) {
            setFormData(prev => ({
                ...prev,
                tts_config: { ...prev.tts_config, voiceName: voices[0].name }
            }))
        }
    }

    const normalizeQuestionSource = (item) => ({
        id: item.id,
        module_id: item.module_id,
        listening_module_id: item.listening_module_id || '',
        category: item.category || 'conversations',
        title: item.title,
        content: item.content,
        difficulty: item.difficulty || 1,
        options: item.options,
        correct_answer: item.correct_answer,
        explanation: item.explanation,
        is_published: item.is_published || false,
        is_active: item.is_active !== false,
        type: item.options ? 'mcq' : 'prompt',
        audio_data: item.media_url || null,
        pdf_name: item.pdf_name || null,
        tts_config: item.tts_config || null
    })

    const fetchQuestions = async () => {
        setLoading(true)
        if (activeModule !== 'listening') setViewMode('questions')
        
        try {
            if (activeModule === 'listening') {
                const lmResp = await api.get('/admin/listening-modules')
                setListeningModules(lmResp.data || [])
            }

            const response = await api.get(`/admin/questions?module=${activeModule}`)
            const normalized = (response.data.questions || []).map(item => normalizeQuestionSource(item))
            setQuestions(normalized)
            setUsingLocalStorage(false)
        } catch (err) {
            console.error('Failed to fetch questions:', err)
            const local = getLocalQuestions()
            setQuestions(local)
            setUsingLocalStorage(true)
        }
        setLoading(false)
    }

    const handleOpenTopicModal = (topic = null) => {
        if (topic) {
            setEditingTopic(topic)
            setTopicSource(topic.tts_config ? 'tts' : 'file')
            setTopicForm({
                title: topic.title,
                content: topic.content,
                category: topic.category || 'conversations',
                audio_url: topic.audio_url || '',
                tts_config: topic.tts_config || { voiceName: availableVoices[0]?.name || '', rate: 1, pitch: 1 }
            })
        } else {
            setEditingTopic(null)
            setTopicSource('tts')
            setTopicForm({
                title: '',
                content: '',
                category: 'conversations',
                audio_url: '',
                tts_config: { voiceName: availableVoices[0]?.name || '', rate: 1, pitch: 1 }
            })
        }
        setShowTopicModal(true)
    }

    const handleTopicSubmit = async (e) => {
        e.preventDefault()
        setTopicSaving(true)
        const submitData = {
            ...topicForm,
            tts_config: topicSource === 'tts' ? topicForm.tts_config : null,
            audio_url: topicSource === 'file' ? topicForm.audio_url : null
        }
        try {
            if (editingTopic) {
                const res = await listeningService.updateContent(editingTopic.id, submitData)
                setListeningModules(prev => prev.map(t => t.id === editingTopic.id ? res.item : t))
            } else {
                const res = await listeningService.createContent(submitData)
                setListeningModules(prev => [res.item, ...prev])
            }
            setShowTopicModal(false)
            setAlertConfig({ isOpen: true, title: 'Success', message: 'Topic saved successfully', theme: 'success', type: 'alert' })
        } catch (err) {
            console.error('Topic save failed:', err)
            setAlertConfig({ isOpen: true, title: 'Error', message: 'Failed to save topic', theme: 'danger', type: 'alert' })
        } finally {
            setTopicSaving(false)
        }
    }

    const handleDeleteTopic = async (topicId) => {
        setAlertConfig({
            isOpen: true,
            title: 'Delete Topic',
            message: 'Are you sure? This will not delete questions linked to it, but they will become unlinked.',
            theme: 'danger',
            type: 'confirm',
            confirmText: 'Delete',
            onConfirm: async () => {
                setAlertConfig({ isOpen: false })
                try {
                    await listeningService.deleteContent(topicId)
                    setListeningModules(prev => prev.filter(t => t.id !== topicId))
                } catch (err) {
                    console.error('Delete failed:', err)
                }
            }
        })
    }

    const handleTopicPreviewTTS = () => {
        const text = topicForm.content
        if (!text) return showAlert('Empty Content', 'Please enter some passage content to preview.', 'warning')

        const utterance = new SpeechSynthesisUtterance(text)
        if (topicForm.tts_config.voiceName) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === topicForm.tts_config.voiceName)
            if (voice) utterance.voice = voice
        }
        utterance.rate = topicForm.tts_config.rate
        utterance.pitch = topicForm.tts_config.pitch
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
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
                is_published: question.is_published || false,
                audio_data: question.audio_data || question.media_url || null,
                pdf_name: question.pdf_name || null,
                category: question.category || 'conversations',
                listening_module_id: question.listening_module_id || '',
                tts_config: question.tts_config || {
                    voiceName: availableVoices[0]?.name || '',
                    rate: 1,
                    pitch: 1
                }
            })
            setSourceType(question.tts_config ? 'tts' : 'file')
        } else {
            setEditingQuestion(null)
            setFormData({
                title: '',
                content: '',
                difficulty: 1,
                options: [{ text: '', value: 'A' }, { text: '', value: 'B' }, { text: '', value: 'C' }, { text: '', value: 'D' }],
                correct_answer: 'A',
                explanation: '',
                is_published: true,
                audio_data: null,
                pdf_name: null,
                category: 'conversations',
                listening_module_id: '',
                tts_config: {
                    voiceName: availableVoices[0]?.name || '',
                    rate: 1,
                    pitch: 1
                }
            })
            setSourceType('file')
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

    const handlePreviewTTS = () => {
        if (!window.speechSynthesis) return
        window.speechSynthesis.cancel()
        const textToSpeak = formData.tts_config.textOverride || formData.content || "Please enter some text to preview."
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        const voice = availableVoices.find(v => v.name === formData.tts_config.voiceName)
        if (voice) utterance.voice = voice
        utterance.rate = formData.tts_config.rate
        utterance.pitch = formData.tts_config.pitch
        window.speechSynthesis.speak(utterance)
    }

    // Convert Google Drive sharing links to direct download URLs for audio playback
    const convertDriveUrl = (url) => {
        if (!url) return url
        // Match: https://drive.google.com/file/d/FILE_ID/view?...
        const match1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
        if (match1) return `https://drive.google.com/uc?export=download&id=${match1[1]}`
        // Match: https://drive.google.com/open?id=FILE_ID
        const match2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
        if (match2) return `https://drive.google.com/uc?export=download&id=${match2[1]}`
        return url  // Return as-is for direct audio URLs
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

        const payload = {
            module_id: editingQuestion?.module_id || null,  // Will be set from active module for new questions
            content: formData.content,
            title: formData.title || null,
            difficulty: formData.difficulty,
            options: ['grammar', 'listening', 'reading'].includes(activeModule) ? formData.options : null,
            correct_answer: ['grammar', 'listening', 'reading'].includes(activeModule) ? formData.correct_answer : null,
            explanation: formData.explanation || null,
            is_published: formData.is_published,
            is_active: true,
            category: activeModule === 'listening' ? formData.category : null,
            listening_module_id: (activeModule === 'listening' && formData.listening_module_id) ? formData.listening_module_id : null,
            media_url: sourceType === 'file' 
                ? (formData.audio_data?.startsWith('data:') 
                    ? formData.audio_data   // base64 file upload — keep as-is
                    : convertDriveUrl(formData.audio_data) || null)
                : null,
            tts_config: sourceType === 'tts' ? formData.tts_config : null,
        }

        try {
            if (editingQuestion) {
                // Update existing question
                const response = await api.put(`/admin/questions/${editingQuestion.id}`, payload)
                const updated = normalizeQuestionSource(response.data.question)
                setQuestions(prev => {
                    const result = prev.map(q => q.id === updated.id ? updated : q)
                    if (usingLocalStorage) localStorage.setItem(`neuralingua_questions_${activeModule}`, JSON.stringify(result))
                    return result
                })
            } else {
                // Create new question - need to get module_id first
                const moduleResponse = await api.get(`/admin/modules`)
                const modules = moduleResponse.data || []
                const moduleSlug = activeModule === 'critical-thinking' ? 'critical-thinking' : activeModule
                const module = modules.find(m => m.slug === moduleSlug)
                
                if (!module) {
                    setSaveError('Module not found')
                    setSaving(false)
                    return
                }

                payload.module_id = module.id
                const response = await api.post(`/admin/questions`, payload)
                const created = normalizeQuestionSource(response.data.question)
                setQuestions(prev => {
                    const result = [created, ...prev]
                    if (usingLocalStorage) localStorage.setItem(`neuralingua_questions_${activeModule}`, JSON.stringify(result))
                    return result
                })
            }
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
            handleCloseModal()
        } catch (err) {
            console.error('Error saving question:', err)
            setSaveError('Failed to save question. Please try again.')
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
                    await api.delete(`/admin/questions/${questionId}`)
                } catch (err) {
                    console.error('Failed to delete question:', err)
                }
                const updated = questions.filter(q => q.id !== questionId)
                setQuestions(updated)
                if (usingLocalStorage) saveLocalQuestions(updated)
            }
        })
    }

    const filteredQuestions = questions.filter(q =>
        q.content.toLowerCase().includes(search.toLowerCase())
    )

    const filteredTopics = listeningModules.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
    )

    const handleTogglePublish = async (question) => {
        try {
            const response = await api.put(`/admin/questions/${question.id}/publish`, {
                is_published: !question.is_published
            })
            // Update the question in the list
            setQuestions(prev => prev.map(q => 
                q.id === question.id 
                    ? { ...q, is_published: response.data.question.is_published }
                    : q
            ))
        } catch (err) {
            console.error('Failed to toggle publish status:', err)
            showAlert('Error', 'Failed to update publish status')
        }
    }

    const modules = [
        { key: 'grammar', label: 'Grammar' },
        { key: 'listening', label: 'Listening' },
        { key: 'speaking', label: 'Speaking' },
        { key: 'reading', label: 'Reading' },
        { key: 'writing', label: 'Writing' },
        { key: 'vocabulary', label: 'Vocabulary' },
        { key: 'critical-thinking', label: 'Critical Thinking' },
    ]

    return (
        <div style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}>
            {/* Local Storage Mode Banner - Made more general */}
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
                        <strong>Connection Issue:</strong> Currently showing locally saved questions. Please check if the backend server is running correctly or if your internet connection is stable.<br />
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
 
                <div style={{ display: 'flex', gap: '12px' }}>
                    {activeModule === 'listening' && (
                        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
                            <button
                                onClick={() => setViewMode('questions')}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    backgroundColor: viewMode === 'questions' ? 'white' : 'transparent',
                                    color: viewMode === 'questions' ? '#111827' : '#6B7280',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    boxShadow: viewMode === 'questions' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Questions
                            </button>
                            <button
                                onClick={() => setViewMode('topics')}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    backgroundColor: viewMode === 'topics' ? 'white' : 'transparent',
                                    color: viewMode === 'topics' ? '#111827' : '#6B7280',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    boxShadow: viewMode === 'topics' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                Passages/Topics
                            </button>
                        </div>
                    )}
                    <button
                        onClick={viewMode === 'topics' ? () => handleOpenTopicModal() : () => handleOpenModal()}
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
                        {viewMode === 'topics' ? 'Add Topic' : 'Add Question'}
                    </button>
                </div>
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

            {/* Main Content Area */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            border: '4px solid #E5E7EB',
                            borderTop: `4px solid ${moduleColors[activeModule]}`,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto',
                        }} />
                    </div>
                ) : viewMode === 'topics' ? (
                    /* Topics List View */
                    <div style={{ overflowX: 'auto' }}>
                        {filteredTopics.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
                                <Headphones size={48} style={{ marginBottom: '16px', opacity: 0.2, margin: '0 auto 16px' }} />
                                <p>No listening topics found.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Title & Passage</th>
                                        <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Source</th>
                                        <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Created</th>
                                        <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTopics.map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{item.title}</div>
                                                <div style={{ fontSize: '13px', color: '#6B7280', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {item.content}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                {item.tts_config ? (
                                                    <span style={{ padding: '4px 10px', backgroundColor: '#EEF2FF', color: '#4F46E5', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>AI TTS</span>
                                                ) : (
                                                    <span style={{ padding: '4px 10px', backgroundColor: '#F0FDF4', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>Audio File</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B7280' }}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button onClick={() => handleOpenTopicModal(item)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Edit2 size={16} style={{ color: '#4B5563' }} />
                                                    </button>
                                                    <button onClick={() => handleDeleteTopic(item.id)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Trash2 size={16} style={{ color: '#EF4444' }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    /* Questions List View */
                    <div>
                        {filteredQuestions.length === 0 ? (
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
                                                {activeModule === 'listening' && question.category && (
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#EDE9FE',
                                                        color: '#7C3AED',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {question.category}
                                                    </span>
                                                )}
                                                {activeModule === 'listening' && question.listening_module_id && (
                                                    <span style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                                                        Linked to: {listeningModules.find(m => m.id === question.listening_module_id)?.title || 'Selected Passage'}
                                                    </span>
                                                )}
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
                                                onClick={() => handleTogglePublish(question)}
                                                title={question.is_published ? 'Unpublish question' : 'Publish question'}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: question.is_published ? '1px solid #E0E7FF' : '1px solid #E5E7EB',
                                                    backgroundColor: question.is_published ? '#EFF6FF' : 'white',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {question.is_published ? 
                                                    <Eye size={16} style={{ color: '#3B82F6' }} /> : 
                                                    <EyeOff size={16} style={{ color: '#9CA3AF' }} />
                                                }
                                            </button>
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

                                {/* Title — Reading, Listening & Speaking/Writing prompts */}
                                {(activeModule === 'reading' || activeModule === 'listening' || activeModule === 'speaking' || activeModule === 'writing') && (
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

                                {/* Listening Fields: Category & Module Link */}
                                {activeModule === 'listening' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                                Category
                                            </label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    border: '2px solid #E5E7EB',
                                                    fontSize: '14px',
                                                    backgroundColor: 'white'
                                                }}
                                            >
                                                {LISTENING_CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                                Link to Audio Passage
                                            </label>
                                            <select
                                                value={formData.listening_module_id}
                                                onChange={(e) => setFormData(p => ({ ...p, listening_module_id: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    border: '2px solid #E5E7EB',
                                                    fontSize: '14px',
                                                    backgroundColor: 'white'
                                                }}
                                            >
                                                <option value="">-- No passage (Short Item) --</option>
                                                {listeningModules.map(lm => (
                                                    <option key={lm.id} value={lm.id}>{lm.title}</option>
                                                ))}
                                            </select>
                                        </div>
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

                                {/* Audio Configuration */}
                                {/* Audio Configuration - Only for Listening module or if explicitly enabled */}
                                {(activeModule === 'listening' || activeModule === 'vocabulary') && (
                                    <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
                                            <Headphones size={18} style={{ color: '#3B82F6' }} /> Audio Configuration
                                        </label>

                                        {/* Source Type Toggle */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSourceType('file')}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid',
                                                    borderColor: sourceType === 'file' ? '#3B82F6' : '#E2E8F0',
                                                    backgroundColor: sourceType === 'file' ? '#EFF6FF' : 'white',
                                                    color: sourceType === 'file' ? '#2563EB' : '#64748B',
                                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                📁 Audio File
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSourceType('tts')}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid',
                                                    borderColor: sourceType === 'tts' ? '#3B82F6' : '#E2E8F0',
                                                    backgroundColor: sourceType === 'tts' ? '#EFF6FF' : 'white',
                                                    color: sourceType === 'tts' ? '#2563EB' : '#64748B',
                                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                ✨ AI Voice (TTS)
                                            </button>
                                        </div>

                                        {sourceType === 'file' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* Tab selector: Upload vs URL */}
                                                <div style={{ display: 'flex', gap: '0', borderRadius: '10px', overflow: 'hidden', border: '2px solid #E5E7EB' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, _audioMode: 'upload' }))}
                                                        style={{
                                                            flex: 1, padding: '10px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                            backgroundColor: (formData._audioMode || 'upload') === 'upload' ? '#3B82F6' : 'white',
                                                            color: (formData._audioMode || 'upload') === 'upload' ? 'white' : '#6B7280',
                                                        }}
                                                    >
                                                        Upload File
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, _audioMode: 'url' }))}
                                                        style={{
                                                            flex: 1, padding: '10px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                            borderLeft: '2px solid #E5E7EB',
                                                            backgroundColor: formData._audioMode === 'url' ? '#3B82F6' : 'white',
                                                            color: formData._audioMode === 'url' ? 'white' : '#6B7280',
                                                        }}
                                                    >
                                                        Paste URL
                                                    </button>
                                                </div>

                                                {/* Upload File mode */}
                                                {(formData._audioMode || 'upload') === 'upload' && (
                                                    <input
                                                        type="file" accept="audio/*" onChange={handleAudioUpload}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px dashed #CBD5E1', fontSize: '13px', backgroundColor: 'white' }}
                                                    />
                                                )}

                                                {/* Paste URL mode */}
                                                {formData._audioMode === 'url' && (
                                                    <input
                                                        type="url"
                                                        value={formData.audio_data?.startsWith('data:') ? '' : (formData.audio_data || '')}
                                                        onChange={(e) => setFormData(p => ({ ...p, audio_data: e.target.value }))}
                                                        placeholder="Paste Google Drive link or direct audio URL"
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #E2E8F0', fontSize: '13px' }}
                                                    />
                                                )}

                                                {/* Audio preview */}
                                                {formData.audio_data && (
                                                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                        {formData.audio_data.startsWith('data:') ? (
                                                            <audio controls src={formData.audio_data} style={{ width: '100%', height: '32px' }} />
                                                        ) : (
                                                            <a href={convertDriveUrl(formData.audio_data)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#3B82F6' }}>🔗 Test audio link</a>
                                                        )}
                                                        <button type="button" onClick={() => setFormData(p => ({ ...p, audio_data: null }))} style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>AI Voice</label>
                                                        <select
                                                            value={formData.tts_config.voiceName}
                                                            onChange={(e) => setFormData(p => ({ ...p, tts_config: { ...p.tts_config, voiceName: e.target.value } }))}
                                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                                                        >
                                                            {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            onClick={handlePreviewTTS}
                                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#3B82F6', color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                                        >
                                                            🔊 Preview Voice
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Text for AI Voice (Optional)</label>
                                                    <textarea
                                                        value={formData.tts_config.textOverride || ''}
                                                        onChange={(e) => setFormData(p => ({ ...p, tts_config: { ...p.tts_config, textOverride: e.target.value } }))}
                                                        placeholder="If empty, it will read the main question content."
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', minHeight: '80px', resize: 'vertical' }}
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <label style={{ fontSize: '12px', color: '#64748B' }}>Speed</label>
                                                            <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 'bold' }}>{formData.tts_config.rate}x</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0.5" max="2" step="0.1"
                                                            value={formData.tts_config.rate}
                                                            onChange={(e) => setFormData(p => ({ ...p, tts_config: { ...p.tts_config, rate: parseFloat(e.target.value) } }))}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <label style={{ fontSize: '12px', color: '#64748B' }}>Tune</label>
                                                            <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 'bold' }}>{formData.tts_config.pitch}</span>
                                                        </div>
                                                        <input
                                                            type="range" min="0" max="2" step="0.1"
                                                            value={formData.tts_config.pitch}
                                                            onChange={(e) => setFormData(p => ({ ...p, tts_config: { ...p.tts_config, pitch: parseFloat(e.target.value) } }))}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                </div>
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

                                <div style={{
                                    marginBottom: '24px',
                                    padding: '16px',
                                    backgroundColor: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <input
                                        type="checkbox"
                                        id="is_published"
                                        checked={formData.is_published}
                                        onChange={(e) => setFormData(p => ({ ...p, is_published: e.target.checked }))}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <label htmlFor="is_published" style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#166534',
                                        cursor: 'pointer',
                                        margin: 0,
                                    }}>
                                        Publish to students (visible in learning modules)
                                    </label>
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

            {/* Topic Management Modal */}
            <AnimatePresence>
                {showTopicModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1000, padding: '20px'
                        }}
                        onClick={() => setShowTopicModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                backgroundColor: 'white', borderRadius: '16px', padding: '32px',
                                width: '100%', maxWidth: '600px', maxHeight: '90vh',
                                overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    {editingTopic ? 'Edit Listening Topic' : 'Add Listening Topic'}
                                </h2>
                                <button onClick={() => setShowTopicModal(false)} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer' }}>
                                    <X size={18} style={{ color: '#6B7280' }} />
                                </button>
                            </div>

                            <form onSubmit={handleTopicSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Title</label>
                                    <input
                                        type="text" required
                                        value={topicForm.title}
                                        onChange={(e) => setTopicForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Daily Conversation about weather"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Category</label>
                                    <select
                                        value={topicForm.category}
                                        onChange={(e) => setTopicForm(p => ({ ...p, category: e.target.value }))}
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px', backgroundColor: 'white' }}
                                    >
                                        {LISTENING_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Passage Content / Text</label>
                                    <textarea
                                        required rows={6}
                                        value={topicForm.content}
                                        onChange={(e) => setTopicForm(p => ({ ...p, content: e.target.value }))}
                                        placeholder="The actual text of the passage..."
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setTopicSource('tts')}
                                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: topicSource === 'tts' ? '#EFF6FF' : 'white', color: topicSource === 'tts' ? '#2563EB' : '#6B7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            <Volume2 size={16} style={{ display: 'inline', marginRight: '4px' }} /> AI Voice
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTopicSource('file')}
                                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: topicSource === 'file' ? '#EFF6FF' : 'white', color: topicSource === 'file' ? '#2563EB' : '#6B7280', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            <Upload size={16} style={{ display: 'inline', marginRight: '4px' }} /> Audio File
                                        </button>
                                    </div>

                                    {topicSource === 'tts' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Voice</label>
                                                <select
                                                    value={topicForm.tts_config.voiceName}
                                                    onChange={(e) => setTopicForm(p => ({ ...p, tts_config: { ...p.tts_config, voiceName: e.target.value } }))}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                                                >
                                                    {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <button type="button" onClick={handleTopicPreviewTTS} style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#3B82F6', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}>
                                                    🔊 Preview
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Audio Data URL (Base64)</label>
                                            <input
                                                type="text"
                                                value={topicForm.audio_url || ''}
                                                onChange={(e) => setTopicForm(p => ({ ...p, audio_url: e.target.value }))}
                                                placeholder="Paste base64 or URL here..."
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button" onClick={() => setShowTopicModal(false)} disabled={topicSaving}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit" disabled={topicSaving}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                            background: `linear-gradient(135deg, ${moduleColors.listening} 0%, ${moduleColors.listening}99 100%)`,
                                            color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Check size={16} /> {topicSaving ? 'Saving...' : editingTopic ? 'Update' : 'Create'}
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
