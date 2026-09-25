import axios from 'axios'
import { auth } from './firebase.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081'
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for Firebase JWT
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  getStats: (userId) => api.get(`/users/${userId}/stats`),
  getAdminSubjects: () => api.get('/admin/fundamentals/subjects'),
  createAdminSubject: (data) => api.post('/admin/fundamentals/subjects', data),
  importAdminPlaylist: (subjectId, data) => api.post(`/admin/fundamentals/subjects/${subjectId}/playlist/import`, data),
  getUserByUsername: (username) => api.get(`/users/username/${username}`),
  getMe: () => api.get('/users/me'),
  createUser: (userData) => api.post('/users', userData),
  getLeaderboard: () => api.get('/users/leaderboard'),
}

export const statsApi = {
  getPlatformStats: () => api.get('/stats/platform'),
}

export const problemApi = {
  getAll: () => api.get('/problems'),
  getBySlug: (slug) => api.get(`/problems/${slug}`),
  getTestCases: (id) => api.get(`/problems/${id}/testcases`),
}

export const matchApi = {
  create: (data) => api.post('/matches', data),
  get: (id) => api.get(`/matches/${id}`),
  getForUser: (userId) => api.get(`/matches/user/${userId}`),
  start: (id) => api.post(`/matches/${id}/start`),
  finish: (id, winnerId) => api.post(`/matches/${id}/finish?winnerId=${winnerId}`),
}

export const matchmakingApi = {
  join: (userId) => api.post(`/matchmaking/join?userId=${userId}`),
  leave: (userId) => api.post(`/matchmaking/leave?userId=${userId}`),
}

export const submissionApi = {
  submit: (data) => api.post('/submissions', data),
  practiceSubmit: (data) => api.post('/submissions/practice', data),
  getForMatch: (matchId) => api.get(`/submissions/match/${matchId}`),
}

export const adminApi = {
  // Problems
  getAllProblems: () => api.get('/admin/problems'),
  createProblem: (data) => api.post('/admin/problems', data),
  updateProblem: (id, data) => api.put(`/admin/problems/${id}`, data),
  deleteProblem: (id) => api.delete(`/admin/problems/${id}`),
  restoreProblem: (id) => api.put(`/admin/problems/${id}/restore`),
  
  // Test Cases
  getTestCases: (problemId) => api.get(`/admin/problems/${problemId}/testcases`),
  createTestCase: (problemId, data) => api.post(`/admin/problems/${problemId}/testcases`, data),
  updateTestCase: (id, data) => api.put(`/admin/testcases/${id}`, data),
  deleteTestCase: (id) => api.delete(`/admin/testcases/${id}`),

  // Users
  searchUsers: (query) => api.get(`/admin/users${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role?role=${role}`),
  disableUser: (id) => api.put(`/admin/users/${id}/disable`),
  enableUser: (id) => api.put(`/admin/users/${id}/enable`),
  
  // Seeder
  seedNeetcode150: (dryRun = false) => api.post(`/admin/seed/neetcode150?dryRun=${dryRun}`),
  updateProblemImportance: (id, importance) => api.put(`/admin/problems/${id}/importance`, { importance }),
  updateProblemCategory: (id, category) => api.put(`/admin/problems/${id}/category`, { category }),
}

export default api

export const fundamentalsApi = {
  // Dashboard: subject cards with chapter count and progress
  getDashboard: (userId) => api.get(`/fundamentals/dashboard${userId ? `?userId=${userId}` : ''}`),

  // Subject detail: chapter list with completion status
  getSubjectDetails: (slug, userId) =>
    api.get(`/fundamentals/subjects/${slug}${userId ? `?userId=${userId}` : ''}`),

  // Chapter HTML content
  getChapterContent: (subjectSlug, chapterPath) =>
    api.get('/fundamentals/chapter-content', { params: { subjectSlug, chapterPath } }),

  // Mark chapter complete
  markChapterComplete: (userId, subjectSlug, chapterPath) =>
    api.post('/fundamentals/chapters/complete', { userId, subjectSlug, chapterPath }),

  // Overall progress
  getProgress: (userId) => api.get(`/fundamentals/progress${userId ? `?userId=${userId}` : ''}`),

  // Admin
  triggerSync: () => api.post('/fundamentals/admin/sync'),
}

export const dsaApi = {
  // Problems with filters
  getProblems: (params) => api.get('/problems', { params }),
  getCollections: () => api.get('/collections'),
  getCollection: (slug) => api.get(`/collections/${slug}`),
  getCollectionProblems: (slug) => api.get(`/collections/${slug}/problems`),

  // User progress
  getMyProgress: () => api.get('/dsa/progress'),
  getProblemProgress: (problemId) => api.get(`/dsa/progress/${problemId}`),
  updateStatus: (problemId, status) => api.post(`/dsa/progress/${problemId}/status`, { status }),
  updateMastery: (problemId, masteryLevel) => api.post(`/dsa/progress/${problemId}/mastery`, { masteryLevel }),
  markRevision: (problemId, revision) => api.post(`/dsa/progress/${problemId}/revision`, { revision }),

  // Dashboard
  getDashboard: () => api.get('/dsa/dashboard'),
  getCollectionDashboard: (slug) => api.get(`/dsa/dashboard/collection/${slug}`),
}
