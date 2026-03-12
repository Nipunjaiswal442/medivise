import { apiClient, request } from './client';
import type { AuthResponse, LoginCredentials, User } from '@/types/auth';

export const authApi = {
  login: (credentials: Omit<LoginCredentials, 'rememberMe'>) =>
    request<AuthResponse>(apiClient, {
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    }),

  register: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    specialty: string;
    licenseNumber: string;
  }) =>
    request<{ success: boolean; message: string; user: User }>(apiClient, {
      method: 'POST',
      url: '/auth/register',
      data,
    }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>(apiClient, {
      method: 'POST',
      url: '/auth/forgot-password',
      data: { email },
    }),

  me: () =>
    request<{ success: boolean; user: User }>(apiClient, {
      method: 'GET',
      url: '/auth/me',
    }),

  logout: () =>
    request<{ success: boolean; message: string }>(apiClient, {
      method: 'POST',
      url: '/auth/logout',
    }),
};
