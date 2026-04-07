export interface AuditLogEntry {
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

export interface AuditLogSearchParams {
  userId?: number;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// Aliases used by filter/table components
export type AuditLogFilter = AuditLogSearchParams;
export type AuditLogResponse = AuditLogEntry;
