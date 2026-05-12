import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

/**
 * Interceptor que envia el token correcto segun el endpoint.
 * Cualquier URL que contenga '/admin/' se considera endpoint de admin.
 * '/inventory' tambien es admin.
 */
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAdminEndpoint = url.includes('/admin/') || url.startsWith('/inventory');

  const tokenKey = isAdminEndpoint ? 'adminToken' : 'clientToken';
  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
