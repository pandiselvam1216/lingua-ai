import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

export default function Privacy() {
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
                    <h1 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Privacy Policy</h1>
                    <p style={{ color: '#6B7280', marginBottom: '40px' }}>NeuraLingua – A product of NeuraGlobal</p>

                    <p style={{ color: '#374151', lineHeight: 1.8, marginBottom: '32px' }}>
                        NeuraLingua respects your privacy and is committed to protecting the personal information of students, educators, and institutions using our platform.
                    </p>

                    {[
                        {
                            title: 'Information We Collect',
                            items: ['Student name and profile details', 'Email address and login credentials', 'Learning progress and activity data', 'Audio recordings used for speaking practice', 'Device and browser information'],
                        },
                        {
                            title: 'How We Use the Information',
                            items: ['Provide personalized learning experiences', 'Improve AI-based communication training', 'Track student progress and performance', 'Enhance platform features and services'],
                        },
                    ].map((section, i) => (
                        <div key={i} style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>{section.title}</h2>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {section.items.map((item, j) => (
                                    <li key={j} style={{ color: '#374151', lineHeight: 1.8, marginBottom: '6px' }}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {[
                        { title: 'Data Protection', text: 'We implement industry-standard security measures to protect user data from unauthorized access, misuse, or disclosure.' },
                        { title: 'Data Sharing', text: 'NeuraLingua does not sell or share personal data with third parties except when required for platform functionality or legal compliance.' },
                        { title: "Children's Privacy", text: 'NeuraLingua may be used by students under institutional supervision. Educational institutions are responsible for managing student access.' },
                        { title: 'Updates', text: 'This privacy policy may be updated periodically to reflect improvements or regulatory changes.' },
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
