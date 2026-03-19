import { useState, useCallback } from 'react';

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: 'sales' | 'manager';
  department: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

function loadAuthState(): AuthState {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user: User | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr) as User;
    } catch {
      user = null;
    }
  }
  return { token, user };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(loadAuthState);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({ token: null, user: null });
  }, []);

  const isAuthenticated = authState.token !== null && authState.user !== null;
  const isManager = authState.user?.role === 'manager';

  return {
    token: authState.token,
    user: authState.user,
    isAuthenticated,
    isManager,
    login,
    logout,
  };
}
