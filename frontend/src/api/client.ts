import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { auth } from '@/config/firebase';
import env from '@/config/env';

function createApiClient(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, withCredentials: true });

  // Attach Firebase ID token to every request
  instance.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

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
