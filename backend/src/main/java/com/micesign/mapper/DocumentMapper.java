package com.micesign.mapper;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.DocumentContent;
import com.micesign.dto.document.ApprovalLineResponse;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.dto.document.DocumentDetailResponse;
import com.micesign.dto.document.DocumentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    @Mapping(target = "status", expression = "java(document.getStatus().name())")
    @Mapping(target = "templateName", source = "templateName")
    @Mapping(target = "drafterName", expression = "java(document.getDrafter() != null ? document.getDrafter().getName() : null)")
    @Mapping(target = "departmentName", expression = "java(document.getDrafter() != null && document.getDrafter().getDepartment() != null ? document.getDrafter().getDepartment().getName() : null)")
    @Mapping(target = "positionName", expression = "java(document.getDrafter() != null && document.getDrafter().getPosition() != null ? document.getDrafter().getPosition().getName() : null)")
    @Mapping(target = "drafterId", expression = "java(document.getDrafter() != null ? document.getDrafter().getId() : null)")
    DocumentResponse toResponse(Document document, String templateName);

    @Mapping(target = "status", expression = "java(document.getStatus().name())")
    @Mapping(target = "templateName", source = "templateName")
    @Mapping(target = "bodyHtml", source = "content.bodyHtml")
    @Mapping(target = "formData", source = "content.formData")
    @Mapping(target = "schemaVersion", source = "content.schemaVersion")
    @Mapping(target = "schemaDefinitionSnapshot", source = "content.schemaDefinitionSnapshot")
    @Mapping(target = "drafterId", expression = "java(document.getDrafter() != null ? document.getDrafter().getId() : null)")
    @Mapping(target = "drafterName", expression = "java(document.getDrafter() != null ? document.getDrafter().getName() : null)")
    @Mapping(target = "departmentName", expression = "java(document.getDrafter() != null && document.getDrafter().getDepartment() != null ? document.getDrafter().getDepartment().getName() : null)")
    @Mapping(target = "positionName", expression = "java(document.getDrafter() != null && document.getDrafter().getPosition() != null ? document.getDrafter().getPosition().getName() : null)")
    @Mapping(target = "id", source = "document.id")
    @Mapping(target = "docNumber", source = "document.docNumber")
    @Mapping(target = "templateCode", source = "document.templateCode")
    @Mapping(target = "title", source = "document.title")
    @Mapping(target = "approvalLines", source = "approvalLines")
    @Mapping(target = "attachments", source = "attachments")
    @Mapping(target = "sourceDocId", source = "document.sourceDocId")
    @Mapping(target = "currentStep", source = "document.currentStep")
    @Mapping(target = "submittedAt", source = "document.submittedAt")
    @Mapping(target = "completedAt", source = "document.completedAt")
    @Mapping(target = "createdAt", source = "document.createdAt")
    DocumentDetailResponse toDetailResponse(Document document, DocumentContent content,
                                             String templateName, List<ApprovalLineResponse> approvalLines,
                                             List<AttachmentResponse> attachments);

    @Mapping(target = "lineType", expression = "java(line.getLineType().name())")
    @Mapping(target = "status", expression = "java(line.getStatus().name())")
    @Mapping(target = "approverId", expression = "java(line.getApprover() != null ? line.getApprover().getId() : null)")
    @Mapping(target = "approverName", expression = "java(line.getApprover() != null ? line.getApprover().getName() : null)")
    @Mapping(target = "departmentName", expression = "java(line.getApprover() != null && line.getApprover().getDepartment() != null ? line.getApprover().getDepartment().getName() : null)")
    @Mapping(target = "positionName", expression = "java(line.getApprover() != null && line.getApprover().getPosition() != null ? line.getApprover().getPosition().getName() : null)")
    ApprovalLineResponse toApprovalLineResponse(ApprovalLine line);

    @Mapping(target = "documentId", source = "documentId")
    AttachmentResponse toAttachmentResponse(DocumentAttachment attachment);
}
