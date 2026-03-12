export interface User {
  id: string;
  email: string;
  name: string;
  role: 'physician' | 'nurse' | 'admin' | 'pharmacist';
  specialty: string | null;
  licenseNumber: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
