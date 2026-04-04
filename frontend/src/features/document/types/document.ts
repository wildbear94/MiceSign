// === Response Types (from backend) ===
export interface DocumentResponse {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: DocumentStatus;
  drafterName: string;
  drafterDepartmentName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrafterInfo {
  id: number;
  name: string;
  departmentName: string;
  positionName: string | null;
}

export interface DocumentDetailResponse extends DocumentResponse {
  drafter: DrafterInfo;
  bodyHtml: string | null;
  formData: string | null; // JSON string, parsed on frontend
  submittedAt: string | null;
  completedAt: string | null;
}

export interface TemplateResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
}

export interface LeaveTypeResponse {
  id: number;
  code: string;
  name: string;
  isHalfDay: boolean;
  sortOrder: number;
}

// === Request Types ===
export interface CreateDocumentRequest {
  templateCode: string;
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
}

export interface UpdateDocumentRequest {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
}

// === Enums ===
export type DocumentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

// === Form Data Types (parsed from formData JSON string) ===
export interface ExpenseItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ExpenseFormData {
  items: ExpenseItem[];
  totalAmount: number;
  paymentMethod?: string;
  accountInfo?: string;
}

export interface LeaveFormData {
  leaveTypeId: number;
  startDate: string;
  endDate: string | null;
  startTime?: string | null;
  endTime?: string | null;
  days: number;
  reason: string;
  emergencyContact?: string;
}

// === Query Params ===
export interface MyDocumentParams {
  page?: number;
  size?: number;
  status?: DocumentStatus;
}

// === Attachment Types ===
export interface AttachmentResponse {
  id: number;
  documentId: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error';

// === Search Types ===
export type SearchTab = 'MY' | 'APPROVAL' | 'ALL';

export interface DocumentSearchParams {
  tab: SearchTab;
  keyword?: string;
  status?: DocumentStatus;
  templateCode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface FileUploadItem {
  id: string;            // temporary client-side ID (crypto.randomUUID())
  file: File;
  status: UploadStatus;
  progress: number;      // 0-100
  error?: string;
  attachment?: AttachmentResponse;  // populated after successful upload
}
