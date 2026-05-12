import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
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

  // DEBUG logging (temporal)
  if (isAdminEndpoint) {
    console.log(`[API Interceptor] ${config.method?.toUpperCase()} ${url} -> using ${tokenKey}: ${token ? 'YES (' + token.substring(0, 20) + '...)' : 'NO'}`);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
