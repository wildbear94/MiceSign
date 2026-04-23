package com.micesign.dto.dashboard;

import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import java.util.List;

public record DashboardSummaryResponse(
    long pendingCount,       // approval lines awaiting this user (or scope, Phase 31 D-A4/A5)
    long draftCount,         // user's DRAFT documents (FE 노출 안 함, 타입 유지 — Phase 31 D-A3)
    long submittedCount,     // user's SUBMITTED documents
    long completedCount,     // = APPROVED only (Phase 31 D-A2 semantics 재정의 — 기존 APPROVED+REJECTED 합산 폐기)
    long rejectedCount,      // ★ 신규 (Phase 31 D-A2) — REJECTED only
    List<PendingApprovalResponse> recentPending,     // latest 5 (본인 스코프 유지)
    List<DocumentResponse> recentDocuments            // latest 5 (본인 스코프 유지)
) {
    /**
     * Phase 31 backward-compat — 기존 DashboardService (6-arg 호출, rejectedCount 미포함) 가
     * Plan 01 단독 적용 시에도 컴파일 되도록 제공. Plan 02 에서 role 분기 refactor 완료 후
     * DashboardService 가 7-arg canonical constructor 로 전환되면 본 secondary constructor 는
     * call-site 가 사라지지만 삭제하지 않음 (미래 호출자에게 안전한 default 제공).
     */
    public DashboardSummaryResponse(
            long pendingCount,
            long draftCount,
            long submittedCount,
            long completedCount,
            List<PendingApprovalResponse> recentPending,
            List<DocumentResponse> recentDocuments) {
        this(pendingCount, draftCount, submittedCount, completedCount, 0L, recentPending, recentDocuments);
    }
}
