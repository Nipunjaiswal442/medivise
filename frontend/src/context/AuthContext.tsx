import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setUser(toAppUser(fbUser));
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: fbUser } = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );
    setFirebaseUser(fbUser);
    setUser(toAppUser(fbUser));
  }, []);

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
      const { user: fbUser } = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );

      // Set display name on Firebase profile
      await updateProfile(fbUser, { displayName: data.name });

      // Store extra profile fields in localStorage (keyed by uid)
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

      setFirebaseUser(fbUser);
      setUser(toAppUser(fbUser));
    },
    [],
  );

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
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
