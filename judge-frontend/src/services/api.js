import axios from 'axios'

const BASE_URL = 'http://localhost:8081'
const api = axios.create({ baseURL: BASE_URL })

export const userApi = {
  getAll: () => api.get('/api/users'),
  getUser: (id) => api.get(`/api/users/${id}`),
  getUserByUsername: (username) => api.get(`/api/users/username/${username}`),
  createUser: (data) => api.post('/api/users', data),
}

export const problemApi = {
  getAll: () => api.get('/api/problems'),
  getBySlug: (slug) => api.get(`/api/problems/${slug}`),
  getTestCases: (id) => api.get(`/api/problems/${id}/testcases`),
}

export const matchApi = {
  create: (data) => api.post('/api/matches', data),
  get: (id) => api.get(`/api/matches/${id}`),
  getForUser: (userId) => api.get(`/api/matches/user/${userId}`),
  start: (id) => api.post(`/api/matches/${id}/start`),
  finish: (id, winnerId) => api.post(`/api/matches/${id}/finish?winnerId=${winnerId}`),
}

export const submissionApi = {
  submit: (data) => api.post('/api/submissions', data),
  getForMatch: (matchId) => api.get(`/api/submissions/match/${matchId}`),
}

export default api
