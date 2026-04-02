package com.micesign.mapper;

import com.micesign.domain.DocumentAttachment;
import com.micesign.dto.document.AttachmentResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DocumentAttachmentMapper {

    AttachmentResponse toResponse(DocumentAttachment entity);

    List<AttachmentResponse> toResponseList(List<DocumentAttachment> entities);
}
