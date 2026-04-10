package com.micesign.admin;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Department;
import com.micesign.dto.department.CreateDepartmentRequest;
import com.micesign.dto.department.DepartmentTreeResponse;
import com.micesign.dto.department.UpdateDepartmentRequest;
import com.micesign.mapper.DepartmentMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.UserRepository;
import com.micesign.service.AuditLogService;
import com.micesign.service.DepartmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock DepartmentRepository departmentRepository;
    @Mock UserRepository userRepository;
    @Mock DepartmentMapper departmentMapper;
    @Mock AuditLogService auditLogService;

    DepartmentService departmentService;

    @BeforeEach
    void setUp() {
        departmentService = new DepartmentService(departmentRepository, userRepository, departmentMapper, auditLogService);
    }

    @Test
    void buildTree_convertsListToNestedStructure() {
        Department root = makeDept(1L, "Root", null, 0);
        Department child = makeDept(2L, "Child", 1L, 1);

        when(departmentRepository.findByIsActiveTrueOrderBySortOrderAsc())
            .thenReturn(List.of(root, child));
        when(departmentRepository.countActiveUsersByDepartment())
            .thenReturn(List.of(new Object[]{1L, 0L}, new Object[]{2L, 0L}));
        when(departmentMapper.toTreeResponse(any(), anyInt(), anyList()))
            .thenAnswer(inv -> {
                Department d = inv.getArgument(0);
                int count = inv.getArgument(1);
                List<DepartmentTreeResponse> children = inv.getArgument(2);
                return new DepartmentTreeResponse(d.getId(), d.getName(), d.getParentId(),
                    d.getSortOrder(), d.isActive(), count, children);
            });

        List<DepartmentTreeResponse> tree = departmentService.getDepartmentTree(false);

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).name()).isEqualTo("Root");
        assertThat(tree.get(0).children()).hasSize(1);
        assertThat(tree.get(0).children().get(0).name()).isEqualTo("Child");
    }

    @Test
    void validateDepth_rejectsDepthBeyondThree() {
        // Root(1) -> Level1(2) -> Level2(3), now try to add child under Level2
        Department level2 = makeDept(3L, "Level2", 2L, 0);
        Department level1 = makeDept(2L, "Level1", 1L, 0);
        Department root = makeDept(1L, "Root", null, 0);

        when(departmentRepository.existsByName("NewDept")).thenReturn(false);
        when(departmentRepository.findById(3L)).thenReturn(Optional.of(level2));
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(level1));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(root));

        CreateDepartmentRequest request = new CreateDepartmentRequest("NewDept", 3L, 0);
        assertThatThrownBy(() -> departmentService.createDepartment(request, 1L))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "ORG_DEPTH_EXCEEDED");
    }

    @Test
    void validateNoCircularRef_detectsCycle() {
        // dept 1 is parent of dept 2. Try to set dept 1's parent to dept 2.
        Department dept1 = makeDept(1L, "Dept1", null, 0);
        Department dept2 = makeDept(2L, "Dept2", 1L, 0);

        when(departmentRepository.findById(1L)).thenReturn(Optional.of(dept1));
        when(departmentRepository.existsByNameAndIdNot("Dept1", 1L)).thenReturn(false);
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(dept2));

        UpdateDepartmentRequest request = new UpdateDepartmentRequest("Dept1", 2L, 0);
        assertThatThrownBy(() -> departmentService.updateDepartment(1L, request, 1L))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "ORG_CIRCULAR_REF");
    }

    @Test
    void deactivate_blockedByActiveChildren() {
        Department dept = makeDept(1L, "Root", null, 0);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(dept));
        when(departmentRepository.existsByParentIdAndIsActiveTrue(1L)).thenReturn(true);

        assertThatThrownBy(() -> departmentService.deactivateDepartment(1L, 1L))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "ORG_HAS_ACTIVE_CHILDREN");
    }

    private Department makeDept(Long id, String name, Long parentId, int sortOrder) {
        Department d = new Department();
        d.setId(id);
        d.setName(name);
        d.setParentId(parentId);
        d.setSortOrder(sortOrder);
        d.setActive(true);
        return d;
    }
}
