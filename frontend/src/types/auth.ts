export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  departmentId: number;
  mustChangePassword: boolean;
  /** Phase 34 (D-F1) — login/refresh 응답에 라이브 부서명. orphan-safe nullable. */
  departmentName: string | null;
  /** Phase 34 (D-F1) — 라이브 직위·직책. User.positionId nullable 이므로 nullable. */
  positionName: string | null;
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
