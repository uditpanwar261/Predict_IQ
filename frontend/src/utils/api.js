import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = 'Bearer ' + token;
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  if (err.response && err.response.status === 401) {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        const res = await axios.post(API_BASE + '/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', res.data.access);
        err.config.headers.Authorization = 'Bearer ' + res.data.access;
        return api(err.config);
      } catch(e) { localStorage.clear(); window.location.href = '/login'; }
    }
  }
  return Promise.reject(err);
});

export const authAPI = {
  login: d => api.post('/auth/login/', d),
  register: d => api.post('/auth/register/', d),
  profile: () => api.get('/auth/profile/'),
};
export const machinesAPI = {
  list: params => api.get('/machines/', { params }),
  get: id => api.get('/machines/' + id + '/'),
  create: d => api.post('/machines/', d),
  update: (id, d) => api.patch('/machines/' + id + '/', d),
  delete: id => api.delete('/machines/' + id + '/'),
  summary: id => api.get('/machines/' + id + '/summary/'),
  maintenanceLogs: params => api.get('/machines/maintenance-logs/', { params }),
  addLog: d => api.post('/machines/maintenance-logs/', d),
};
export const sensorsAPI = {
  readings: params => api.get('/sensors/readings/', { params }),
  simulate: id => api.post('/sensors/simulate/' + id + '/'),
  simulateAll: () => api.post('/sensors/simulate-all/'),
};
export const predictionsAPI = {
  history: params => api.get('/predictions/history/', { params }),
  run: id => api.post('/predictions/run/' + id + '/'),
  train: formData => api.post('/predictions/train/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  models: () => api.get('/predictions/models/'),
};
export const alertsAPI = {
  list: params => api.get('/alerts/', { params }),
  summary: () => api.get('/alerts/summary/'),
  acknowledge: id => api.post('/alerts/' + id + '/acknowledge/'),
  resolve: id => api.post('/alerts/' + id + '/resolve/'),
};
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard/'),
  sensorTrends: (id, hours) => api.get('/analytics/sensor-trends/' + id + '/', { params: { hours } }),
  healthDistribution: () => api.get('/analytics/health-distribution/'),
  predictionTrends: days => api.get('/analytics/prediction-trends/', { params: { days } }),
};
export const reportsAPI = {
  sensorCSV: id => API_BASE + '/reports/sensor-csv/' + id + '/',
  predictionsCSV: () => API_BASE + '/reports/predictions-csv/',
  alertsCSV: () => API_BASE + '/reports/alerts-csv/',
  pdf: id => API_BASE + '/reports/pdf/' + id + '/',
};
export default api;
