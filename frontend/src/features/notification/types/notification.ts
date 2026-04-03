export interface NotificationLogResponse {
  id: number;
  recipientId: number;
  recipientName: string | null;
  recipientEmail: string;
  eventType: string;
  documentId: number | null;
  documentTitle: string | null;
  subject: string;
  status: string; // PENDING, SUCCESS, FAILED, RETRY
  retryCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationLogFilter {
  status?: string;
  eventType?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export const NOTIFICATION_STATUSES = [
  { value: 'SUCCESS', label: '성공' },
  { value: 'FAILED', label: '실패' },
  { value: 'PENDING', label: '대기' },
] as const;

export const NOTIFICATION_EVENT_TYPES = [
  { value: 'SUBMIT', label: '제출' },
  { value: 'APPROVE', label: '승인' },
  { value: 'REJECT', label: '반려' },
  { value: 'WITHDRAW', label: '회수' },
] as const;
