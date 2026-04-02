package com.micesign.mapper;

import com.micesign.domain.ApprovalTemplate;
import com.micesign.dto.template.TemplateResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TemplateMapper {

    TemplateResponse toResponse(ApprovalTemplate template);
}
