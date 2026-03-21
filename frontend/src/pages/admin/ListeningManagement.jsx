import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Headphones, Plus, Edit2, Trash2, X, Check, Search,
    Upload, Play, Square, Pause, Save, AlertCircle, Volume2, Mic,
    Layers
} from 'lucide-react'
import listeningService from '../../services/listeningService'
import Modal from '../../components/common/Modal'

export default function ListeningManagement() {
    const [contentList, setContentList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [uploading, setUploading] = useState(false)
    const [availableVoices, setAvailableVoices] = useState([])

    const [sourceType, setSourceType] = useState('tts') // 'file' or 'tts'
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'conversations',
        audio_url: '',
        tts_config: {
            voiceName: '',
            rate: 1,
            pitch: 1
        }
    })

    useEffect(() => {
        fetchContent()
        loadVoices()
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
        if (voices.length > 0 && !formData.tts_config.voiceName) {
            setFormData(prev => ({
                ...prev,
                tts_config: { ...prev.tts_config, voiceName: voices[0].name }
            }))
        }
    }

    const fetchContent = async () => {
        setLoading(true)
        try {
            const data = await listeningService.getAllContent()
            setContentList(data)
        } catch (err) {
            console.error('Failed to fetch listening content:', err)
            setError('Failed to load content from server.')
        }
        setLoading(false)
    }

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item)
            setSourceType(item.tts_config ? 'tts' : 'file')
            setFormData({
                title: item.title,
                content: item.content,
                category: item.category || 'conversations',
                audio_url: item.audio_url || '',
                tts_config: item.tts_config || {
                    voiceName: availableVoices[0]?.name || '',
                    rate: 1,
                    pitch: 1
                }
            })
        } else {
            setEditingItem(null)
            setSourceType('tts')
            setFormData({
                title: '',
                content: '',
                category: 'conversations',
                audio_url: '',
                tts_config: {
                    voiceName: availableVoices[0]?.name || '',
                    rate: 1,
                    pitch: 1
                }
            })
        }
        setError('')
        setShowModal(true)
    }

    const handleCloseModal = () => {
        if (saving || uploading) return
        if (window.speechSynthesis) window.speechSynthesis.cancel()
        setShowModal(false)
        setEditingItem(null)
    }

    const handleAudioUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('audio/')) {
            setError('Please upload a valid audio file (mp3, wav, etc.)')
            return
        }

        setUploading(true)
        setError('')
        try {
            const publicUrl = await listeningService.uploadAudio(file)
            setFormData(prev => ({ ...prev, audio_url: publicUrl }))
            setSuccess('Audio uploaded successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Upload failed:', err)
            setError('Failed to upload audio to storage.')
        } finally {
            setUploading(false)
        }
    }

    const handlePreviewTTS = () => {
        if (!formData.content) {
            setError('Please enter some passage content to preview.')
            return
        }
        
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(formData.content.substring(0, 300)) // Preview first 300 chars
        if (formData.tts_config.voiceName) {
            utterance.voice = availableVoices.find(v => v.name === formData.tts_config.voiceName)
        }
        utterance.rate = formData.tts_config.rate
        utterance.pitch = formData.tts_config.pitch
        
        window.speechSynthesis.speak(utterance)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.title || !formData.content) {
            setError('Title and content are required.')
            return
        }

        if (sourceType === 'file' && !formData.audio_url) {
            setError('Please upload an audio file or switch to TTS.')
            return
        }

        const submitData = {
            ...formData,
            tts_config: sourceType === 'tts' ? formData.tts_config : null,
            audio_url: sourceType === 'file' ? formData.audio_url : null
        }

        setSaving(true)
        setError('')
        try {
            if (editingItem) {
                const updated = await listeningService.updateContent(editingItem.id, submitData)
                setContentList(prev => prev.map(item => item.id === editingItem.id ? updated.item : item))
                setSuccess('Content updated successfully!')
            } else {
                const created = await listeningService.createContent(submitData)
                setContentList(prev => [created.item, ...prev])
                setSuccess('New content created successfully!')
            }
            setTimeout(() => setSuccess(''), 3000)
            handleCloseModal()
        } catch (err) {
            console.error('Save failed:', err)
            setError('Failed to save content. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this listening content?')) return

        try {
            await listeningService.deleteContent(id)
            setContentList(prev => prev.filter(item => item.id !== id))
            setSuccess('Content deleted successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Delete failed:', err)
            setError('Failed to delete content.')
        }
    }

    const filteredList = contentList.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ padding: '24px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Headphones size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Listening Module Management</h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>Add and manage listening passages (TTS or File)</p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        padding: '12px 24px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    }}
                >
                    <Plus size={18} />
                    Add Listening Content
                </button>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
                            padding: '14px 20px', backgroundColor: '#22C55E', color: 'white',
                            borderRadius: '12px', boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
                            fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        <Check size={18} /> {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Bar */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or passage content..."
                        style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: '10px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '14px' }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', margin: '0 auto' }}></div>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                        <Headphones size={48} style={{ marginBottom: '16px', opacity: 0.2, margin: '0 auto 16px' }} />
                        <p>No listening content found. Click "Add" to create one.</p>
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
                            {filteredList.map((item) => (
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
                                            <button onClick={() => handleOpenModal(item)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Edit2 size={16} style={{ color: '#4B5563' }} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                    {editingItem ? 'Edit Listening Content' : 'Add Listening Content'}
                                </h2>
                                <button onClick={handleCloseModal} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer' }}>
                                    <X size={18} style={{ color: '#6B7280' }} />
                                </button>
                            </div>

                            {error && (
                                <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B', fontSize: '14px' }}>
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g. Conversation at the Airport"
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', outline: 'none', fontSize: '14px' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Listening Passage Content</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Enter the full text of the listening passage here..."
                                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', outline: 'none', fontSize: '14px', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Category</label>
                                    <div style={{ position: 'relative' }}>
                                        <Layers size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: '10px', border: '1.5px solid #E5E7EB', outline: 'none', fontSize: '14px', appearance: 'none', backgroundColor: 'white' }}
                                        >
                                            <option value="conversations">Conversations</option>
                                            <option value="speeches">Speeches</option>
                                            <option value="lectures">Lectures</option>
                                            <option value="stories">Stories</option>
                                            <option value="news">News</option>
                                            <option value="instructions">Instructions</option>
                                            <option value="interviews">Interviews</option>
                                            <option value="discussions">Discussions</option>
                                            <option value="presentations">Presentations</option>
                                            <option value="podcasts">Podcasts</option>
                                            <option value="main-ideas">Main Ideas</option>
                                            <option value="specific-details">Specific Details</option>
                                            <option value="tone-emotion">Tone & Emotion</option>
                                            <option value="inference">Inference</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Audio Source Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setSourceType('tts')}
                                            style={{
                                                padding: '12px', borderRadius: '10px', border: '1.5px solid',
                                                borderColor: sourceType === 'tts' ? '#3B82F6' : '#E5E7EB',
                                                backgroundColor: sourceType === 'tts' ? '#EFF6FF' : 'white',
                                                color: sourceType === 'tts' ? '#1D4ED8' : '#6B7280',
                                                fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Mic size={18} /> AI Text-to-Speech
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSourceType('file')}
                                            style={{
                                                padding: '12px', borderRadius: '10px', border: '1.5px solid',
                                                borderColor: sourceType === 'file' ? '#3B82F6' : '#E5E7EB',
                                                backgroundColor: sourceType === 'file' ? '#EFF6FF' : 'white',
                                                color: sourceType === 'file' ? '#1D4ED8' : '#6B7280',
                                                fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Upload size={18} /> Audio File Upload
                                        </button>
                                    </div>
                                </div>

                                {/* TTS Configuration Section */}
                                <AnimatePresence mode="wait">
                                    {sourceType === 'tts' ? (
                                        <motion.div
                                            key="tts-config"
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', marginBottom: '24px' }}
                                        >
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Volume2 size={18} style={{ color: '#3B82F6' }} /> AI Speaker Configuration
                                            </h3>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>Select Voice</label>
                                                    <select
                                                        value={formData.tts_config.voiceName}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, tts_config: { ...prev.tts_config, voiceName: e.target.value } }))}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: 'white' }}
                                                    >
                                                        {availableVoices.map(voice => (
                                                            <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                                                            Speed (Rate) <span>{formData.tts_config.rate}x</span>
                                                        </label>
                                                        <input
                                                            type="range" min="0.5" max="2" step="0.1"
                                                            value={formData.tts_config.rate}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, tts_config: { ...prev.tts_config, rate: parseFloat(e.target.value) } }))}
                                                            style={{ width: '100%', accentColor: '#3B82F6' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>
                                                            Pitch (Tone) <span>{formData.tts_config.pitch}</span>
                                                        </label>
                                                        <input
                                                            type="range" min="0.5" max="2" step="0.1"
                                                            value={formData.tts_config.pitch}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, tts_config: { ...prev.tts_config, pitch: parseFloat(e.target.value) } }))}
                                                            style={{ width: '100%', accentColor: '#10B981' }}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handlePreviewTTS}
                                                    style={{
                                                        marginTop: '8px', padding: '10px', borderRadius: '8px', border: '1px solid #3B82F6',
                                                        backgroundColor: 'white', color: '#3B82F6', fontWeight: '600', fontSize: '13px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                                                    }}
                                                >
                                                    <Play size={16} fill="#3B82F6" /> Preview AI Voice
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="file-config"
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            style={{ marginBottom: '24px' }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {formData.audio_url && (
                                                    <div style={{ padding: '12px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369A1', fontSize: '13px' }}>
                                                            <Check size={16} /> Audio file linked
                                                        </div>
                                                        <audio src={formData.audio_url} controls style={{ height: '24px', maxWidth: '150px' }} />
                                                    </div>
                                                )}
                                                
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="file" accept="audio/*" onChange={handleAudioUpload}
                                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                    />
                                                    <div style={{
                                                        padding: '16px', border: '2px dashed #D1D5DB', borderRadius: '12px', textAlign: 'center',
                                                        backgroundColor: uploading ? '#F9FAFB' : 'white', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                                    }}>
                                                        {uploading ? (
                                                            <>
                                                                <div className="animate-spin" style={{ width: '20px', height: '20px', border: '3px solid #E5E7EB', borderTop: '3px solid #3B82F6', borderRadius: '50%' }}></div>
                                                                <span style={{ fontSize: '14px', color: '#6B7280' }}>Uploading...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload size={24} style={{ color: '#9CA3AF' }} />
                                                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                                                    {formData.audio_url ? 'Change Audio File' : 'Click to Upload Audio'}
                                                                </span>
                                                                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>MP3, WAV up to 10MB</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || uploading}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                            backgroundColor: '#3B82F6', color: 'white', fontWeight: '600', cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                                            opacity: (saving || uploading) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        {saving ? 'Saving...' : (editingItem ? 'Update Content' : 'Save Content')}
                                        <Save size={18} />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
