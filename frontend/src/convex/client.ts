import { ConvexReactClient } from 'convex/react';
import { ConvexError } from 'convex/values';
import env from '@/config/env';

/** False when VITE_CONVEX_URL is missing; the app still loads but backend calls fail clearly. */
export const convexConfigured = Boolean(env.CONVEX_URL);

let client: ConvexReactClient | null = null;

export function getConvex(): ConvexReactClient {
  if (!env.CONVEX_URL) {
    throw new Error(
      'The backend is not configured. Set VITE_CONVEX_URL in frontend/.env and restart `npm run dev`.',
    );
  }
  client ??= new ConvexReactClient(env.CONVEX_URL);
  return client;
}

/**
 * Authenticates the Convex client with the signed-in Firebase user's ID token.
 * Resolves true once the backend has accepted the token, false if it rejected it.
 */
export function authenticateConvex(
  getToken: (forceRefresh: boolean) => Promise<string | null>,
): Promise<boolean> {
  const convex = getConvex();
  return new Promise((resolve) => {
    let settled = false;
    convex.setAuth(
      async ({ forceRefreshToken }) => getToken(forceRefreshToken),
      (isAuthenticated) => {
        if (!settled) {
          settled = true;
          resolve(isAuthenticated);
        }
      },
    );
  });
}

export function clearConvexAuth(): void {
  if (convexConfigured) getConvex().clearAuth();
}

/** A user-presentable message for an error thrown by a Convex call. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ConvexError) {
    return typeof err.data === 'string' ? err.data : fallback;
  }
  if (err instanceof Error && !/Server Error|\[CONVEX/.test(err.message)) {
    return err.message || fallback;
  }
  return fallback;
}
