import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000, // 15 second default timeout
})

// ── Response interceptor: handle 401 globally ──────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any stale state and redirect to login
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// Emails
export const emailAPI = {
  list: (params) => api.get('/emails', { params }),
  get: (id) => api.get(`/emails/${id}`),
  send: (formData) => api.post('/emails/send', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // 30s for uploads
  }),
  draft: (formData) => api.post('/emails/draft', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
  update: (id, data) => api.patch(`/emails/${id}`, data),
  delete: (id) => api.delete(`/emails/${id}`),
  schedule: (id, scheduledAt) => api.post(`/emails/${id}/schedule`, { scheduledAt }),
  search: (params) => api.get('/emails/search', { params }),
}

// Threads
export const threadAPI = {
  get: (threadId) => api.get(`/threads/${threadId}`),
}

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.patch('/settings', data),
}

// Accounts
export const accountsAPI = {
  list: () => api.get('/accounts'),
  add: (data) => api.post('/accounts', data),
  unifiedInbox: () => api.get('/accounts/unified-inbox'),
}

// AI (longer timeout for LLM calls)
export const aiAPI = {
  memory: (threadId) => api.post(`/ai/memory/${threadId || 'none'}`, {}, { timeout: 60000 }),
  draftIntent: (data) => api.post('/ai/draft/intent', data, { timeout: 60000 }),
  subscriptions: () => api.get('/ai/subscriptions', { timeout: 60000 }),
  unsubscribe: (address) => api.post('/ai/unsubscribe', { address }),
  categorize: () => api.post('/ai/categorize', {}, { timeout: 120000 }), // 2 min for batch
}

export default api
