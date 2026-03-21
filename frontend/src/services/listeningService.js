import api from './api'
import { supabase } from './supabase'

const listeningService = {
    // Admin Content Management
    getAllContent: async () => {
        const response = await api.get('/admin/listening')
        return response.data
    },

    createContent: async (data) => {
        const response = await api.post('/admin/listening', data)
        return response.data
    },

    updateContent: async (id, data) => {
        const response = await api.put(`/admin/listening/${id}`, data)
        return response.data
    },

    deleteContent: async (id) => {
        const response = await api.delete(`/admin/listening/${id}`)
        return response.data
    },

    // User Content Access
    getPublicContent: async () => {
        // Use the student-facing endpoint instead of the admin-facing one for students
        const response = await api.get('/listening/modules') 
        return response.data.modules || []
    },

    // Audio Upload to Supabase Storage
    uploadAudio: async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `listening-audio/${fileName}`

        const { data, error } = await supabase.storage
            .from('listening-content')
            .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('listening-content')
            .getPublicUrl(filePath)

        return publicUrl
    }
}

export default listeningService
