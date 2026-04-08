package com.micesign.mapper;

import com.micesign.domain.RegistrationRequest;
import com.micesign.dto.registration.RegistrationListResponse;
import com.micesign.dto.registration.RegistrationStatusResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RegistrationMapper {

    RegistrationStatusResponse toStatusResponse(RegistrationRequest entity);

    @Mapping(target = "employeeNo", ignore = true)
    @Mapping(target = "departmentName", ignore = true)
    @Mapping(target = "positionName", ignore = true)
    RegistrationListResponse toListResponse(RegistrationRequest entity);
}
