export interface DashboardSummary {
  pendingCount: number;
  draftCount: number;
  submittedCount: number;
  completedCount: number;
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
