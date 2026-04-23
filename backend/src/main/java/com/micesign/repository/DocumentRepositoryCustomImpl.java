package com.micesign.repository;

import com.micesign.domain.QApprovalLine;
import com.micesign.domain.QDepartment;
import com.micesign.domain.QDocument;
import com.micesign.domain.QPosition;
import com.micesign.domain.QUser;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.DocumentSearchCondition;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

public class DocumentRepositoryCustomImpl implements DocumentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public DocumentRepositoryCustomImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<DocumentResponse> searchDocuments(
            DocumentSearchCondition condition, Long userId, String role,
            Long departmentId, Pageable pageable) {

        QDocument doc = QDocument.document;
        QUser drafter = QUser.user;
        QDepartment dept = QDepartment.department;
        QPosition pos = QPosition.position;
        QApprovalLine approvalLine = QApprovalLine.approvalLine;

        BooleanBuilder where = new BooleanBuilder();

        // Tab scope logic
        String tab = condition.tab() != null ? condition.tab().toLowerCase() : "my";
        switch (tab) {
            case "my" -> where.and(doc.drafterId.eq(userId));
            case "department" -> where.and(drafter.departmentId.eq(departmentId));
            case "all" -> {
                // Scope by role
                if ("ADMIN".equals(role)) {
                    where.and(drafter.departmentId.eq(departmentId));
                }
                // SUPER_ADMIN sees all — no additional predicate
            }
            default -> where.and(doc.drafterId.eq(userId));
        }

        // FSD FN-SEARCH-001 권한 predicate (SRCH-01, T-30-01)
        // 번역 원본: DocumentService.getDocument L204-223 의 4-브랜치 Java 참조 구현
        // - isDrafter        → doc.drafterId.eq(userId)
        // - isApprovalParticipant → EXISTS approval_line WHERE document_id = doc.id AND approver_id = userId
        // - isAdminSameDept  → role == ADMIN AND doc.drafterId IN (SELECT u.id FROM user u WHERE u.departmentId = departmentId)
        // - isSuperAdmin     → predicate 전체 skip (전체 조회)
        if (!"SUPER_ADMIN".equals(role)) {
            BooleanExpression ownDoc = doc.drafterId.eq(userId);
            BooleanExpression approvalParticipant = JPAExpressions.selectOne()
                    .from(approvalLine)
                    .where(approvalLine.document.id.eq(doc.id)
                            .and(approvalLine.approver.id.eq(userId)))
                    .exists();
            BooleanExpression permissionBranch = ownDoc.or(approvalParticipant);

            if ("ADMIN".equals(role) && departmentId != null) {
                QUser deptUser = new QUser("deptUser"); // 서브쿼리 별칭 — main drafter join 과 충돌 방지
                BooleanExpression sameDepartment = doc.drafterId.in(
                        JPAExpressions.select(deptUser.id)
                                .from(deptUser)
                                .where(deptUser.departmentId.eq(departmentId))
                );
                permissionBranch = permissionBranch.or(sameDepartment);
            }
            where.and(permissionBranch);
        }
        // SUPER_ADMIN: 권한 predicate 전체 생략 (D-A2)

        // DRAFT gate (D-A4/A5/A6, T-30-02) — tab=my 에서만 본인 DRAFT 노출
        if (!"my".equals(tab)) {
            where.and(doc.status.ne(DocumentStatus.DRAFT));
        }

        // Keyword search (OR across title, docNumber, drafter name)
        if (condition.keyword() != null && !condition.keyword().isBlank()) {
            String escaped = escapeLikePattern(condition.keyword().trim());
            String kw = "%" + escaped + "%";
            where.and(
                    doc.title.likeIgnoreCase(kw)
                            .or(doc.docNumber.likeIgnoreCase(kw))
                            .or(drafter.name.likeIgnoreCase(kw))
            );
        }

        // Filters (AND logic)
        if (condition.statuses() != null && !condition.statuses().isEmpty()) {
            where.and(doc.status.in(condition.statuses()));
        }
        if (condition.drafterId() != null) {
            where.and(doc.drafterId.eq(condition.drafterId()));
        }
        if (condition.templateCode() != null && !condition.templateCode().isBlank()) {
            where.and(doc.templateCode.eq(condition.templateCode()));
        }
        if (condition.dateFrom() != null) {
            where.and(doc.submittedAt.goe(condition.dateFrom().atStartOfDay()));
        }
        if (condition.dateTo() != null) {
            where.and(doc.submittedAt.lt(condition.dateTo().plusDays(1).atStartOfDay()));
        }

        // Count query — countDistinct 로 JOIN inflate 방어 (D-D3)
        // Pitfall 7: count 쿼리에 orderBy 절대 없음
        Long total = queryFactory.select(doc.countDistinct())
                .from(doc)
                .join(doc.drafter, drafter)
                .join(drafter.department, dept)
                .leftJoin(drafter.position, pos)
                .where(where)
                .fetchOne();
        if (total == null) {
            total = 0L;
        }

        // Content query with projection to DocumentResponse
        List<DocumentResponse> content = queryFactory
                .select(Projections.constructor(DocumentResponse.class,
                        doc.id,
                        doc.docNumber,
                        doc.templateCode,
                        doc.templateCode,  // templateName — resolved later or via join
                        doc.title,
                        doc.status.stringValue(),
                        drafter.name,
                        dept.name,
                        pos.name,
                        doc.drafterId,
                        doc.submittedAt,
                        doc.completedAt,
                        doc.createdAt
                ))
                .from(doc)
                .join(doc.drafter, drafter)
                .join(drafter.department, dept)
                .leftJoin(drafter.position, pos)
                .where(where)
                .orderBy(doc.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        return new PageImpl<>(content, pageable, total);
    }

    private String escapeLikePattern(String input) {
        return input.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
