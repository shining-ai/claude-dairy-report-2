import apiClient from './client';
import type { User } from '../hooks/useAuth';

export interface LoginResponse {
  data: {
    token: string;
    user: User;
  };
}

export interface MeResponse {
  data: User;
}

export const login = (email: string, password: string) =>
  apiClient.post<LoginResponse>('/auth/login', { email, password });

export const logout = () =>
  apiClient.post('/auth/logout');

export const getMe = () =>
  apiClient.get<MeResponse>('/auth/me');
