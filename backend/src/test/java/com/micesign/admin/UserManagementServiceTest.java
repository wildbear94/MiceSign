package com.micesign.admin;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Department;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.user.CreateUserRequest;
import com.micesign.dto.user.UpdateUserRequest;
import com.micesign.mapper.UserMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.PositionRepository;
import com.micesign.repository.UserRepository;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.AuditLogService;
import com.micesign.service.UserManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {

    @Mock UserRepository userRepository;
    @Mock DepartmentRepository departmentRepository;
    @Mock PositionRepository positionRepository;
    @Mock UserMapper userMapper;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditLogService auditLogService;

    UserManagementService service;

    @BeforeEach
    void setUp() {
        service = new UserManagementService(userRepository, departmentRepository, positionRepository, userMapper, passwordEncoder, auditLogService);
    }

    @Test
    void lastSuperAdmin_cannotBeDemoted() {
        User superAdmin = makeUser(1L, UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));
        when(userRepository.countByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE)).thenReturn(1L);

        CustomUserDetails currentUser = new CustomUserDetails(2L, "other@test.com", "Other", "SUPER_ADMIN", 1L);

        UpdateUserRequest request = new UpdateUserRequest("Admin", "admin@micesign.com", 1L, 1L, UserRole.USER, UserStatus.ACTIVE, null);

        assertThatThrownBy(() -> service.updateUser(1L, request, currentUser))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "ORG_LAST_SUPER_ADMIN");
    }

    @Test
    void lastSuperAdmin_cannotBeDeactivated() {
        User superAdmin = makeUser(1L, UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));
        when(userRepository.countByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE)).thenReturn(1L);

        CustomUserDetails currentUser = new CustomUserDetails(2L, "other@test.com", "Other", "SUPER_ADMIN", 1L);

        assertThatThrownBy(() -> service.deactivateUser(1L, currentUser))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("code", "ORG_LAST_SUPER_ADMIN");
    }

    @Test
    void createUser_setsInitialPasswordAndForceChange() {
        when(userRepository.existsByEmployeeNo(any())).thenReturn(false);
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123!")).thenReturn("$2a$10$encoded");

        Department dept = new Department();
        dept.setId(1L);
        dept.setActive(true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(dept));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(userMapper.toDetailResponse(any())).thenReturn(null);

        CustomUserDetails currentUser = new CustomUserDetails(1L, "admin@test.com", "Admin", "SUPER_ADMIN", 1L);
        CreateUserRequest request = new CreateUserRequest("EMP001", "Test", "test@test.com", 1L, null, UserRole.USER, null, "password123!");

        service.createUser(request, currentUser);

        verify(userRepository).save(argThat(user ->
            user.isMustChangePassword() &&
            user.getPassword().equals("$2a$10$encoded")
        ));
    }

    private User makeUser(Long id, UserRole role, UserStatus status) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setStatus(status);
        user.setName("Test");
        user.setEmail("test@test.com");
        user.setEmployeeNo("EMP001");
        user.setDepartmentId(1L);
        return user;
    }
}
