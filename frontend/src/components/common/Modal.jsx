import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'

// theme: 'danger' | 'info' | 'success' | 'warning'
// type: 'confirm' (OK/Cancel) | 'alert' (OK only)
export default function Modal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    theme = 'info',
    type = 'alert',
    confirmText = 'OK',
    cancelText = 'Cancel',
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

    const themeStyles = {
        danger: {
            icon: <AlertTriangle size={24} style={{ color: '#EF4444' }} />,
            iconBg: '#FEE2E2',
            confirmBg: '#EF4444',
            confirmHover: '#DC2626',
        },
        info: {
            icon: <Info size={24} style={{ color: '#3B82F6' }} />,
            iconBg: '#EFF6FF',
            confirmBg: '#3B82F6',
            confirmHover: '#2563EB',
        },
        success: {
            icon: <CheckCircle size={24} style={{ color: '#22C55E' }} />,
            iconBg: '#DCFCE7',
            confirmBg: '#22C55E',
            confirmHover: '#16A34A',
        },
        warning: {
            icon: <AlertTriangle size={24} style={{ color: '#F59E0B' }} />,
            iconBg: '#FEF3C7',
            confirmBg: '#F59E0B',
            confirmHover: '#D97706',
        }
    }

    const currentTheme = themeStyles[theme] || themeStyles.info

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
                            maxWidth: '400px',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Close button (top right) */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#9CA3AF',
                                padding: '4px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                {/* Icon */}
                                <div style={{
                                    flexShrink: 0,
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: currentTheme.iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {currentTheme.icon}
                                </div>

                                {/* Text content */}
                                <div style={{ paddingTop: '6px' }}>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#111827',
                                        margin: '0 0 8px 0',
                                    }}>
                                        {title}
                                    </h3>
                                    <p style={{
                                        fontSize: '14px',
                                        color: '#4B5563',
                                        margin: 0,
                                        lineHeight: '1.5',
                                        whiteSpace: 'pre-line',
                                    }}>
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Actions) */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#F9FAFB',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            borderTop: '1px solid #F3F4F6',
                        }}>
                            {type === 'confirm' && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                    {cancelText}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (onConfirm) onConfirm()
                                    if (type === 'alert') onClose()
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: currentTheme.confirmBg,
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = currentTheme.confirmHover}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = currentTheme.confirmBg}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
