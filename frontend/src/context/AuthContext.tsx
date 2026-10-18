import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuthActions, useAuthToken, useConvexAuth } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/api';
import type { LoginCredentials, SignupData, User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The Convex Auth JWT, for calls to our own /api functions. */
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  /** Emails a 6-digit reset code (requires AUTH_RESEND_KEY on the Convex deployment). */
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Authentication through Convex Auth (email + password). The profile lives in the Convex users table. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const token = useAuthToken();
  const me = useQuery(api.functions.users.me, isAuthenticated ? {} : 'skip');

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      await signIn('password', { flow: 'signIn', email: email.trim().toLowerCase(), password });
    },
    [signIn],
  );

  const signup = useCallback(
    async (data: SignupData) => {
      await signIn('password', {
        flow: 'signUp',
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.name.trim(),
        role: data.role,
        specialty: data.specialty,
        licenseNumber: data.licenseNumber.trim(),
      });
    },
    [signIn],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      await signIn('password', { flow: 'reset', email: email.trim().toLowerCase() });
    },
    [signIn],
  );

  const confirmPasswordReset = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await signIn('password', { flow: 'reset-verification', email: email.trim().toLowerCase(), code: code.trim(), newPassword });
    },
    [signIn],
  );

  const user: User | null = useMemo(
    () =>
      me
        ? { id: me._id, email: me.email, name: me.name, role: me.role, specialty: me.specialty, licenseNumber: me.licenseNumber }
        : null,
    [me],
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated: isAuthenticated && !!user,
    // Signed in but the profile query has not answered yet still counts as loading
    isLoading: authLoading || (isAuthenticated && me === undefined),
    token,
    login,
    signup,
    requestPasswordReset,
    confirmPasswordReset,
    logout: signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
