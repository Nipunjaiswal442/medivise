const env = {
  CONVEX_URL: import.meta.env.VITE_CONVEX_URL as string | undefined,
  /** Where the Vercel functions (/api/chat etc.) live; same origin by default. */
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  APP_NAME: 'Medivise',
} as const;

export default env;
