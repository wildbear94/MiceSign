export type ApprovalLineType = 'APPROVE' | 'AGREE' | 'REFERENCE';
export type ApprovalLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface ApproverInfo {
  id: number;
  name: string;
  departmentName: string;
  positionName: string | null;
}

export interface ApprovalLineResponse {
  id: number;
  lineType: ApprovalLineType;
  stepOrder: number;
  status: ApprovalLineStatus;
  comment: string | null;
  actedAt: string | null;
  approver: ApproverInfo;
}

export interface ApprovalLineRequest {
  approverId: number;
  lineType: ApprovalLineType;
}

export interface ApprovalActionRequest {
  comment?: string | null;
}

export interface PendingApprovalResponse {
  documentId: number;
  docNumber: string;
  templateCode: string;
  templateName: string;
  title: string;
  drafterId: number;
  drafterName: string;
  drafterDepartmentName: string;
  submittedAt: string;
}

// Local state for approval line editor (not sent to server)
export interface ApprovalLineItem {
  userId: number;
  userName: string;
  departmentName: string;
  positionName: string | null;
  lineType: ApprovalLineType;
}
