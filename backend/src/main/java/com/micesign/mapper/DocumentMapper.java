package com.micesign.mapper;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.User;
import com.micesign.dto.document.ApprovalLineResponse;
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
    @Mapping(target = "drafterDepartmentName", expression = "java(document.getDrafter() != null && document.getDrafter().getDepartment() != null ? document.getDrafter().getDepartment().getName() : null)")
    DocumentResponse toResponse(Document document, String templateName);

    @Mapping(target = "status", expression = "java(document.getStatus().name())")
    @Mapping(target = "templateName", source = "templateName")
    @Mapping(target = "bodyHtml", source = "content.bodyHtml")
    @Mapping(target = "formData", source = "content.formData")
    @Mapping(target = "drafter", source = "document.drafter")
    @Mapping(target = "id", source = "document.id")
    @Mapping(target = "docNumber", source = "document.docNumber")
    @Mapping(target = "templateCode", source = "document.templateCode")
    @Mapping(target = "title", source = "document.title")
    @Mapping(target = "approvalLines", source = "approvalLines")
    @Mapping(target = "sourceDocId", source = "document.sourceDocId")
    @Mapping(target = "currentStep", source = "document.currentStep")
    @Mapping(target = "submittedAt", source = "document.submittedAt")
    @Mapping(target = "completedAt", source = "document.completedAt")
    @Mapping(target = "createdAt", source = "document.createdAt")
    @Mapping(target = "updatedAt", source = "document.updatedAt")
    @Mapping(target = "schemaDefinitionSnapshot", source = "content.schemaDefinitionSnapshot")
    DocumentDetailResponse toDetailResponse(Document document, DocumentContent content,
                                             String templateName, List<ApprovalLineResponse> approvalLines);

    @Mapping(target = "id", source = "drafter.id")
    @Mapping(target = "name", source = "drafter.name")
    @Mapping(target = "departmentName", source = "drafter.department.name")
    @Mapping(target = "positionName", source = "drafter.position.name")
    DocumentDetailResponse.DrafterInfo toDrafterInfo(User drafter);

    @Mapping(target = "lineType", expression = "java(line.getLineType().name())")
    @Mapping(target = "status", expression = "java(line.getStatus().name())")
    @Mapping(target = "approver", source = "approver")
    ApprovalLineResponse toApprovalLineResponse(ApprovalLine line);

    @Mapping(target = "id", source = "approver.id")
    @Mapping(target = "name", source = "approver.name")
    @Mapping(target = "departmentName", source = "approver.department.name")
    @Mapping(target = "positionName", source = "approver.position.name")
    ApprovalLineResponse.ApproverInfo toApproverInfo(User approver);
}
