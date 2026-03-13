import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowRight, School, GraduationCap, Star } from 'lucide-react'

const plans = [
    {
        name: 'School',
        icon: School,
        price: 150,
        period: '/student/year',
        description: 'Perfect for K-12 schools',
        features: [
            'All 7 Learning Modules',
            'AI-Powered Feedback',
            'Progress Tracking',
            'Teacher Dashboard',
            'Student Reports',
            'Email Support',
        ],
        color: '#3B82F6',
        popular: false,
    },
    {
        name: 'College',
        icon: GraduationCap,
        price: 200,
        period: '/student/year',
        description: 'For colleges and universities',
        features: [
            'All 7 Learning Modules',
            'Advanced AI Analytics',
            'Progress Tracking',
            'Admin Dashboard',
            'Detailed Reports',
            'Priority Support',
            'Custom Integrations',
            'API Access',
        ],
        color: '#8B5CF6',
        popular: true,
    },
]

export default function Pricing() {
    const [students, setStudents] = useState(100)

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
            {/* Navbar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '72px',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #E5E7EB',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>N</span>
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '20px', color: '#1F2937', display: window.innerWidth < 480 ? 'none' : 'block' }}>NeuraLingua</span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Link to="/login" style={{ color: '#374151', textDecoration: 'none', fontSize: '14px', fontWeight: '500', padding: '10px 12px' }}>
                            Sign in
                        </Link>
                        <Link to="/register" style={{
                            backgroundColor: '#1A73E8', color: 'white', textDecoration: 'none',
                            fontSize: '14px', fontWeight: '500', padding: '10px 16px', borderRadius: '8px',
                        }}>
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <section style={{ paddingTop: '120px', paddingBottom: '40px', textAlign: 'center' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                    <h1 style={{ fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
                        Simple, Transparent Pricing
                    </h1>
                    <p style={{ color: '#6B7280', maxWidth: '500px', margin: '0 auto' }}>
                        Choose the plan that fits your institution's needs
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section style={{ paddingBottom: '60px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
                    <div className="grid-2col" style={{ gap: '32px' }}>
                        {plans.map((plan, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="card"
                                style={{
                                    padding: '40px',
                                    border: plan.popular ? `2px solid ${plan.color}` : '1px solid #E5E7EB',
                                    boxShadow: plan.popular ? `0 8px 30px ${plan.color}20` : '0 4px 20px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                }}
                            >
                                {plan.popular && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: plan.color,
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        padding: '4px 16px',
                                        borderRadius: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <Star size={12} fill="white" /> Most Popular
                                    </div>
                                )}

                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '14px',
                                    backgroundColor: `${plan.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                                }}>
                                    <plan.icon size={28} style={{ color: plan.color }} />
                                </div>

                                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                                    {plan.name}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                    {plan.description}
                                </p>

                                <div style={{ marginBottom: '24px' }}>
                                    <span style={{ fontSize: '48px', fontWeight: '700', color: '#111827' }}>₹{plan.price}</span>
                                    <span style={{ fontSize: '16px', color: '#6B7280' }}>{plan.period}</span>
                                </div>

                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                                    {plan.features.map((feature, j) => (
                                        <li key={j} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 0',
                                            borderBottom: j < plan.features.length - 1 ? '1px solid #F3F4F6' : 'none',
                                        }}>
                                            <Check size={18} style={{ color: plan.color }} />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link to="/register" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '16px',
                                    backgroundColor: plan.popular ? plan.color : 'white',
                                    color: plan.popular ? 'white' : plan.color,
                                    border: `2px solid ${plan.color}`,
                                }}>
                                    Get Started <ArrowRight size={18} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Price Calculator */}
            <section style={{ padding: '60px 0', backgroundColor: '#F9FAFB' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '40px',
                        border: '1px solid #E5E7EB',
                        textAlign: 'center',
                    }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                            Price Calculator
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '32px' }}>
                            Estimate your annual cost based on student count
                        </p>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
                                Number of Students: <span style={{ color: '#1A73E8', fontWeight: '700' }}>{students}</span>
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="1000"
                                value={students}
                                onChange={(e) => setStudents(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    borderRadius: '4px',
                                    appearance: 'none',
                                    background: `linear-gradient(to right, #1A73E8 0%, #1A73E8 ${(students - 10) / 990 * 100}%, #E5E7EB ${(students - 10) / 990 * 100}%, #E5E7EB 100%)`,
                                    cursor: 'pointer',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>10</span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>1000</span>
                            </div>
                        </div>

                        <div className="grid-2col" style={{ gap: '24px' }}>
                            <div style={{
                                backgroundColor: '#EFF6FF',
                                borderRadius: '12px',
                                padding: '24px',
                            }}>
                                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>School Plan</div>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1A73E8' }}>
                                    ₹{(students * 150).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>per year</div>
                            </div>
                            <div style={{
                                backgroundColor: '#F5F3FF',
                                borderRadius: '12px',
                                padding: '24px',
                            }}>
                                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>College Plan</div>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#8B5CF6' }}>
                                    ₹{(students * 200).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>per year</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '40px 0', backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                        © 2026 NeuraGlobal. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
