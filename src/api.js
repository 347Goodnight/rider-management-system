import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10秒超时
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理 401 错误
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

// ========== 认证接口 ==========
export const login = (username, password) => api.post('/auth/login', { username, password });
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');

// ========== 用户管理接口 ==========
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ========== 角色管理接口 ==========
export const getRoles = () => api.get('/roles');
export const getPermissions = () => api.get('/permissions');
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);

// ========== 操作日志接口 ==========
export const getLogs = (params) => api.get('/logs', { params });
export const getTodayStats = () => api.get('/logs/today-stats');
export const exportLogs = (params) => {
  const queryString = new URLSearchParams(params).toString();
  window.open(`${API_BASE_URL}/logs/export?${queryString}`);
};

// ========== 骑手管理接口 ==========
export const getStations = () => api.get('/stations');
export const getRiders = (params = {}, signal) => api.get('/riders', { params, signal });
export const createRider = (data) => api.post('/riders', data);
export const updateRider = (riderId, data) => api.put(`/riders/${riderId}`, data);
export const deleteRider = (riderId) => api.delete(`/riders/${riderId}`);
export const deleteAllRiders = () => api.delete('/riders/all');

export const importRiders = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/riders/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const exportRiders = async (params = {}) => {
  // 使用 Axios 发送请求，携带认证头
  const response = await api.get('/riders/export', {
    params,
    responseType: 'blob' // 重要：设置响应类型为 blob
  });
  
  // 创建下载链接
  const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `骑手数据_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api;
