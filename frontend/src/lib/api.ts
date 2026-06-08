import axios from 'axios';

// NEXT_PUBLIC_API_URL se define en build time (.env.local).
// En produccion Railway no tiene .env.local (esta en .gitignore),
// asi que usamos '/api/v1' que es una ruta relativa al mismo dominio.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

function isAdminUrl(url: string): boolean {
  return url.includes('/admin/') || url.startsWith('/inventory');
}

/**
 * Interceptor que envia el token correcto segun el endpoint.
 * Cualquier URL que contenga '/admin/' se considera endpoint de admin.
 * '/inventory' tambien es admin.
 */
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAdminEndpoint = isAdminUrl(url);

  const tokenKey = isAdminEndpoint ? 'adminToken' : 'clientToken';
  const token = localStorage.getItem(tokenKey);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Interceptor de respuesta: si un endpoint de admin devuelve 401,
 * borra el adminToken y redirige al login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const url = error.config?.url || '';
      if (isAdminUrl(url)) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
