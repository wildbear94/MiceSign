export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  departmentId: number;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}

export interface RefreshResponse {
  accessToken: string;
  user: UserProfile;
}

export interface AuthErrorData {
  code?: string;
  message?: string;
  remainingAttempts?: number;
  lockedUntil?: string; // ISO timestamp
}
