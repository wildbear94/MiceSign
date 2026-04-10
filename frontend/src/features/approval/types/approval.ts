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
  stepOrder: number;
}

export interface ApprovalActionRequest {
  comment?: string | null;
}

export interface PendingApprovalResponse {
  approvalLineId: number;
  documentId: number;
  docNumber: string;
  templateCode: string;
  title: string;
  drafterName: string;
  departmentName: string;
  stepOrder: number;
  lineType: string;
  createdAt: string;
}

// Local state for approval line editor (not sent to server)
export interface ApprovalLineItem {
  userId: number;
  userName: string;
  departmentName: string;
  positionName: string | null;
  lineType: ApprovalLineType;
}
