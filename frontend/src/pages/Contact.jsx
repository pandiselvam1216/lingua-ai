import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import { Mail, Phone, Globe, Clock } from 'lucide-react'

export default function Contact() {
    return (
        <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Nav */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '72px',
                backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #E5E7EB', zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 min(24px, 5vw)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                        <img src={logoImg} alt="NeuraLingua" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
                        <span style={{ fontWeight: '600', fontSize: '18px', color: '#111827' }}>NeuraLingua</span>
                    </Link>
                    <Link to="/" style={{ fontSize: '14px', color: '#1A73E8', textDecoration: 'none', fontWeight: '500' }}>Back to Home</Link>
                </div>
            </nav>

            {/* Content */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '112px 24px 80px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: 'min(48px, 6vw)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
                    <h1 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Contact Us</h1>
                    <p style={{ color: '#6B7280', marginBottom: '40px' }}>NeuraGlobal Technologies – NeuraLingua AI Communication Platform</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        {[
                            {
                                icon: Mail,
                                color: '#1A73E8',
                                bg: '#EFF6FF',
                                label: 'Email',
                                value: 'neuraglobalindia@gmail.com',
                                href: 'mailto:neuraglobalindia@gmail.com',
                            },
                            {
                                icon: Phone,
                                color: '#10B981',
                                bg: '#ECFDF5',
                                label: 'Phone',
                                value: '+91 8111093310',
                                href: 'tel:+918111093310',
                            },
                            {
                                icon: Globe,
                                color: '#8B5CF6',
                                bg: '#F5F3FF',
                                label: 'Website',
                                value: 'www.neuraglobal.in',
                                href: 'http://www.neuraglobal.in',
                            },
                            {
                                icon: Clock,
                                color: '#F59E0B',
                                bg: '#FFFBEB',
                                label: 'Support Hours',
                                value: 'Mon–Fri, 9 AM – 6 PM IST',
                                href: null,
                            },
                        ].map((item, i) => {
                            const Icon = item.icon
                            return (
                                <div key={i} style={{
                                    padding: '24px',
                                    borderRadius: '16px',
                                    border: '1px solid #E5E7EB',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '16px',
                                }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '12px',
                                        backgroundColor: item.bg, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon size={20} style={{ color: item.color }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                                        {item.href ? (
                                            <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: item.color, textDecoration: 'none', fontWeight: '500' }}>
                                                {item.value}
                                            </a>
                                        ) : (
                                            <p style={{ fontSize: '15px', color: '#374151', fontWeight: '500', margin: 0 }}>{item.value}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* CTA */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
                        borderRadius: '16px', padding: '32px', textAlign: 'center',
                    }}>
                        <h3 style={{ color: 'white', fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>Send us an Email</h3>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginBottom: '20px' }}>We'll get back to you within one business day.</p>
                        <a
                            href="mailto:neuraglobalindia@gmail.com"
                            style={{
                                display: 'inline-block',
                                backgroundColor: 'white',
                                color: '#1A73E8',
                                textDecoration: 'none',
                                padding: '12px 28px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                fontSize: '14px',
                            }}
                        >
                            Email Us →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
