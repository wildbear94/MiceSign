package com.micesign.mapper;

import com.micesign.domain.RegistrationRequest;
import com.micesign.dto.registration.RegistrationListResponse;
import com.micesign.dto.registration.RegistrationStatusResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RegistrationMapper {

    RegistrationStatusResponse toStatusResponse(RegistrationRequest entity);

    RegistrationListResponse toListResponse(RegistrationRequest entity);
}
