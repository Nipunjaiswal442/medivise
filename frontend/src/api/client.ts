import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import env from '@/config/env';

function getToken(): string | null {
  return (
    localStorage.getItem(env.TOKEN_KEY) ??
    sessionStorage.getItem(env.TOKEN_KEY)
  );
}

function createApiClient(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, withCredentials: true });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(env.TOKEN_KEY);
        sessionStorage.removeItem(env.TOKEN_KEY);
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

/** Main API client for backend endpoints */
export const apiClient = createApiClient(env.API_BASE_URL);

/** Dedicated client for LLM/AI endpoints (separate base URL for future use) */
export const llmClient = createApiClient(env.LLM_BASE_URL);

/** Type-safe request helper */
export async function request<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
): Promise<T> {
  const response: AxiosResponse<T> = await client.request(config);
  return response.data;
}
