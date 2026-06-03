'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Primero revisar si hay token en el hash fragment (Google OAuth redirect)
    //    El backend redirige con #token=... para evitar que el token viaje al server
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashToken = hashParams.get('token');
      if (hashToken) {
        login(hashToken);
        // Limpiar el hash de la URL sin recargar la página
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        setIsLoading(false);
        return;
      }
    }

    // 2. Si no hay token en hash, revisar query params (legacy / fallback)
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        login(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLoading(false);
        return;
      }
    }

    // 3. Revisar token almacenado en localStorage
    const storedToken = localStorage.getItem('clientToken');
    if (storedToken) {
      setToken(storedToken);
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email,
          role: payload.role,
        });
      } catch {
        localStorage.removeItem('clientToken');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('clientToken', newToken);
    setToken(newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setUser({
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        role: payload.role,
      });
    } catch {
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('clientToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
