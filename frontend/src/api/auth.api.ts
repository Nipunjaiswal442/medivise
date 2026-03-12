import { apiClient, request } from './client';
import type { AuthResponse, LoginCredentials, User } from '@/types/auth';

export const authApi = {
  login: (credentials: Omit<LoginCredentials, 'rememberMe'>) =>
    request<AuthResponse>(apiClient, {
      method: 'POST',
      url: '/auth/login',
      data: credentials,
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
