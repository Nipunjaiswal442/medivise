export type Role = 'physician' | 'nurse' | 'admin' | 'pharmacist';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  specialty: string | null;
  licenseNumber: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role: string;
  specialty: string;
  licenseNumber: string;
}
