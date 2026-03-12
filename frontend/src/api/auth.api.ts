import axios from 'axios';
import type { AuthResponse, LoginCredentials, User } from '../types/auth';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medivise_token') || sessionStorage.getItem('medivise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (credentials: Omit<LoginCredentials, 'rememberMe'>): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', credentials).then((r) => r.data),

  me: (): Promise<{ success: boolean; user: User }> =>
    api.get('/auth/me').then((r) => r.data),

  logout: (): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/logout').then((r) => r.data),
};

export default api;
