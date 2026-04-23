export interface DashboardSummary {
  pendingCount: number;
  draftCount: number;           // Phase 31 D-A3: FE 노출 안 함, API contract 보존
  submittedCount: number;
  completedCount: number;       // Phase 31 D-A2 재정의: APPROVED only (기존 APPROVED+REJECTED 합산 폐기)
  rejectedCount: number;        // Phase 31 D-A2 신규: REJECTED only
  recentPending: PendingApprovalSummary[];
  recentDocuments: RecentDocumentSummary[];
}

export interface PendingApprovalSummary {
  id: number;
  documentId: number;
  docNumber: string | null;
  templateCode: string;
  title: string;
  drafterName: string;
  departmentName: string | null;
  stepOrder: number;
  lineType: string;
  createdAt: string;
}

export interface RecentDocumentSummary {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
