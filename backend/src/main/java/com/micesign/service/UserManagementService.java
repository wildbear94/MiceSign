package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.user.*;
import com.micesign.mapper.UserMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.PositionRepository;
import com.micesign.repository.UserRepository;
import com.micesign.security.CustomUserDetails;
import com.micesign.specification.UserSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserManagementService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserManagementService(UserRepository userRepository,
                                  DepartmentRepository departmentRepository,
                                  PositionRepository positionRepository,
                                  UserMapper userMapper,
                                  PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public Page<UserListResponse> getUsers(String keyword, Long departmentId,
                                            UserRole role, UserStatus status,
                                            Pageable pageable) {
        Specification<User> spec = UserSpecification.withFilters(keyword, departmentId, role, status);
        return userRepository.findAll(spec, pageable).map(userMapper::toListResponse);
    }

    public UserDetailResponse getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "사용자를 찾을 수 없습니다."));
        return userMapper.toDetailResponse(user);
    }

    @Transactional
    public UserDetailResponse createUser(CreateUserRequest request, CustomUserDetails currentUser) {
        // RBAC: ADMIN can only create USER role
        if ("ADMIN".equals(currentUser.getRole()) && request.role() != UserRole.USER) {
            throw new BusinessException("AUTH_FORBIDDEN", "관리자는 일반 사용자만 생성할 수 있습니다.");
        }

        // Validate uniqueness
        if (userRepository.existsByEmployeeNo(request.employeeNo())) {
            throw new BusinessException("ORG_DUPLICATE_EMPLOYEE_NO", "이미 존재하는 사번입니다.");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new BusinessException("ORG_DUPLICATE_EMAIL", "이미 존재하는 이메일입니다.");
        }

        // Validate department exists and is active
        departmentRepository.findById(request.departmentId())
            .filter(d -> d.isActive())
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 부서를 찾을 수 없습니다."));

        // Validate position if provided
        if (request.positionId() != null) {
            positionRepository.findById(request.positionId())
                .filter(p -> p.isActive())
                .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 직급을 찾을 수 없습니다."));
        }

        User user = new User();
        user.setEmployeeNo(request.employeeNo());
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setDepartmentId(request.departmentId());
        user.setPositionId(request.positionId());
        user.setRole(request.role());
        user.setStatus(UserStatus.ACTIVE);
        user.setPhone(request.phone());
        user.setMustChangePassword(true);

        user = userRepository.save(user);
        return userMapper.toDetailResponse(user);
    }

    @Transactional
    public UserDetailResponse updateUser(Long id, UpdateUserRequest request, CustomUserDetails currentUser) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // RBAC: ADMIN cannot manage ADMIN/SUPER_ADMIN users
        if ("ADMIN".equals(currentUser.getRole())) {
            if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
                throw new BusinessException("AUTH_FORBIDDEN", "관리자/최고관리자 사용자를 수정할 수 없습니다.");
            }
            if (request.role() == UserRole.ADMIN || request.role() == UserRole.SUPER_ADMIN) {
                throw new BusinessException("AUTH_FORBIDDEN", "관리자 이상 역할로 변경할 수 없습니다.");
            }
        }

        // Self-deactivation check
        if (currentUser.getUserId().equals(id) && request.status() != UserStatus.ACTIVE) {
            throw new BusinessException("ORG_SELF_DEACTIVATION", "자기 자신을 비활성화할 수 없습니다.");
        }

        // Last SUPER_ADMIN protection
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            boolean demoting = request.role() != UserRole.SUPER_ADMIN;
            boolean deactivating = request.status() != UserStatus.ACTIVE;
            if (demoting || deactivating) {
                long superAdminCount = userRepository.countByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
                if (superAdminCount <= 1) {
                    throw new BusinessException("ORG_LAST_SUPER_ADMIN", "마지막 최고관리자는 변경할 수 없습니다.");
                }
            }
        }

        // Validate department
        departmentRepository.findById(request.departmentId())
            .filter(d -> d.isActive())
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 부서를 찾을 수 없습니다."));

        // Validate position if provided
        if (request.positionId() != null) {
            positionRepository.findById(request.positionId())
                .filter(p -> p.isActive())
                .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 직급을 찾을 수 없습니다."));
        }

        user.setName(request.name());
        user.setEmail(request.email());
        user.setDepartmentId(request.departmentId());
        user.setPositionId(request.positionId());
        user.setRole(request.role());
        user.setStatus(request.status());
        user.setPhone(request.phone());

        user = userRepository.save(user);
        return userMapper.toDetailResponse(user);
    }

    @Transactional
    public void deactivateUser(Long id, CustomUserDetails currentUser) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // Self-deactivation check
        if (currentUser.getUserId().equals(id)) {
            throw new BusinessException("ORG_SELF_DEACTIVATION", "자기 자신을 비활성화할 수 없습니다.");
        }

        // RBAC: ADMIN cannot deactivate ADMIN/SUPER_ADMIN
        if ("ADMIN".equals(currentUser.getRole())) {
            if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
                throw new BusinessException("AUTH_FORBIDDEN", "관리자/최고관리자를 비활성화할 수 없습니다.");
            }
        }

        // Last SUPER_ADMIN protection
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            long superAdminCount = userRepository.countByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
            if (superAdminCount <= 1) {
                throw new BusinessException("ORG_LAST_SUPER_ADMIN", "마지막 최고관리자는 비활성화할 수 없습니다.");
            }
        }

        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
    }
}
