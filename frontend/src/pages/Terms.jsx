import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

export default function Terms() {
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
                    <h1 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Terms of Service</h1>
                    <p style={{ color: '#6B7280', marginBottom: '40px' }}>NeuraLingua – A product of NeuraGlobal</p>

                    <p style={{ color: '#374151', lineHeight: 1.8, marginBottom: '32px' }}>
                        By accessing or using the NeuraLingua platform, you agree to the following terms.
                    </p>

                    <div style={{ marginBottom: '28px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>Platform Usage</h2>
                        <p style={{ color: '#374151', lineHeight: 1.8, marginBottom: '12px' }}>
                            NeuraLingua provides AI-powered communication learning tools for educational institutions and students. Users agree to:
                        </p>
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                            {['Use the platform for educational purposes only', 'Not misuse or attempt to disrupt the system', 'Maintain account confidentiality'].map((item, i) => (
                                <li key={i} style={{ color: '#374151', lineHeight: 1.8, marginBottom: '6px' }}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    {[
                        { title: 'Intellectual Property', text: 'All content, software, and AI models on the platform belong to NeuraGlobal and are protected by intellectual property laws.' },
                        { title: 'Account Responsibility', text: 'Users are responsible for maintaining the security of their login credentials.' },
                        { title: 'Service Availability', text: 'While we strive for uninterrupted service, NeuraLingua does not guarantee continuous availability due to maintenance or technical updates.' },
                        { title: 'Termination', text: 'Accounts that violate platform policies may be suspended or terminated.' },
                        { title: 'Changes to Terms', text: 'NeuraLingua may update these terms from time to time.' },
                    ].map((section, i) => (
                        <div key={i} style={{ marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>{section.title}</h2>
                            <p style={{ color: '#374151', lineHeight: 1.8, margin: 0 }}>{section.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
