package com.micesign.mapper;

import com.micesign.domain.Position;
import com.micesign.dto.position.PositionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PositionMapper {

    @Mapping(target = "userCount", source = "userCount")
    @Mapping(target = "isActive", source = "position.active")
    PositionResponse toResponse(Position position, int userCount);
}
