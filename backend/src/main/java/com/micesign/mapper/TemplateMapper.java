package com.micesign.mapper;

import com.micesign.domain.ApprovalTemplate;
import com.micesign.dto.template.AdminTemplateResponse;
import com.micesign.dto.template.TemplateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TemplateMapper {

    @Mapping(source = "custom", target = "isCustom")
    @Mapping(source = "active", target = "isActive")
    TemplateResponse toResponse(ApprovalTemplate template);

    @Mapping(source = "custom", target = "isCustom")
    @Mapping(source = "active", target = "isActive")
    @Mapping(target = "createdBy", expression = "java(template.getCreatedBy() != null ? template.getCreatedBy().getId() : null)")
    AdminTemplateResponse toAdminResponse(ApprovalTemplate template);
}
