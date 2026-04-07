// Re-export shared types from document types
export type {
  ApprovalLineType,
  ApprovalLineStatus,
  ApprovalLine,
  ApprovalLineRequest,
  ApprovalActionRequest,
  PendingApproval,
  DocumentDetail,
  DocumentListItem,
} from '../../document/types/document';

// Approval line item for building approval lines in the editor
export interface ApprovalLineItem {
  userId: number;
  userName: string;
  departmentName: string;
  positionName: string | null;
  lineType: 'APPROVE' | 'AGREE' | 'REFERENCE';
}
