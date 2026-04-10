package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Department;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.department.*;
import com.micesign.mapper.DepartmentMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DepartmentMapper departmentMapper;
    private final AuditLogService auditLogService;

    public DepartmentService(DepartmentRepository departmentRepository,
                             UserRepository userRepository,
                             DepartmentMapper departmentMapper,
                             AuditLogService auditLogService) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.departmentMapper = departmentMapper;
        this.auditLogService = auditLogService;
    }

    public List<DepartmentTreeResponse> getDepartmentTree(boolean includeInactive) {
        List<Department> departments = includeInactive
            ? departmentRepository.findAllByOrderBySortOrderAsc()
            : departmentRepository.findByIsActiveTrueOrderBySortOrderAsc();

        Map<Long, Integer> memberCounts = buildMemberCountMap();

        return buildTree(departments, memberCounts);
    }

    public List<DepartmentMemberResponse> getDepartmentMembers(Long departmentId) {
        departmentRepository.findById(departmentId)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "부서를 찾을 수 없습니다."));

        List<User> members = userRepository.findByDepartmentIdAndStatus(departmentId, UserStatus.ACTIVE);
        return members.stream()
            .map(u -> new DepartmentMemberResponse(
                u.getId(),
                u.getEmployeeNo(),
                u.getName(),
                u.getPosition() != null ? u.getPosition().getName() : null,
                u.getStatus().name()
            ))
            .collect(Collectors.toList());
    }

    @Transactional
    public DepartmentTreeResponse createDepartment(CreateDepartmentRequest request, Long actingUserId) {
        if (departmentRepository.existsByName(request.name())) {
            throw new BusinessException("ORG_DUPLICATE_NAME", "이미 존재하는 부서명입니다.");
        }

        if (request.parentId() != null) {
            Department parent = departmentRepository.findById(request.parentId())
                .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "상위 부서를 찾을 수 없습니다."));
            if (!parent.isActive()) {
                throw new BusinessException("ORG_NOT_FOUND", "비활성 부서를 상위 부서로 지정할 수 없습니다.");
            }
            int parentDepth = calculateDepth(request.parentId());
            if (parentDepth >= 2) {
                throw new BusinessException("ORG_DEPTH_EXCEEDED", "부서 계층은 최대 3단계까지 허용됩니다.");
            }
        }

        Department department = new Department();
        department.setName(request.name());
        department.setParentId(request.parentId());
        department.setSortOrder(request.sortOrder());
        department.setActive(true);

        department = departmentRepository.save(department);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT", department.getId(),
                Map.of("action", "create", "name", department.getName()));

        return departmentMapper.toTreeResponse(department, 0, List.of());
    }

    @Transactional
    public DepartmentTreeResponse updateDepartment(Long id, UpdateDepartmentRequest request, Long actingUserId) {
        Department department = departmentRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "부서를 찾을 수 없습니다."));

        if (departmentRepository.existsByNameAndIdNot(request.name(), id)) {
            throw new BusinessException("ORG_DUPLICATE_NAME", "이미 존재하는 부서명입니다.");
        }

        if (request.parentId() != null) {
            if (request.parentId().equals(id)) {
                throw new BusinessException("ORG_CIRCULAR_REF", "자기 자신을 상위 부서로 지정할 수 없습니다.");
            }
            validateNoCircularReference(id, request.parentId());

            int parentDepth = calculateDepth(request.parentId());
            int subtreeDepth = calculateMaxSubtreeDepth(id);
            if (parentDepth + 1 + subtreeDepth > 2) {
                throw new BusinessException("ORG_DEPTH_EXCEEDED", "부서 계층은 최대 3단계까지 허용됩니다.");
            }
        }

        department.setName(request.name());
        department.setParentId(request.parentId());
        department.setSortOrder(request.sortOrder());

        department = departmentRepository.save(department);

        int memberCount = (int) userRepository.countByDepartmentIdAndStatus(id, UserStatus.ACTIVE);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT", department.getId(),
                Map.of("action", "update", "name", department.getName()));

        return departmentMapper.toTreeResponse(department, memberCount, List.of());
    }

    @Transactional
    public void deactivateDepartment(Long id, Long actingUserId) {
        Department department = departmentRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "부서를 찾을 수 없습니다."));

        if (departmentRepository.existsByParentIdAndIsActiveTrue(id)) {
            throw new BusinessException("ORG_HAS_ACTIVE_CHILDREN", "활성 하위 부서가 있어 비활성화할 수 없습니다.");
        }

        department.setActive(false);
        departmentRepository.save(department);

        auditLogService.log(actingUserId, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT", department.getId(),
                Map.of("action", "deactivate", "name", department.getName()));
    }

    public long getUserCountByDepartment(Long departmentId) {
        departmentRepository.findById(departmentId)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "부서를 찾을 수 없습니다."));
        return userRepository.countByDepartmentIdAndStatus(departmentId, UserStatus.ACTIVE);
    }

    // --- Private helpers ---

    private Map<Long, Integer> buildMemberCountMap() {
        List<Object[]> counts = departmentRepository.countActiveUsersByDepartment();
        Map<Long, Integer> map = new HashMap<>();
        for (Object[] row : counts) {
            Long deptId = (Long) row[0];
            Long count = (Long) row[1];
            map.put(deptId, count.intValue());
        }
        return map;
    }

    private List<DepartmentTreeResponse> buildTree(List<Department> departments, Map<Long, Integer> memberCounts) {
        Map<Long, List<Department>> childrenMap = departments.stream()
            .filter(d -> d.getParentId() != null)
            .collect(Collectors.groupingBy(Department::getParentId));

        return departments.stream()
            .filter(d -> d.getParentId() == null)
            .sorted(Comparator.comparingInt(Department::getSortOrder))
            .map(d -> buildTreeNode(d, childrenMap, memberCounts))
            .collect(Collectors.toList());
    }

    private DepartmentTreeResponse buildTreeNode(Department dept,
                                                  Map<Long, List<Department>> childrenMap,
                                                  Map<Long, Integer> memberCounts) {
        List<DepartmentTreeResponse> children = childrenMap.getOrDefault(dept.getId(), List.of())
            .stream()
            .sorted(Comparator.comparingInt(Department::getSortOrder))
            .map(child -> buildTreeNode(child, childrenMap, memberCounts))
            .collect(Collectors.toList());

        int memberCount = memberCounts.getOrDefault(dept.getId(), 0);
        return departmentMapper.toTreeResponse(dept, memberCount, children);
    }

    private int calculateDepth(Long departmentId) {
        int depth = 0;
        Long currentId = departmentId;
        Set<Long> visited = new HashSet<>();
        while (currentId != null) {
            if (!visited.add(currentId)) break;
            Department dept = departmentRepository.findById(currentId).orElse(null);
            if (dept == null || dept.getParentId() == null) break;
            currentId = dept.getParentId();
            depth++;
        }
        return depth;
    }

    private void validateNoCircularReference(Long departmentId, Long newParentId) {
        Long currentId = newParentId;
        Set<Long> visited = new HashSet<>();
        while (currentId != null) {
            if (currentId.equals(departmentId)) {
                throw new BusinessException("ORG_CIRCULAR_REF", "순환 참조가 발생합니다.");
            }
            if (!visited.add(currentId)) break;
            Department dept = departmentRepository.findById(currentId).orElse(null);
            if (dept == null) break;
            currentId = dept.getParentId();
        }
    }

    private int calculateMaxSubtreeDepth(Long departmentId) {
        List<Department> children = departmentRepository.findByParentIdAndIsActiveTrue(departmentId);
        if (children.isEmpty()) return 0;
        int maxChildDepth = 0;
        for (Department child : children) {
            int childDepth = calculateMaxSubtreeDepth(child.getId());
            maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
        return 1 + maxChildDepth;
    }
}
