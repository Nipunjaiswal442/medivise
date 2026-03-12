import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/api/auth.api';
import env from '@/config/env';
import type { AuthState, LoginCredentials, User } from '@/types/auth';

// ─── State & Actions ─────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const token =
      localStorage.getItem(env.TOKEN_KEY) ||
      sessionStorage.getItem(env.TOKEN_KEY);

    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    authApi
      .me()
      .then(({ user }) =>
        dispatch({ type: 'RESTORE_SESSION', payload: { user, token } })
      )
      .catch(() => {
        localStorage.removeItem(env.TOKEN_KEY);
        sessionStorage.removeItem(env.TOKEN_KEY);
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { token, user } = await authApi.login({
      email: credentials.email,
      password: credentials.password,
    });

    // Persist based on "remember me"
    const storage = credentials.rememberMe ? localStorage : sessionStorage;
    storage.setItem(env.TOKEN_KEY, token);

    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed on the backend, proceeding to clear local session.', err);
    } finally {
      localStorage.removeItem(env.TOKEN_KEY);
      sessionStorage.removeItem(env.TOKEN_KEY);
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
