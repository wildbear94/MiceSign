import type { ApprovalLineResponse, ApprovalLineRequest } from '../../approval/types/approval';

// === Response Types (from backend) ===
export interface DocumentResponse {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: DocumentStatus;
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
  // Phase 7 additions
  drafterId: number;
  currentStep: number | null;
  sourceDocId: number | null;
  approvalLines: ApprovalLineResponse[];
  /** 백엔드 DocumentContent.schemaVersion (CUSTOM 템플릿 전용) */
  schemaVersion?: number | null;
  /** 백엔드 DocumentContent.schemaDefinitionSnapshot — JSON 직렬화된 SchemaDefinition 스냅샷. 백엔드 DocumentService가 자동 저장 (D-10). */
  schemaDefinitionSnapshot?: string | null;
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
  approvalLines?: ApprovalLineRequest[] | null;
}

export interface UpdateDocumentRequest {
  title: string;
  bodyHtml?: string | null;
  formData?: string | null;
  approvalLines?: ApprovalLineRequest[] | null;
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

export interface PurchaseItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
export interface PurchaseFormData {
  supplier: string;
  deliveryDate: string;
  purchaseReason: string;
  items: PurchaseItem[];
  totalAmount: number;
}

export interface ItineraryItem {
  date: string;
  location: string;
  description?: string;
}
export interface TripExpenseItem {
  category: string;
  amount: number;
  description?: string;
}
export interface BusinessTripFormData {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  itinerary: ItineraryItem[];
  expenses?: TripExpenseItem[];
  totalExpense?: number;
}

export interface OvertimeFormData {
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
}

// === Query Params ===
export interface MyDocumentParams {
  page?: number;
  size?: number;
  status?: DocumentStatus;
}

export interface DocumentSearchParams {
  keyword?: string;
  statuses?: DocumentStatus[];
  templateCode?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: 'my' | 'search';
  page?: number;
  size?: number;
  drafterId?: number;
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

export interface FileUploadItem {
  id: string;            // temporary client-side ID (crypto.randomUUID())
  file: File;
  status: UploadStatus;
  progress: number;      // 0-100
  error?: string;
  attachment?: AttachmentResponse;  // populated after successful upload
}
