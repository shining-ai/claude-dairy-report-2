import apiClient from './client';

export interface AppUser {
  user_id: number;
  name: string;
  email: string;
  role: 'sales' | 'manager';
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'sales' | 'manager';
  department?: string;
}

export interface UpdateUserData {
  name: string;
  email: string;
  password?: string;
  role: 'sales' | 'manager';
  department?: string;
}

export interface UserListResponse {
  data: {
    users: AppUser[];
  };
}

export interface UserResponse {
  data: AppUser;
}

export const getUsers = (params?: { role?: string }) =>
  apiClient.get<UserListResponse>('/users', { params });

export const getUser = (id: number) =>
  apiClient.get<UserResponse>(`/users/${id}`);

export const createUser = (data: CreateUserData) =>
  apiClient.post<UserResponse>('/users', data);

export const updateUser = (id: number, data: UpdateUserData) =>
  apiClient.put<UserResponse>(`/users/${id}`, data);

export const deleteUser = (id: number) =>
  apiClient.delete(`/users/${id}`);
