// === Enums / Union Types ===
export type DocumentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type ApprovalLineType = 'APPROVE' | 'AGREE' | 'REFERENCE';
export type ApprovalLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

// === Template (from backend TemplateResponse) ===
export interface Template {
  id: number;
  code: string;
  name: string;
  description: string | null;
  prefix: string;
  isActive: boolean;
  sortOrder: number;
  isCustom: boolean;
  category: string | null;
  icon: string | null;
  budgetEnabled: boolean;
}

export interface TemplateDetail extends Template {
  schemaDefinition: string | null;
  schemaVersion: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

// === Document List Item ===
export interface DocumentListItem {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: DocumentStatus;
  drafterName: string;
  departmentName: string;
  positionName: string;
  drafterId: number;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// === Approval Line ===
export interface ApprovalLine {
  id: number;
  approverId: number;
  approverName: string;
  departmentName: string;
  positionName: string;
  lineType: ApprovalLineType;
  stepOrder: number;
  status: ApprovalLineStatus;
  comment: string | null;
  actedAt: string | null;
}

// === Attachment ===
export interface Attachment {
  id: number;
  documentId: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
  gdriveFileId: string;
  createdAt: string;
}

// === Document Detail ===
export interface DocumentDetail {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: DocumentStatus;
  drafterId: number;
  drafterName: string;
  departmentName: string;
  positionName: string;
  currentStep: number | null;
  sourceDocId: number | null;
  bodyHtml: string | null;
  formData: string | null; // JSON string
  schemaVersion: number | null;
  schemaDefinitionSnapshot: string | null;
  approvalLines: ApprovalLine[];
  attachments: Attachment[];
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// === Request Types ===
export interface CreateDocumentRequest {
  templateCode: string;
  title: string;
  bodyHtml?: string;
  formData?: string;
  approvalLines?: ApprovalLineRequest[];
}

export interface UpdateDocumentRequest {
  title: string;
  bodyHtml?: string;
  formData?: string;
  approvalLines?: ApprovalLineRequest[];
}

export interface ApprovalLineRequest {
  approverId: number;
  lineType: ApprovalLineType;
  stepOrder: number;
}

export interface ApprovalActionRequest {
  comment?: string;
}

// === Search ===
export interface DocumentSearchParams {
  keyword?: string;
  status?: DocumentStatus;
  templateCode?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: 'my' | 'department' | 'all';
  page?: number;
  size?: number;
}

// === Pending Approval ===
export interface PendingApproval {
  approvalLineId: number;
  documentId: number;
  docNumber: string | null;
  templateCode: string;
  title: string;
  drafterName: string;
  departmentName: string;
  stepOrder: number;
  lineType: ApprovalLineType;
  createdAt: string;
}

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

export interface OvertimeFormData {
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
}

// === Upload Types (client-side only) ===
export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error';

export interface FileUploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  attachment?: Attachment;
}
