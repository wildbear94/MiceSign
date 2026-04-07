export interface AuditLogResponse {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  targetType: string | null;
  targetId: number | null;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  userId?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export const AUDIT_ACTIONS = [
  { value: 'DOCUMENT_CREATE', label: '문서 생성' },
  { value: 'DOCUMENT_SUBMIT', label: '문서 제출' },
  { value: 'DOCUMENT_APPROVE', label: '문서 승인' },
  { value: 'DOCUMENT_REJECT', label: '문서 반려' },
  { value: 'DOCUMENT_WITHDRAW', label: '문서 회수' },
  { value: 'LOGIN_SUCCESS', label: '로그인 성공' },
  { value: 'LOGIN_FAILED', label: '로그인 실패' },
  { value: 'LOGOUT', label: '로그아웃' },
  { value: 'FILE_UPLOAD', label: '파일 업로드' },
  { value: 'FILE_DOWNLOAD', label: '파일 다운로드' },
] as const;
