/**
 * Auth Hook
 * 
 * ✓ PATTERN: Centralized authentication state management
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useAuthState(): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // Simulated login
      const token = 'demo-token';
      apiClient.setToken(token);
      
      setState({
        user: { id: 'user-1', email, name: 'Demo User', role: 'user' },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return { ...state, login, logout };
}

export { AuthContext };
