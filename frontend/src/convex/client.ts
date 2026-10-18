import { ConvexReactClient } from 'convex/react';
import { ConvexError } from 'convex/values';
import env from '@/config/env';

/** Null when VITE_CONVEX_URL is missing; main.tsx then shows a setup screen. */
export const convex: ConvexReactClient | null = env.CONVEX_URL ? new ConvexReactClient(env.CONVEX_URL) : null;

/** A user-presentable message for an error thrown by a Convex call or sign-in. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ConvexError) {
    return typeof err.data === 'string' ? err.data : fallback;
  }
  if (err instanceof Error) {
    // Server errors arrive as "[CONVEX ...] [Request ID: ...] Server Error ... Uncaught ConvexError: <message>"
    const match = err.message.match(/ConvexError: (.+?)(\n|$)/);
    if (match) return match[1];
    if (!/Server Error|\[CONVEX|\[Request ID/.test(err.message)) return err.message || fallback;
  }
  return fallback;
}
