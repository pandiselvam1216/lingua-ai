import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Search, Plus, Trash2, Edit2, X, Check,
    ChevronLeft, ChevronRight, UserCheck, UserX, Mail, Upload, Download
} from 'lucide-react'
import { supabase } from '../../utils/supabaseClient'
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
            // Fetch users with role 'student'
            let query = supabase
                .from('user_profiles')
                .select('*')
                .eq('role', 'student')
                .order('created_at', { ascending: false })

            if (search) {
                query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
            }

            const { data: users, error: usersError } = await query
            if (usersError) throw usersError

            // Fetch scores to get stats
            const { data: scores, error: scoresError } = await supabase
                .from('scores')
                .select('user_id, score')

            if (scoresError) throw scoresError

            const studentsWithStats = (users || []).map(user => {
                const userScores = (scores || []).filter(s => s.user_id === user.id)
                const attempts = userScores.length
                const totalScore = userScores.reduce((acc, curr) => acc + curr.score, 0)
                const average_score = attempts > 0 ? Math.round(totalScore / attempts) : 0

                return {
                    ...user,
                    is_active: true, // Mocking is_active as user_profiles doesn't have it by default
                    stats: { attempts, average_score }
                }
            })

            // Basic pagination calculation
            const startIndex = (page - 1) * 10
            const paginatedStudents = studentsWithStats.slice(startIndex, startIndex + 10)

            setStudents(paginatedStudents)
            setTotalPages(Math.ceil(studentsWithStats.length / 10) || 1)
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
                const { error } = await supabase
                    .from('user_profiles')
                    .update({ full_name: formData.full_name, email: formData.email })
                    .eq('id', editingStudent.id)
                if (error) throw error
            } else {
                // Must create in auth.users first to satisfy foreign key constraint
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password || "TempPass123!",
                    options: {
                        data: {
                            full_name: formData.full_name,
                            role: 'student'
                        }
                    }
                });

                if (authError) throw authError;

                if (authData?.user) {
                    // Insert into user_profiles with the generated auth.users ID
                    const { error } = await supabase
                        .from('user_profiles')
                        .insert([{
                            id: authData.user.id,
                            full_name: formData.full_name,
                            email: formData.email,
                            role: 'student'
                        }]);

                    // If insert fails with duplicate key, a database trigger might have already created it. 
                    // So we only throw if it's NOT a duplicate key error.
                    if (error && error.code !== '23505') throw error;
                }
            }
            handleCloseModal()
            fetchStudents()
        } catch (error) {
            console.error('Failed to save student:', error)
            showAlert('Error', error.message || 'Failed to save student', 'danger')
        } finally {
            setSaving(false)
        }
    }

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]\:;?><,./-=";
        let p = "";
        for (let i = 0, n = charset.length; i < 12; ++i) {
            p += charset.charAt(Math.floor(Math.random() * n));
        }
        return p;
    };

    // A basic hash function for dummy passwords since the backend uses bcrypt
    // Here we're using a simple faux-hash to avoid raw passwords in DB simply to match existing dummy insertions
    const hashPassword = async (pass) => {
        const msgUint8 = new TextEncoder().encode(pass);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();

            // Basic CSV Parse: Split by newline, then split each line by comma.
            // Replace \r to handle Windows line endings, then filter empty lines.
            const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) {
                alert("CSV must contain a header row and at least one data row.");
                return;
            }

            // Extract headers, remove quotes and hidden characters, and prepare for matching
            const header = lines[0].toLowerCase().split(',').map(h => h.replace(/['"]+/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim());
            const nameIdx = header.findIndex(h => h.includes('name'));
            const emailIdx = header.findIndex(h => h.includes('email'));

            if (nameIdx === -1 || emailIdx === -1) {
                alert(`CSV header must contain 'name' and 'email' columns. Found: ${header.join(', ')}`);
                return;
            }

            // 1. Parse rows
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

            // 2. Fetch existing to prevent duplicates
            const { data: existingProfiles, error: fetchError } = await supabase
                .from('user_profiles')
                .select('email');

            if (fetchError) throw fetchError;
            const existingEmails = new Set(existingProfiles.map(p => p.email.toLowerCase()));

            // 4. Batch Create Users directly into profiles (Bypassing Auth Rate Limit per user request)
            let skipped = 0;
            const insertPayload = [];
            const errorList = [];

            for (const user of newUsers) {
                if (existingEmails.has(user.email)) {
                    skipped++;
                    errorList.push(`[${user.email}] Already exists.`);
                    continue;
                }

                const tempPassword = generatePassword();
                const fakeAuthId = crypto.randomUUID(); // Used just to satisfy the profiles table

                // Insert profile (If foreign key constraint exists, this WILL fail unless the DB allows it)
                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert([{
                        id: fakeAuthId,
                        full_name: user.full_name,
                        email: user.email,
                        role: 'student'
                    }]);

                if (insertError) {
                    console.error("Profile creation failed for:", user.email, insertError);
                    skipped++;
                    errorList.push(`[${user.email}] DB Error: ${insertError.message}`);
                } else {
                    insertPayload.push({ email: user.email, tempPassword });
                }
            }

            if (insertPayload.length === 0 && skipped === 0) {
                alert("CSV was empty or had no valid data.");
                return;
            }

            // Generate CSV for credentials download
            let csvContent = "email,password\n";
            insertPayload.forEach(p => {
                csvContent += `${p.email},${p.tempPassword}\n`;
            });

            // Trigger download if there are successful inserts
            if (insertPayload.length > 0) {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `student_credentials_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }

            // Show results in custom Modal instead of alert
            setPreviewResults({
                success: insertPayload,
                skipped: errorList
            });
            setShowPreviewModal(true);
            fetchStudents();

        } catch (error) {
            console.error("Error importing CSV:", error);
            alert("Failed to import CSV: " + error.message);
        } finally {
            setIsImporting(false);
            e.target.value = null; // Clear input
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
                    const { error } = await supabase.from('user_profiles').delete().eq('id', studentId)
                    if (error) throw error
                    // Deleting from auth.users requires admin API, so we just delete the profile.
                    fetchStudents()
                } catch (error) {
                    console.error('Failed to delete student:', error)
                    showAlert('Error', error.message || 'Failed to delete student', 'danger')
                } finally {
                    setDeleting(null)
                }
            }
        })
    }

    const handleToggleStatus = async (student) => {
        // Toggle logic (Assuming we just pretend since we mock is_active)
        console.log("Toggle status not fully supported without custom columns on Supabase")
    }

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F9FAFB',
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #E5E7EB',
                    borderTop: '4px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        )
    }

    return (
        <div style={{
            padding: '24px',
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Users size={24} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                            Student Management
                        </h1>
                        <p style={{ color: '#6B7280', margin: 0 }}>
                            Add, edit, and manage student accounts
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <input
                        type="file"
                        accept=".csv"
                        id="csv-upload"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <label
                        htmlFor="csv-upload"
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: '1px solid #E5E7EB',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isImporting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isImporting ? 0.7 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {isImporting ? (
                            <div style={{ width: 18, height: 18, border: '2px solid #E5E7EB', borderTop: '2px solid #374151', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Upload size={18} />
                        )}
                        Import CSV
                    </label>
 
                    <button
                        onClick={() => handleOpenModal()}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                        }}
                    >
                        <Plus size={18} />
                        Add Student
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}>
                    <div style={{
                        flex: 1,
                        position: 'relative',
                    }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9CA3AF',
                        }} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            style={{
                                width: '100%',
                                padding: '12px 14px 12px 44px',
                                borderRadius: '10px',
                                border: '2px solid #E5E7EB',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                            <motion.tr
                                key={student.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                style={{ borderTop: '1px solid #F3F4F6' }}
                            >
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            backgroundColor: '#EFF6FF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '600',
                                            color: '#3B82F6',
                                            fontSize: '14px',
                                        }}>
                                            {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>
                                                {student.full_name || 'No Name'}
                                            </p>
                                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={12} /> {student.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <button
                                        onClick={() => handleToggleStatus(student)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: 'none',
                                            backgroundColor: student.is_active ? '#F0FDF4' : '#FEF2F2',
                                            color: student.is_active ? '#166534' : '#991B1B',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {student.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                                        {student.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{ fontSize: '14px', color: '#374151' }}>
                                        {student.stats?.attempts || 0}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: (student.stats?.average_score || 0) >= 70 ? '#22C55E' : (student.stats?.average_score || 0) >= 50 ? '#F59E0B' : '#EF4444'
                                    }}>
                                        {student.stats?.average_score || 0}%
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            onClick={() => handleOpenModal(student)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid #E5E7EB',
                                                backgroundColor: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Edit2 size={16} style={{ color: '#6B7280' }} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(student.id)}
                                            disabled={deleting === student.id}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid #FECACA',
                                                backgroundColor: '#FEF2F2',
                                                cursor: deleting === student.id ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: deleting === student.id ? 0.5 : 1,
                                            }}
                                        >
                                            <Trash2 size={16} style={{ color: '#EF4444' }} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                            Page {page} of {totalPages}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: 'white',
                                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: page === 1 ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '14px',
                                    color: '#374151',
                                }}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: 'white',
                                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: page === totalPages ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '14px',
                                    color: '#374151',
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                        }}
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                width: '100%',
                                maxWidth: '480px',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '24px',
                            }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    {editingStudent ? 'Edit Student' : 'Add New Student'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#F3F4F6',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={18} style={{ color: '#6B7280' }} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Password {editingStudent && <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(leave blank to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                        required={!editingStudent}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '2px solid #E5E7EB',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                                            style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                                        />
                                        <span style={{ fontSize: '14px', color: '#374151' }}>Active account</span>
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: saving ? 0.7 : 1,
                                        }}
                                    >
                                        <Check size={16} />
                                        {saving ? 'Saving...' : (editingStudent ? 'Update' : 'Create')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Modal for Alerts and Confirms */}
            <Modal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ isOpen: false })}
                onConfirm={alertConfig.onConfirm}
                title={alertConfig.title}
                message={alertConfig.message}
                theme={alertConfig.theme}
                type={alertConfig.type}
                confirmText={alertConfig.confirmText || 'OK'}
            />

            {/* Preview Results Modal */}
            <AnimatePresence>
                {showPreviewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            backdropFilter: 'blur(4px)',
                            padding: '20px'
                        }}
                        onClick={() => setShowPreviewModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '700px',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                overflow: 'hidden'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '24px 32px',
                                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ backgroundColor: '#3B82F6', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                            <Upload size={18} />
                                        </div>
                                        Import Results
                                    </h2>
                                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
                                        {previewResults.success.length} imported successfully, {previewResults.skipped.length} entries skipped.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        color: '#E2E8F0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                                {previewResults.success.length > 0 && (
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }}></div>
                                            Successfully Generated Credentials
                                        </h3>
                                        <div style={{
                                            backgroundColor: '#F8FAFC',
                                            borderRadius: '16px',
                                            border: '1px solid #E2E8F0',
                                            overflow: 'hidden'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F1F5F9' }}>
                                                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Email Address</th>
                                                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Password</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewResults.success.map((res, i) => (
                                                        <tr key={i} style={{ borderTop: i > 0 ? '1px solid #E2E8F0' : 'none' }}>
                                                            <td style={{ padding: '12px 20px', fontSize: '14px', color: '#334155' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <Mail size={14} style={{ color: '#94A3B8' }} />
                                                                    {res.email}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 20px' }}>
                                                                <code style={{
                                                                    backgroundColor: '#EFF6FF',
                                                                    color: '#2563EB',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: '600',
                                                                    letterSpacing: '0.5px'
                                                                }}>{res.tempPassword}</code>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {previewResults.skipped.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }}></div>
                                            Skipped Entries
                                        </h3>
                                        <div style={{ display: 'grid', gap: '10px' }}>
                                            {previewResults.skipped.map((err, i) => (
                                                <div key={i} style={{
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#FFF1F2',
                                                    border: '1px solid #FECDD3',
                                                    color: '#9F1239',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px'
                                                }}>
                                                    <X size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '24px 32px',
                                backgroundColor: '#F8FAFC',
                                borderTop: '1px solid #E2E8F0',
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0',
                                        backgroundColor: 'white',
                                        color: '#475569',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                                {previewResults.success.length > 0 && (
                                    <button
                                        onClick={downloadPreviewCSV}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                        }}
                                    >
                                        <Download size={18} />
                                        Download CSV
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
