const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const baseUrl = apiUrl.replace('/api/v1', '');

/**
 * Redirige al usuario al login de Google OAuth.
 * Guarda la URL actual en localStorage para volver después del login.
 */
export function redirectToGoogleLogin() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search);
    window.location.href = `${baseUrl}/api/v1/auth/google`;
  }
}

/**
 * Maneja el callback de Google OAuth.
 * Lee el token de la URL, lo guarda, y redirige a la página previa.
 * Retorna true si procesó un token (la página debe detener renderizado).
 */
export function handleGoogleCallback(): boolean {
  if (typeof window === 'undefined') return false;

  // Leer token del hash fragment (seguro: no va a server logs ni referrer)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = hashParams.get('token');

  if (!token) return false;

  localStorage.setItem('clientToken', token);

  const redirect = localStorage.getItem('postLoginRedirect') || '/design';
  localStorage.removeItem('postLoginRedirect');

  window.location.href = redirect;
  return true;
}
