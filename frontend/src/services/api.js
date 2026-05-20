import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

// Dashboard API
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getCompliance: (baseline, params) =>
    api.get(`/dashboard/compliance/${baseline}`, { params }),
  getTrends: (params) => api.get('/dashboard/trends', { params }),
  getMatrix: (params) => api.get('/dashboard/matrix', { params }),
};

// Upload API
export const uploadApi = {
  uploadFile: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getHistory: () => api.get('/upload/history'),
  getUpload: (id) => api.get(`/upload/${id}`),
};

// Devices API
export const devicesApi = {
  search: (params) => api.get('/devices/search', { params }),
  getDevice: (deviceKey) => api.get(`/devices/${deviceKey}`),
  getHistory: (deviceKey) => api.get(`/devices/${deviceKey}/history`),
};

// Alerts API
export const alertsApi = {
  getAlerts: (params) => api.get('/alerts', { params }),
  acknowledge: (id) => api.put(`/alerts/${id}/acknowledge`),
  getStats: () => api.get('/alerts/stats'),
};

// Admin API
export const adminApi = {
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getSettings: () => api.get('/admin/settings'),
  getStats: () => api.get('/admin/stats'),
};

export default api;
