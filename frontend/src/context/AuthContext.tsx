import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  authenticateConvex,
  clearConvexAuth,
  convexConfigured,
  getConvex,
} from '@/convex/client';
import { fn } from '@/convex/functions';
import type { User, LoginCredentials } from '@/types/auth';

// ─── Context value ───────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
    specialty: string;
    licenseNumber: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a Firebase user + stored metadata into our app User type */
function toAppUser(fbUser: FirebaseUser): User {
  // Read extra profile data from localStorage (set during signup)
  const stored = localStorage.getItem(`medivise_profile_${fbUser.uid}`);
  const extra = stored ? JSON.parse(stored) : {};

  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: fbUser.displayName ?? extra.name ?? 'Doctor',
    role: extra.role ?? 'physician',
    specialty: extra.specialty ?? null,
    licenseNumber: extra.licenseNumber ?? null,
  };
}

/**
 * Signs the Convex client in with the Firebase user's ID token, creates/updates the clinician's
 * profile on the backend, and returns the profile the backend holds (it is the source of truth for
 * the role). If the backend is unconfigured or unreachable the Firebase-derived user is returned,
 * so the rest of the app keeps working; backend-backed pages then report their own errors.
 */
async function syncWithBackend(fbUser: FirebaseUser, appUser: User): Promise<User> {
  if (!convexConfigured) {
    console.warn('VITE_CONVEX_URL is not set: patients and predictions are unavailable.');
    return appUser;
  }
  try {
    const accepted = await authenticateConvex((force) => fbUser.getIdToken(force));
    if (!accepted) {
      throw new Error(
        'The backend rejected the sign-in token. Check convex/auth.config.ts and the Firebase project id.',
      );
    }
    const convex = getConvex();
    await convex.mutation(fn.upsertCurrentUser, {
      name: appUser.name,
      role: appUser.role,
      specialty: appUser.specialty ?? undefined,
      licenseNumber: appUser.licenseNumber ?? undefined,
    });
    const profile = await convex.query(fn.getCurrentUser, {});
    return profile
      ? {
          ...appUser,
          name: profile.name,
          role: profile.role,
          specialty: profile.specialty ?? null,
          licenseNumber: profile.licenseNumber ?? null,
        }
      : appUser;
  } catch (err) {
    console.error('Backend sign-in failed:', err);
    return appUser;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // login()/signup() activate the user themselves; the auth-state listener must not race them.
  const activatingManually = useRef(false);

  const activate = useCallback(async (fbUser: FirebaseUser) => {
    setFirebaseUser(fbUser);
    setUser(await syncWithBackend(fbUser, toAppUser(fbUser)));
  }, []);

  // Restore the session and follow sign-in/out; stay "loading" until the backend is signed in too
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (activatingManually.current) return;
      if (fbUser) {
        await activate(fbUser);
      } else {
        clearConvexAuth();
        setFirebaseUser(null);
        setUser(null);
      }
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activate]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      activatingManually.current = true;
      try {
        const { user: fbUser } = await signInWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password,
        );
        await activate(fbUser);
      } finally {
        activatingManually.current = false;
      }
    },
    [activate],
  );

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      role: string;
      specialty: string;
      licenseNumber: string;
    }) => {
      activatingManually.current = true;
      try {
        const { user: fbUser } = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password,
        );

        // Set display name on Firebase profile
        await updateProfile(fbUser, { displayName: data.name });

        // Keep the chosen role/specialty/licence locally; the backend profile is created from them
        const profileData = {
          name: data.name,
          role: data.role,
          specialty: data.specialty,
          licenseNumber: data.licenseNumber,
        };
        localStorage.setItem(
          `medivise_profile_${fbUser.uid}`,
          JSON.stringify(profileData),
        );

        await activate(fbUser);
      } finally {
        activatingManually.current = false;
      }
    },
    [activate],
  );

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    clearConvexAuth();
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
