package com.micesign.mapper;

import com.micesign.domain.Document;
import com.micesign.domain.DocumentContent;
import com.micesign.dto.document.DocumentDetailResponse;
import com.micesign.dto.document.DocumentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DocumentMapper {

    @Mapping(target = "status", expression = "java(document.getStatus().name())")
    @Mapping(target = "templateName", source = "templateName")
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
    @Mapping(target = "submittedAt", source = "document.submittedAt")
    @Mapping(target = "completedAt", source = "document.completedAt")
    @Mapping(target = "createdAt", source = "document.createdAt")
    @Mapping(target = "updatedAt", source = "document.updatedAt")
    DocumentDetailResponse toDetailResponse(Document document, DocumentContent content, String templateName);

    @Mapping(target = "id", source = "drafter.id")
    @Mapping(target = "name", source = "drafter.name")
    @Mapping(target = "departmentName", source = "drafter.department.name")
    @Mapping(target = "positionName", source = "drafter.position.name")
    DocumentDetailResponse.DrafterInfo toDrafterInfo(com.micesign.domain.User drafter);
}
