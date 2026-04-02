package com.micesign.mapper;

import com.micesign.domain.Department;
import com.micesign.dto.department.DepartmentTreeResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    @Mapping(target = "memberCount", source = "memberCount")
    @Mapping(target = "children", source = "children")
    @Mapping(target = "isActive", source = "department.active")
    DepartmentTreeResponse toTreeResponse(Department department, int memberCount, List<DepartmentTreeResponse> children);
}
