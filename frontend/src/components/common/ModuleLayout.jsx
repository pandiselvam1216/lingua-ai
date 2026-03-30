import React from 'react'
import { motion } from 'framer-motion'
import { Headphones, Check, Award, Info } from 'lucide-react'
import ModuleRulesModal from './ModuleRulesModal'

/**
 * Reusable shell for Learning Modules (Listening, Speaking, Reading, etc.)
 * Reduces ~200 lines of boilerplate per module page.
 */
export default function ModuleLayout({
    icon: Icon = Headphones,
    iconColor = '#22C55E',
    iconBgBase = '#22C55E',
    iconBgHover = '#166534',
    title,
    description,
    score,
    totalScore,
    questions,
    currentIndex,
    completedQuestions = [],
    onSelectQuestion,
    onShowRules,
    showRules,
    onCloseRules,
    rulesList = [],
    onBack,
    children
}) {
    const questionProgress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

    if (!questions || questions.length === 0) {
        return (
            <div style={{ padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                <div className="card" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', position: 'relative'
                }}>
                    <button onClick={() => onBack ? onBack() : window.history.back()} style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> Go Back
                    </button>
                    <Icon size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>No {title.toLowerCase()} exercises available</h3>
                    <p style={{ color: '#6B7280', marginTop: '8px' }}>Check back later for new content.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container" style={{ padding: '24px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${iconBgBase} 0%, ${iconBgHover} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={24} style={{ color: 'white' }} />
                </div>
                <div>
                    <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>{title}</h1>
                    <p style={{ color: '#6B7280', margin: 0 }}>{description}</p>
                </div>
            </div>

            {/* Score & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <button
                    onClick={onShowRules}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                        backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px',
                        color: '#4B5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                >
                    <Info size={16} /> Instructions
                </button>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px',
                    backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <Award size={24} style={{ color: '#F59E0B' }} />
                    <div>
                        <p style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            {score}/{totalScore}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>Correct</p>
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid-sidebar">
                {/* Questions Sidebar */}
                <div className="card" style={{ 
                    padding: '16px', 
                    height: 'fit-content',
                    maxHeight: '400px', // Prevent sidebar from being too long on mobile
                    overflowY: 'auto'
                }}>
                    <h3 style={{
                        fontSize: '12px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase',
                        letterSpacing: '0.1em', marginBottom: '12px',
                    }}>
                        Exercise List
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {questions.map((q, idx) => (
                            <motion.button
                                key={q.id || idx}
                                onClick={() => onSelectQuestion(idx)}
                                whileHover={{ x: 4 }}
                                style={{
                                    padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                    backgroundColor: currentIndex === idx ? '#F0FDF4' : 'transparent',
                                    borderLeft: currentIndex === idx ? `3px solid ${iconColor}` : '3px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    minHeight: '40px' // Touch target size
                                }}
                            >
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <p style={{
                                        fontSize: '13px', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                                        fontWeight: currentIndex === idx ? '600' : '500',
                                        color: currentIndex === idx ? iconBgHover : '#4B5563',
                                    }}>
                                        {q.title || `Question ${idx + 1}`}
                                    </p>
                                    {q.category && (
                                        <p style={{ 
                                            fontSize: '11px', margin: '2px 0 0 0', textTransform: 'uppercase', 
                                            letterSpacing: '0.05em', color: currentIndex === idx ? iconColor : '#9CA3AF' 
                                        }}>
                                            {q.category}
                                        </p>
                                    )}
                                </div>
                                {completedQuestions.includes(idx) && q.title?.toLowerCase() !== 'time management' && <Check size={14} style={{ color: iconColor }} />}

                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Top Progress Bar */}
                    <div className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                {currentIndex + 1} / {questions.length}
                                {completedQuestions.includes(currentIndex) && questions[currentIndex].title?.toLowerCase() !== 'time management' && <Check size={14} style={{ color: iconColor, marginLeft: '6px' }} />}
                            </span>
                            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
                                {Math.round(questionProgress)}% Done
                            </span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                            <motion.div animate={{ width: `${questionProgress}%` }} style={{
                                height: '100%', borderRadius: '3px',
                                background: `linear-gradient(90deg, ${iconColor} 0%, ${iconBgBase} 100%)`,
                            }} />
                        </div>
                    </div>

                    {/* Module Specific Render */}
                    {children}
                </div>
            </div>

            <ModuleRulesModal
                isOpen={showRules}
                onClose={onCloseRules}
                moduleName={title}
                rules={rulesList}
                icon={Icon}
                color={iconColor}
            />
        </div>
    )
}
