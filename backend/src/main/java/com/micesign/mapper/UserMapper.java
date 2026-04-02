package com.micesign.mapper;

import com.micesign.domain.User;
import com.micesign.dto.user.UserDetailResponse;
import com.micesign.dto.user.UserListResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDateTime;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "department.name", target = "departmentName")
    @Mapping(source = "position.name", target = "positionName")
    @Mapping(source = "role", target = "role")
    @Mapping(source = "status", target = "status")
    UserListResponse toListResponse(User user);

    @Mapping(source = "department.name", target = "departmentName")
    @Mapping(source = "position.name", target = "positionName")
    @Mapping(source = "role", target = "role")
    @Mapping(source = "status", target = "status")
    @Mapping(target = "isLocked", source = "user", qualifiedByName = "mapIsLocked")
    UserDetailResponse toDetailResponse(User user);

    @Named("mapIsLocked")
    default boolean mapIsLocked(User user) {
        return user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
    }
}
