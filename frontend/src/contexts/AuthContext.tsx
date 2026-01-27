import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isBootstrapped: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  bootstrap: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapped, setIsBootstrapped] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for stored auth
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    checkBootstrap();
  }, []);

  const checkBootstrap = async () => {
    try {
      const response = await authApi.getStatus();
      setIsBootstrapped(response.data.bootstrapped);
    } catch (error) {
      console.error('Failed to check bootstrap status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { accessToken, user: userData } = response.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
  };

  const bootstrap = async (email: string, password: string, name: string) => {
    const response = await authApi.bootstrap({ email, password, name });
    const { accessToken, user: userData } = response.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
    setIsBootstrapped(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isBootstrapped,
        login,
        bootstrap,
        logout,
        checkBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRole(): Role | null {
  const { user } = useAuth();
  return user?.role || null;
}