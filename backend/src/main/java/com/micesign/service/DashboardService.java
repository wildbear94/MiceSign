package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.Document;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.dashboard.DashboardSummaryResponse;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Phase 31 Plan 02 — role-based dashboard summary aggregation.
 *
 * 권한 분기 (D-A4/A5/A6):
 *   - USER        : drafterIds = approverIds = [userId]           (본인 스코프)
 *   - ADMIN       : descendantDeptIds = findDescendantIds(deptId)
 *                   → userIds = findIdsByDepartmentIdIn(...)        (부서 계층 재귀)
 *                   → drafterIds = approverIds = userIds
 *   - SUPER_ADMIN : drafterIds = approverIds = null (sentinel)    (전사, countByStatus)
 *
 * recentPending / recentDocuments 는 role 불문 본인 userId 스코프 유지 (RESEARCH A6 —
 * ADMIN 도 "내가 처리할 / 내가 기안한" 의미 보존).
 *
 * DashboardSummaryResponse 는 7-arg canonical constructor 로 생성 (rejectedCount 실값 전달).
 * Plan 01 의 6-arg backward-compat constructor 는 더 이상 이 call-site 에서 사용되지 않음.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final DocumentMapper documentMapper;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    public DashboardService(ApprovalLineRepository approvalLineRepository,
                            DocumentRepository documentRepository,
                            ApprovalTemplateRepository approvalTemplateRepository,
                            DocumentMapper documentMapper,
                            DepartmentRepository departmentRepository,
                            UserRepository userRepository) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.documentMapper = documentMapper;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    public DashboardSummaryResponse getDashboardSummary(Long userId, UserRole role, Long departmentId) {
        List<Long> drafterIds;   // null == SUPER_ADMIN sentinel, empty == ADMIN no-users
        List<Long> approverIds;

        switch (role) {
            case USER -> {
                drafterIds = List.of(userId);
                approverIds = List.of(userId);
            }
            case ADMIN -> {
                if (departmentId == null) {
                    // ADMIN 인데 부서 미할당 — 본인 스코프로 안전 fallback
                    drafterIds = List.of(userId);
                    approverIds = List.of(userId);
                } else {
                    List<Long> deptIds = departmentRepository.findDescendantIds(departmentId);
                    List<Long> userIds = deptIds.isEmpty()
                            ? Collections.emptyList()
                            : userRepository.findIdsByDepartmentIdIn(deptIds);
                    drafterIds = userIds.isEmpty() ? List.of(userId) : userIds;
                    approverIds = drafterIds;
                }
            }
            case SUPER_ADMIN -> {
                drafterIds = null;
                approverIds = null;
            }
            default -> {
                drafterIds = List.of(userId);
                approverIds = List.of(userId);
            }
        }

        // Counts (D-A2 semantics 재정의 — completedCount = APPROVED only, rejectedCount 분리)
        long pendingCount = countPending(approverIds);
        long draftCount = countDrafterStatus(drafterIds, DocumentStatus.DRAFT);
        long submittedCount = countDrafterStatus(drafterIds, DocumentStatus.SUBMITTED);
        long completedCount = countDrafterStatus(drafterIds, DocumentStatus.APPROVED);
        long rejectedCount = countDrafterStatus(drafterIds, DocumentStatus.REJECTED);

        // recentPending — 본인 스코프 (RESEARCH A6)
        Page<ApprovalLine> pendingPage = approvalLineRepository
                .findPendingByApproverId(userId, PageRequest.of(0, 5));
        List<PendingApprovalResponse> recentPending = pendingPage.getContent().stream()
                .map(line -> {
                    Document doc = line.getDocument();
                    return new PendingApprovalResponse(
                            line.getId(),
                            doc.getId(),
                            doc.getDocNumber(),
                            doc.getTemplateCode(),
                            doc.getTitle(),
                            doc.getDrafter().getName(),
                            doc.getDrafter().getDepartment() != null
                                    ? doc.getDrafter().getDepartment().getName() : null,
                            line.getStepOrder(),
                            line.getLineType().name(),
                            doc.getCreatedAt()
                    );
                })
                .toList();

        // recentDocuments — 본인 스코프 (RESEARCH A6)
        Map<String, String> templateNameMap = approvalTemplateRepository
                .findByIsActiveTrueOrderBySortOrder().stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        Page<Document> docPage = documentRepository.findByDrafterId(userId, PageRequest.of(0, 5));
        List<DocumentResponse> recentDocuments = docPage.getContent().stream()
                .map(doc -> documentMapper.toResponse(doc,
                        templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())))
                .toList();

        // 7-arg canonical constructor (rejectedCount 실값 전달)
        return new DashboardSummaryResponse(
                pendingCount, draftCount, submittedCount, completedCount, rejectedCount,
                recentPending, recentDocuments
        );
    }

    // ========== private helpers ==========

    /**
     * approverIds sentinel:
     *   null  → SUPER_ADMIN 전사 pending (countAllPending)
     *   empty → ADMIN 부서 descendant 에 user 없음 → 0
     *   else  → IN 절 카운트
     */
    private long countPending(List<Long> approverIds) {
        if (approverIds == null) return approvalLineRepository.countAllPending();
        if (approverIds.isEmpty()) return 0L;
        return approvalLineRepository.countPendingByApproverIdIn(approverIds);
    }

    /**
     * drafterIds sentinel:
     *   null  → SUPER_ADMIN 전사 카운트 (countByStatus)
     *   empty → ADMIN 부서 descendant 에 user 없음 → 0
     *   else  → IN 절 카운트
     */
    private long countDrafterStatus(List<Long> drafterIds, DocumentStatus status) {
        if (drafterIds == null) return documentRepository.countByStatus(status);
        if (drafterIds.isEmpty()) return 0L;
        return documentRepository.countByDrafterIdInAndStatus(drafterIds, status);
    }
}
