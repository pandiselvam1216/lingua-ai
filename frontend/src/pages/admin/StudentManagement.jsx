import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Search, Plus, Trash2, Edit2, X, Check,
    ChevronLeft, ChevronRight, UserCheck, UserX, Mail, Upload, Download
} from 'lucide-react'
import api from '../../services/api'
import Modal from '../../components/common/Modal'

export default function StudentManagement() {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewResults, setPreviewResults] = useState({ success: [], skipped: [] })
    const [editingStudent, setEditingStudent] = useState(null)
    const [formData, setFormData] = useState({ email: '', password: '', full_name: '', is_active: true })
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(null)
    const [alertConfig, setAlertConfig] = useState({ isOpen: false })

    const showAlert = (title, message, theme = 'info') => {
        setAlertConfig({ isOpen: true, title, message, theme, type: 'alert' })
    }

    useEffect(() => {
        fetchStudents()
    }, [page, search])

    const fetchStudents = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/admin/students`, {
                params: { page, per_page: 10, search }
            })
            setStudents(res.data.students || [])
            setTotalPages(res.data.pages || 1)
        } catch (error) {
            console.error('Failed to fetch students:', error)
            setStudents([])
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (student = null) => {
        if (student) {
            setEditingStudent(student)
            setFormData({
                email: student.email,
                password: '',
                full_name: student.full_name,
                is_active: student.is_active
            })
        } else {
            setEditingStudent(null)
            setFormData({ email: '', password: '', full_name: '', is_active: true })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingStudent(null)
        setFormData({ email: '', password: '', full_name: '', is_active: true })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingStudent) {
                await api.put(`/admin/students/${editingStudent.id}`, formData)
            } else {
                await api.post(`/admin/students`, formData)
            }
            handleCloseModal()
            fetchStudents()
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Failed to save student'
            showAlert('Error', msg, 'danger')
        } finally {
            setSaving(false)
        }
    }

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
        let p = "";
        for (let i = 0, n = charset.length; i < 12; ++i) {
            p += charset.charAt(Math.floor(Math.random() * n));
        }
        return p;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) {
                alert("CSV must contain a header row and at least one data row.");
                return;
            }

            const header = lines[0].toLowerCase().split(',').map(h => h.replace(/['"]+/g, '').trim());
            const nameIdx = header.findIndex(h => h.includes('name'));
            const emailIdx = header.findIndex(h => h.includes('email'));

            if (nameIdx === -1 || emailIdx === -1) {
                alert(`CSV header must contain 'name' and 'email' columns. Found: ${header.join(', ')}`);
                return;
            }

            const newUsers = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < Math.max(nameIdx, emailIdx) + 1) continue;

                const rawName = cols[nameIdx];
                const rawEmail = cols[emailIdx].toLowerCase();

                if (rawName && rawEmail) {
                    newUsers.push({ full_name: rawName, email: rawEmail });
                }
            }

            let skipped = 0;
            const insertPayload = [];
            const errorList = [];

            // We iterate and try creating them one by one through the API
            for (const user of newUsers) {
                const tempPassword = generatePassword();
                try {
                    await api.post('/admin/students', {
                        email: user.email,
                        full_name: user.full_name,
                        password: tempPassword,
                        is_active: true
                    })
                    insertPayload.push({ email: user.email, tempPassword });
                } catch (err) {
                    skipped++;
                    errorList.push(`[${user.email}] Failed: ${err.response?.data?.error || err.message}`);
                }
            }

            if (insertPayload.length === 0 && skipped === 0) {
                alert("CSV was empty or had no valid data.");
                return;
            }

            setPreviewResults({
                success: insertPayload,
                skipped: errorList
            });
            setShowPreviewModal(true);
            fetchStudents();

        } catch (error) {
            alert("Failed to import CSV: " + error.message);
        } finally {
            setIsImporting(false);
            e.target.value = null;
        }
    };

    const downloadPreviewCSV = () => {
        let csvContent = "email,password\n";
        previewResults.success.forEach(p => {
            csvContent += `${p.email},${p.tempPassword}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `student_credentials_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleDelete = (studentId) => {
        setAlertConfig({
            isOpen: true,
            title: 'Delete Student',
            message: 'Are you sure you want to delete this student? This action cannot be undone.',
            theme: 'danger',
            type: 'confirm',
            confirmText: 'Delete',
            onConfirm: async () => {
                setAlertConfig({ isOpen: false })
                setDeleting(studentId)
                try {
                    await api.delete(`/admin/students/${studentId}`)
                    fetchStudents()
                } catch (error) {
                    const msg = error.response?.data?.error || error.message || 'Failed to delete student'
                    showAlert('Error', msg, 'danger')
                } finally {
                    setDeleting(null)
                }
            }
        })
    }

    const handleToggleStatus = async (student) => {
        try {
            await api.put(`/admin/students/${student.id}`, {
                is_active: !student.is_active
            })
            fetchStudents()
        } catch (error) {
            showAlert('Error', 'Failed to toggle status', 'danger')
        }
    }

    if (loading && students.length === 0) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <div style={{ padding: '24px', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Student Management</h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>Add, edit, and manage student accounts</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <input type="file" accept=".csv" id="csv-upload" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <label htmlFor="csv-upload" style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: isImporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isImporting ? 0.7 : 1, transition: 'all 0.2s' }}>
                        {isImporting ? <div style={{ width: 18, height: 18, border: '2px solid #E5E7EB', borderTop: '2px solid #374151', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Upload size={18} />}
                        Import CSV
                    </label>

                    <button onClick={() => handleOpenModal()} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}>
                        <Plus size={18} /> Add Student
                    </button>
                </div>
            </div>

            {/* Search */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                    />
                </div>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Student</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Attempts</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Avg Score</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, idx) => (
                            <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} style={{ borderTop: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: '#3B82F6', fontSize: '14px' }}>
                                            {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{student.full_name || 'No Name'}</p>
                                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <button onClick={() => handleToggleStatus(student)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', backgroundColor: student.is_active ? '#F0FDF4' : '#FEF2F2', color: student.is_active ? '#166534' : '#991B1B', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {student.is_active ? <UserCheck size={14} /> : <UserX size={14} />} {student.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td style={{ padding: '16px 24px' }}><span style={{ fontSize: '14px', color: '#374151' }}>{student.stats?.attempts || 0}</span></td>
                                <td style={{ padding: '16px 24px' }}><span style={{ fontSize: '14px', fontWeight: '500', color: (student.stats?.average_score || 0) >= 70 ? '#22C55E' : (student.stats?.average_score || 0) >= 50 ? '#F59E0B' : '#EF4444' }}>{student.stats?.average_score || 0}%</span></td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button onClick={() => handleOpenModal(student)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={16} style={{ color: '#6B7280' }} /></button>
                                        <button onClick={() => handleDelete(student.id)} disabled={deleting === student.id} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', cursor: deleting === student.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deleting === student.id ? 0.5 : 1 }}><Trash2 size={16} style={{ color: '#EF4444' }} /></button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>Page {page} of {totalPages}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#374151' }}><ChevronLeft size={16} /> Prev</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#374151' }}>Next <ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} onClick={handleCloseModal}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
                                <button onClick={handleCloseModal} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer' }}><X size={18} style={{ color: '#6B7280' }} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Full Name</label><input type="text" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} required style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }} /></div>
                                <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Email</label><input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }} /></div>
                                <div style={{ marginBottom: '24px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Password {editingStudent && <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(leave blank to keep)</span>}</label><input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required={!editingStudent} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }} /></div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={handleCloseModal} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: 'white', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Student'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {showPreviewModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} onClick={() => setShowPreviewModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>Import Results</h2>
                                <button onClick={() => setShowPreviewModal(false)} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer' }}><X size={18} style={{ color: '#6B7280' }} /></button>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1, backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
                                        <div style={{ color: '#166534', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Successfully Created</div>
                                        <div style={{ color: '#15803D', fontSize: '24px', fontWeight: '700' }}>{previewResults.success.length}</div>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                                        <div style={{ color: '#991B1B', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Failed / Skipped</div>
                                        <div style={{ color: '#B91C1C', fontSize: '24px', fontWeight: '700' }}>{previewResults.skipped.length}</div>
                                    </div>
                                </div>

                                {previewResults.success.length > 0 && (
                                    <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4B5563' }}>Download the CSV containing the generated passwords. <strong>You won't be able to see these again.</strong></p>
                                        <button onClick={downloadPreviewCSV} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Download size={16} /> Download Credentials
                                        </button>
                                    </div>
                                )}

                                {previewResults.skipped.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Errors:</h4>
                                        <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '8px', border: '1px solid #FEE2E2', maxHeight: '150px', overflowY: 'auto' }}>
                                            {previewResults.skipped.map((err, i) => <div key={i} style={{ fontSize: '13px', color: '#991B1B', marginBottom: '4px' }}>{err}</div>)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setShowPreviewModal(false)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal
                isOpen={alertConfig.isOpen} onClose={() => setAlertConfig({ isOpen: false })}
                title={alertConfig.title} description={alertConfig.message} type={alertConfig.type} theme={alertConfig.theme}
                confirmText={alertConfig.confirmText} onConfirm={alertConfig.onConfirm}
            />
        </div>
    )
}
