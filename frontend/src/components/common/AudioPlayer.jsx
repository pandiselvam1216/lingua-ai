import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

/**
 * Reusable Audio Player component with custom UI
 * @param {Object} props
 * @param {string} props.src - URL or base64 audio source
 * @param {string} props.title - Title displayed above player
 * @param {boolean} props.disabled - Whether player is interactive
 */
export default function AudioPlayer({ src, title = 'Audio Clip', disabled = false }) {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [isMuted, setIsMuted] = useState(false)

    // Reset when src changes
    useEffect(() => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        setDuration(0)
    }, [src])

    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted
    }, [isMuted])

    const handlePlayPause = () => {
        const audio = audioRef.current
        if (!audio || disabled || !src) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        const audio = audioRef.current
        if (!audio) return
        setCurrentTime(audio.currentTime)
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration)
    }

    const handleEnded = () => {
        setIsPlaying(false)
        setProgress(100)
    }

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const isPlayable = src && !disabled

    return (
        <div style={{
            background: 'linear-gradient(135deg, #166534 0%, #22C55E 100%)',
            padding: '32px',
            borderRadius: '16px 16px 0 0',
        }}>
            {/* Hidden native audio element */}
            {src && (
                <audio
                    ref={audioRef}
                    src={src}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    muted={isMuted}
                />
            )}

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: '0 0 16px', fontWeight: '500' }}>
                {src ? `🎵 ${title}` : 'No audio available'}
            </p>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '24px',
            }}>
                {/* Mute Button */}
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    disabled={!isPlayable}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        cursor: isPlayable ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        opacity: isPlayable ? 1 : 0.4,
                    }}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                {/* Play/Pause Button */}
                <motion.button
                    onClick={handlePlayPause}
                    disabled={!isPlayable}
                    whileHover={isPlayable ? { scale: 1.05 } : {}}
                    whileTap={isPlayable ? { scale: 0.95 } : {}}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'white',
                        cursor: isPlayable ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                        opacity: isPlayable ? 1 : 0.5,
                    }}
                >
                    {isPlaying ? (
                        <Pause size={32} style={{ color: '#166534' }} />
                    ) : (
                        <Play size={32} style={{ color: '#166534', marginLeft: '4px' }} />
                    )}
                </motion.button>

                {/* Placeholder to balance the flex layout */}
                <div style={{ width: '48px' }} />
            </div>

            {/* Progress Slider */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{
                    height: '6px',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: 'white',
                        borderRadius: '3px',
                        transition: 'width 0.1s linear',
                    }} />
                </div>
            </div>

            {/* Time stamps */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
                fontWeight: '500',
            }}>
                <span>{formatTime(currentTime)}</span>
                <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
        </div>
    )
}
