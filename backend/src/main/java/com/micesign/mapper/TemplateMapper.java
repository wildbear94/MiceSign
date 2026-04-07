package com.micesign.mapper;

import com.micesign.domain.ApprovalTemplate;
import com.micesign.dto.template.TemplateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TemplateMapper {

    @Mapping(source = "custom", target = "isCustom")
    TemplateResponse toResponse(ApprovalTemplate template);
}
