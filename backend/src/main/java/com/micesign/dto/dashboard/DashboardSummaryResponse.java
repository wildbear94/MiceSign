package com.micesign.dto.dashboard;

public record DashboardSummaryResponse(long pendingCount, long draftCount, long completedCount) {
}
