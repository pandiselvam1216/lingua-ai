import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Square, Volume2, Clock } from 'lucide-react'

export default function AudioPlayer({ src, ttsConfig, text }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = useRef(null)
    const utteranceRef = useRef(null)

    useEffect(() => {
        // Handle normal audio file
        if (src) {
            const audio = audioRef.current
            if (!audio) return

            const setAudioData = () => setDuration(audio.duration)
            const setAudioTime = () => setCurrentTime(audio.currentTime)

            audio.addEventListener('loadeddata', setAudioData)
            audio.addEventListener('timeupdate', setAudioTime)
            audio.addEventListener('ended', () => setIsPlaying(false))

            return () => {
                audio.removeEventListener('loadeddata', setAudioData)
                audio.removeEventListener('timeupdate', setAudioTime)
            }
        } 
        // Handle TTS fallback if no source URL is provided
        else if (text) {
            // We estimate duration based on text length and rate (average 150 words per minute)
            const rate = ttsConfig?.rate || 1
            const words = text.split(' ').length
            const estimatedDuration = (words / (150 * rate)) * 60
            setDuration(estimatedDuration)
            setCurrentTime(0)
        }
    }, [src, ttsConfig, text])

    // Cleanup TTS on unmount
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    const togglePlay = () => {
        if (src) {
            if (isPlaying) audioRef.current.pause()
            else audioRef.current.play()
            setIsPlaying(!isPlaying)
        } else if (text) {
            if (isPlaying) {
                window.speechSynthesis.pause()
                setIsPlaying(false)
            } else {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume()
                } else {
                    window.speechSynthesis.cancel() // Stop any current speech
                    
                    // Unstick the engine if it was paused from a previous tab or error
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume()
                    }
                    
                    const utterance = new SpeechSynthesisUtterance(text)
                    
                    // Apply config if provided
                    if (ttsConfig) {
                        if (ttsConfig.voiceName) {
                            const voices = window.speechSynthesis.getVoices()
                            utterance.voice = voices.find(v => v.name === ttsConfig.voiceName)
                        }
                        utterance.rate = ttsConfig.rate || 1
                        utterance.pitch = ttsConfig.pitch || 1
                    } else {
                        utterance.rate = 1
                        utterance.pitch = 1
                    }
                    
                    utterance.onend = () => {
                        setIsPlaying(false)
                        setCurrentTime(0)
                    }
                    utterance.onboundary = (event) => {
                        // Approximate progress based on character index for better user feedback
                        const progress = (event.charIndex / text.length) * duration
                        setCurrentTime(progress)
                    }
                    
                    utteranceRef.current = utterance
                    window.speechSynthesis.speak(utterance)
                }
                setIsPlaying(true)
            }
        }
    }

    const stop = () => {
        if (src) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        } else {
            window.speechSynthesis.cancel()
            setCurrentTime(0)
        }
        setIsPlaying(false)
    }

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00'
        const mins = Math.floor(time / 60)
        const secs = Math.floor(time % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleProgressChange = (e) => {
        const time = Number(e.target.value)
        audioRef.current.currentTime = time
        setCurrentTime(time)
    }

    return (
        <div style={{
            backgroundColor: '#F3F4F6', borderRadius: '16px', padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #E5E7EB'
        }}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={togglePlay}
                        style={{
                            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                            backgroundColor: '#3B82F6', color: 'white', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)', transition: 'transform 0.2s'
                        }}
                    >
                        {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: '2px' }} />}
                    </button>
                    <button
                        onClick={stop}
                        style={{
                            width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #E5E7EB',
                            backgroundColor: 'white', color: '#6B7280', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                    >
                        <Square size={18} fill="#6B7280" />
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleProgressChange}
                        style={{
                            width: '100%', height: '6px', backgroundColor: '#D1D5DB',
                            borderRadius: '3px', cursor: 'pointer', accentColor: '#3B82F6'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
