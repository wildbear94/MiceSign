package com.micesign.mapper;

import com.micesign.domain.OptionItem;
import com.micesign.domain.OptionSet;
import com.micesign.dto.option.OptionItemResponse;
import com.micesign.dto.option.OptionSetResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OptionSetMapper {

    @Mapping(source = "active", target = "isActive")
    OptionSetResponse toResponse(OptionSet optionSet);

    @Mapping(source = "active", target = "isActive")
    OptionItemResponse toItemResponse(OptionItem item);
}
