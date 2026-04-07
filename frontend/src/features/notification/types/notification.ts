export type NotificationStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY';

export interface NotificationLogEntry {
  id: number;
  recipientId: number;
  recipientName: string;
  recipientEmail: string;
  eventType: string;
  documentId: number | null;
  docNumber: string | null;
  subject: string;
  status: NotificationStatus;
  retryCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationLogSearchParams {
  recipientId?: number;
  eventType?: string;
  status?: string;
  documentId?: number;
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// Aliases used by filter/table components
export type NotificationLogFilter = NotificationLogSearchParams;
export type NotificationLogResponse = NotificationLogEntry;
