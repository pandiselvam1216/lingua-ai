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
    children
}) {
    const questionProgress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

    if (!questions || questions.length === 0) {
        return (
            <div style={{ padding: '32px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
                <div className="card" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px'
                }}>
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
                <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
                    <h3 style={{
                        fontSize: '14px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase',
                        letterSpacing: '0.05em', marginBottom: '16px',
                    }}>
                        Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {questions.map((q, idx) => (
                            <motion.button
                                key={q.id || idx}
                                onClick={() => onSelectQuestion(idx)}
                                whileHover={{ x: 4 }}
                                style={{
                                    padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                    backgroundColor: currentIndex === idx ? '#F0FDF4' : 'transparent',
                                    borderLeft: currentIndex === idx ? `3px solid ${iconColor}` : '3px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <p style={{
                                        fontSize: '14px', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                                        fontWeight: currentIndex === idx ? '600' : '500',
                                        color: currentIndex === idx ? iconBgHover : '#374151',
                                    }}>
                                        {q.title || `Question ${idx + 1}`}
                                    </p>
                                </div>
                                {completedQuestions.includes(idx) && <Check size={14} style={{ color: iconColor }} />}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Top Progress Bar */}
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                Question {currentIndex + 1} of {questions.length}
                                {completedQuestions.includes(currentIndex) && <Check size={16} style={{ color: iconColor, marginLeft: '8px' }} />}
                            </span>
                            <span style={{ fontSize: '14px', color: '#6B7280' }}>
                                {Math.round(questionProgress)}%
                            </span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
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
