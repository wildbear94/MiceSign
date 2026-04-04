package com.micesign.repository;

import com.micesign.domain.Document;
import com.micesign.domain.QApprovalLine;
import com.micesign.domain.QDocument;
import com.micesign.domain.QUser;
import com.micesign.domain.QDepartment;
import com.micesign.dto.document.DocumentSearchCondition;
import com.querydsl.core.BooleanBuilder;
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
    public Page<Document> searchDocuments(DocumentSearchCondition condition, Long userId, Pageable pageable) {
        QDocument doc = QDocument.document;
        QApprovalLine approvalLine = QApprovalLine.approvalLine;

        BooleanBuilder where = new BooleanBuilder();

        // Tab scope logic
        switch (condition.tab()) {
            case MY -> where.and(doc.drafter.id.eq(userId));
            case APPROVAL -> where.and(
                    doc.id.in(
                            JPAExpressions.select(approvalLine.document.id)
                                    .from(approvalLine)
                                    .where(approvalLine.approver.id.eq(userId))
                    )
            );
            case ALL -> {
                // No additional predicate — RBAC enforced at controller
            }
        }

        // Keyword search (OR across title, docNumber, drafter name)
        if (condition.keyword() != null && !condition.keyword().isBlank()) {
            String escaped = escapeLikePattern(condition.keyword().trim());
            String kw = "%" + escaped + "%";
            where.and(
                    doc.title.likeIgnoreCase(kw)
                            .or(doc.docNumber.likeIgnoreCase(kw))
                            .or(doc.drafter.name.likeIgnoreCase(kw))
            );
        }

        // Filters (AND logic)
        if (condition.status() != null) {
            where.and(doc.status.eq(condition.status()));
        }
        if (condition.templateCode() != null && !condition.templateCode().isBlank()) {
            where.and(doc.templateCode.eq(condition.templateCode()));
        }
        if (condition.startDate() != null) {
            where.and(doc.createdAt.goe(condition.startDate().atStartOfDay()));
        }
        if (condition.endDate() != null) {
            where.and(doc.createdAt.lt(condition.endDate().plusDays(1).atStartOfDay()));
        }

        // Count query
        Long total = queryFactory.select(doc.count())
                .from(doc)
                .where(where)
                .fetchOne();
        if (total == null) {
            total = 0L;
        }

        // Content query with fetch joins to avoid N+1
        List<Document> content = queryFactory.selectFrom(doc)
                .leftJoin(doc.drafter).fetchJoin()
                .leftJoin(doc.drafter.department).fetchJoin()
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
