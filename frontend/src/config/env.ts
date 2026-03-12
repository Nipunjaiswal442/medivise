const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  LLM_BASE_URL: import.meta.env.VITE_LLM_BASE_URL ?? '/api/llm',
  APP_NAME: 'Medivise',
  TOKEN_KEY: 'medivise_token',
} as const;

export default env;
