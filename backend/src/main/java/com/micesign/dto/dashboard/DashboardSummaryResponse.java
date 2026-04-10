package com.micesign.dto.dashboard;

import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import java.util.List;

public record DashboardSummaryResponse(
    long pendingCount,       // approval lines awaiting this user
    long draftCount,         // user's DRAFT documents
    long submittedCount,     // user's SUBMITTED documents
    long completedCount,     // user's APPROVED + REJECTED documents
    List<PendingApprovalResponse> recentPending,     // latest 5
    List<DocumentResponse> recentDocuments            // latest 5
) {}
