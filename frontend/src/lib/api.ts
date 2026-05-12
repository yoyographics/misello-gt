import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor que envia el token correcto segun el endpoint:
 * - Admin endpoints (/admin/*, /auth/admin/*, /orders/admin/*) → adminToken
 * - Cliente endpoints → clientToken
 */
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAdminEndpoint =
    url.startsWith('/admin/') ||
    url.startsWith('/auth/admin/') ||
    url.startsWith('/orders/admin/');

  const tokenKey = isAdminEndpoint ? 'adminToken' : 'clientToken';
  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
