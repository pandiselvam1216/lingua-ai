import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Info } from 'lucide-react'

export default function ModuleRulesModal({
    isOpen,
    onClose,
    title = 'Module Instructions',
    description = 'Here is how this module works:',
    rules = []
}) {

    // Handle escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'relative',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            width: '100%',
                            maxWidth: '500px',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header Image/Gradient Area */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                            padding: '32px 24px',
                            textAlign: 'center',
                            position: 'relative'
                        }}>
                             <button
                                onClick={onClose}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'white',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.4)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                            >
                                <X size={20} />
                            </button>

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto',
                            }}>
                                <Info size={32} style={{ color: 'white' }} />
                            </div>

                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: 'white',
                                margin: '0 0 8px 0',
                            }}>
                                {title}
                            </h2>
                            <p style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.8)',
                                margin: 0,
                                lineHeight: '1.5',
                            }}>
                                {description}
                            </p>
                        </div>

                        {/* Rules Area */}
                        <div style={{ padding: '32px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {rules.map((rule, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        padding: '16px',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: '12px',
                                        border: '1px solid #F3F4F6'
                                    }}>
                                        <div style={{
                                            flexShrink: 0,
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: '#DBEAFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#2563EB',
                                            fontSize: '12px',
                                            fontWeight: '700'
                                        }}>
                                            {index + 1}
                                        </div>
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#374151',
                                            margin: 0,
                                            lineHeight: '1.6',
                                            fontWeight: '500'
                                        }}>
                                            {rule}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#F9FAFB',
                            display: 'flex',
                            justifyContent: 'center',
                            borderTop: '1px solid #F3F4F6',
                        }}>
                             <button
                                onClick={onClose}
                                style={{
                                    padding: '12px 32px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                                    width: '100%',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Got it, let's start!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
