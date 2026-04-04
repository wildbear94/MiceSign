import type { ApprovalLineRequest, ApprovalLineResponse } from '../../approval/types/approval';

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
  approvalLines: ApprovalLineResponse[];
  sourceDocId: number | null;
  currentStep: number | null;
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

// === Purchase Request Form Data (per D-04) ===
export interface PurchaseItem {
  name: string;
  spec: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseFormData {
  supplier: string;
  deliveryDate: string;
  paymentMethod: string;
  purchaseReason: string;
  items: PurchaseItem[];
  totalAmount: number;
}

// === Business Trip Report Form Data (per D-09) ===
export interface ItineraryItem {
  date: string;
  location: string;
  description: string;
}

export interface TripExpenseItem {
  category: string;
  description: string;
  amount: number;
}

export interface BusinessTripFormData {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  result: string;
  itinerary: ItineraryItem[];
  expenses: TripExpenseItem[];
  totalExpense: number;
}

// === Overtime Request Form Data (per D-14) ===
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
