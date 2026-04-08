package com.micesign.registration;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Department;
import com.micesign.domain.Position;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.User;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.registration.ApproveRegistrationRequest;
import com.micesign.dto.registration.RejectRegistrationRequest;
import com.micesign.dto.registration.RegistrationStatusResponse;
import com.micesign.dto.registration.RegistrationSubmitRequest;
import com.micesign.mapper.RegistrationMapper;
import com.micesign.repository.DepartmentRepository;
import com.micesign.repository.PositionRepository;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.AuditLogService;
import com.micesign.service.RegistrationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {

    @Mock private RegistrationRequestRepository registrationRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RegistrationMapper registrationMapper;
    @Mock private AuditLogService auditLogService;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private PositionRepository positionRepository;

    @InjectMocks private RegistrationService registrationService;

    private CustomUserDetails superAdmin() {
        return new CustomUserDetails(1L, "admin@micesign.com", "시스템관리자", "SUPER_ADMIN", 1L);
    }

    private RegistrationRequest pendingRequest() {
        RegistrationRequest reg = new RegistrationRequest();
        reg.setId(10L);
        reg.setName("홍길동");
        reg.setEmail("hong@example.com");
        reg.setPasswordHash("$2a$10$existingHash");
        reg.setStatus(RegistrationStatus.PENDING);
        return reg;
    }

    @Test
    void submitRegistration_success() {
        // given
        RegistrationSubmitRequest request = new RegistrationSubmitRequest("홍길동", "hong@example.com", "Password123!");
        when(userRepository.findByEmail("hong@example.com")).thenReturn(Optional.empty());
        when(registrationRequestRepository.findByEmailAndStatusForUpdate("hong@example.com", RegistrationStatus.PENDING)).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$hashedValue");

        RegistrationRequest saved = new RegistrationRequest();
        saved.setId(1L);
        saved.setName("홍길동");
        saved.setEmail("hong@example.com");
        saved.setPasswordHash("$2a$10$hashedValue");
        saved.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.save(any(RegistrationRequest.class))).thenReturn(saved);

        RegistrationStatusResponse expectedResponse = new RegistrationStatusResponse(
                1L, "홍길동", "hong@example.com", RegistrationStatus.PENDING, null, null, null, null);
        when(registrationMapper.toStatusResponse(any())).thenReturn(expectedResponse);

        // when
        RegistrationStatusResponse result = registrationService.submit(request);

        // then
        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(RegistrationStatus.PENDING);

        // Verify password was encoded with raw password
        verify(passwordEncoder).encode("Password123!");

        // Verify entity saved with hashed password
        ArgumentCaptor<RegistrationRequest> captor = ArgumentCaptor.forClass(RegistrationRequest.class);
        verify(registrationRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("$2a$10$hashedValue");

        // Verify audit log called with null userId (unauthenticated)
        verify(auditLogService).log(eq(null), eq("REGISTRATION_SUBMITTED"), eq("REGISTRATION_REQUEST"), eq(1L), any());
    }

    @Test
    void submitRegistration_duplicateEmailInUserTable() {
        // given
        RegistrationSubmitRequest request = new RegistrationSubmitRequest("홍길동", "existing@example.com", "Password123!");
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(new com.micesign.domain.User()));

        // when/then
        assertThatThrownBy(() -> registrationService.submit(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("REG_DUPLICATE_EMAIL"));
    }

    @Test
    void submitRegistration_duplicatePendingRequest() {
        // given
        RegistrationSubmitRequest request = new RegistrationSubmitRequest("홍길동", "pending@example.com", "Password123!");
        when(userRepository.findByEmail("pending@example.com")).thenReturn(Optional.empty());
        RegistrationRequest existingPending = new RegistrationRequest();
        existingPending.setEmail("pending@example.com");
        existingPending.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.findByEmailAndStatusForUpdate("pending@example.com", RegistrationStatus.PENDING)).thenReturn(Optional.of(existingPending));

        // when/then
        assertThatThrownBy(() -> registrationService.submit(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("REG_DUPLICATE_PENDING"));
    }

    @Test
    void resubmitAfterRejection_success() {
        // given - only REJECTED record exists, no PENDING
        RegistrationSubmitRequest request = new RegistrationSubmitRequest("홍길동", "rejected@example.com", "Password123!");
        when(userRepository.findByEmail("rejected@example.com")).thenReturn(Optional.empty());
        when(registrationRequestRepository.findByEmailAndStatusForUpdate("rejected@example.com", RegistrationStatus.PENDING)).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$hashedValue");

        RegistrationRequest saved = new RegistrationRequest();
        saved.setId(2L);
        saved.setEmail("rejected@example.com");
        saved.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.save(any())).thenReturn(saved);
        when(registrationMapper.toStatusResponse(any())).thenReturn(
                new RegistrationStatusResponse(2L, "홍길동", "rejected@example.com", RegistrationStatus.PENDING, null, null, null, null));

        // when
        RegistrationStatusResponse result = registrationService.submit(request);

        // then - submission succeeds because only PENDING is checked (REG-03)
        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(RegistrationStatus.PENDING);
    }

    @Test
    void getStatusByEmailAndToken_found() {
        // given
        RegistrationRequest entity = new RegistrationRequest();
        entity.setId(1L);
        entity.setEmail("test@example.com");
        entity.setTrackingToken("test-token-uuid");
        entity.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.findByEmailAndTrackingToken("test@example.com", "test-token-uuid"))
                .thenReturn(Optional.of(entity));

        RegistrationStatusResponse expectedResponse = new RegistrationStatusResponse(
                1L, "테스트", "test@example.com", RegistrationStatus.PENDING, null, "test-token-uuid", null, null);
        when(registrationMapper.toStatusResponse(entity)).thenReturn(expectedResponse);

        // when
        RegistrationStatusResponse result = registrationService.getStatusByEmailAndToken("test@example.com", "test-token-uuid");

        // then
        assertThat(result).isNotNull();
        assertThat(result.email()).isEqualTo("test@example.com");
    }

    @Test
    void getStatusByEmailAndToken_notFound() {
        // given
        when(registrationRequestRepository.findByEmailAndTrackingToken("unknown@example.com", "bad-token"))
                .thenReturn(Optional.empty());

        // when/then
        assertThatThrownBy(() -> registrationService.getStatusByEmailAndToken("unknown@example.com", "bad-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("REG_NOT_FOUND"));
    }

    @Test
    void expirePendingRequests_callsRepositoryWithCutoff() {
        // given
        when(registrationRequestRepository.updateStatusByStatusAndCreatedAtBefore(
                eq(RegistrationStatus.EXPIRED), eq(RegistrationStatus.PENDING), any(LocalDateTime.class)))
                .thenReturn(3);

        // when
        registrationService.expirePendingRequests();

        // then
        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(registrationRequestRepository).updateStatusByStatusAndCreatedAtBefore(
                eq(RegistrationStatus.EXPIRED), eq(RegistrationStatus.PENDING), cutoffCaptor.capture());

        // Verify cutoff is approximately 14 days ago
        LocalDateTime cutoff = cutoffCaptor.getValue();
        LocalDateTime expected = LocalDateTime.now().minusDays(14);
        assertThat(cutoff).isAfter(expected.minusMinutes(1));
        assertThat(cutoff).isBefore(expected.plusMinutes(1));
    }

    // ── Approve tests ──

    @Test
    void approveRegistration_createsUserWithDirectPasswordHash() {
        // given
        RegistrationRequest reg = pendingRequest();
        ApproveRegistrationRequest dto = new ApproveRegistrationRequest("EMP001", 1L, 1L);
        CustomUserDetails admin = superAdmin();

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));
        when(userRepository.existsByEmployeeNo("EMP001")).thenReturn(false);

        Department dept = new Department();
        dept.setActive(true);
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(dept));

        Position pos = new Position();
        pos.setActive(true);
        when(positionRepository.findById(1L)).thenReturn(Optional.of(pos));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(100L);
            return u;
        });

        // when
        registrationService.approve(10L, dto, admin);

        // then - CRITICAL: direct hash transfer, NO passwordEncoder.encode() in approve
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User createdUser = userCaptor.getValue();

        assertThat(createdUser.getPassword()).isEqualTo("$2a$10$existingHash"); // Direct transfer!
        assertThat(createdUser.getRole()).isEqualTo(UserRole.USER);             // D-06
        assertThat(createdUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(createdUser.isMustChangePassword()).isFalse();

        // Verify passwordEncoder.encode() was NOT called during approve
        verify(passwordEncoder, never()).encode(any());

        // Verify registration request updated
        assertThat(reg.getStatus()).isEqualTo(RegistrationStatus.APPROVED);
        assertThat(reg.getApprovedBy()).isEqualTo(1L);
        assertThat(reg.getProcessedAt()).isNotNull();

        // Verify audit
        verify(auditLogService).log(eq(1L), eq("REGISTRATION_APPROVED"), eq("REGISTRATION_REQUEST"), eq(10L), any());
    }

    @Test
    void approveRegistration_setsEmployeeNoDepartmentPosition() {
        // given
        RegistrationRequest reg = pendingRequest();
        ApproveRegistrationRequest dto = new ApproveRegistrationRequest("EMP002", 2L, 3L);

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));
        when(userRepository.existsByEmployeeNo("EMP002")).thenReturn(false);

        Department dept = new Department();
        dept.setActive(true);
        when(departmentRepository.findById(2L)).thenReturn(Optional.of(dept));

        Position pos = new Position();
        pos.setActive(true);
        when(positionRepository.findById(3L)).thenReturn(Optional.of(pos));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(101L);
            return u;
        });

        // when
        registrationService.approve(10L, dto, superAdmin());

        // then
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User createdUser = userCaptor.getValue();

        assertThat(createdUser.getEmployeeNo()).isEqualTo("EMP002");
        assertThat(createdUser.getDepartmentId()).isEqualTo(2L);
        assertThat(createdUser.getPositionId()).isEqualTo(3L);
    }

    @Test
    void approveRegistration_duplicateEmployeeNo() {
        // given
        RegistrationRequest reg = pendingRequest();
        ApproveRegistrationRequest dto = new ApproveRegistrationRequest("EXISTING", 1L, 1L);

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));
        when(userRepository.existsByEmployeeNo("EXISTING")).thenReturn(true);

        // when/then
        assertThatThrownBy(() -> registrationService.approve(10L, dto, superAdmin()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("ORG_DUPLICATE_EMPLOYEE_NO"));
    }

    @Test
    void approveRegistration_invalidDepartment() {
        // given
        RegistrationRequest reg = pendingRequest();
        ApproveRegistrationRequest dto = new ApproveRegistrationRequest("EMP003", 999L, 1L);

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));
        when(userRepository.existsByEmployeeNo("EMP003")).thenReturn(false);
        when(departmentRepository.findById(999L)).thenReturn(Optional.empty());

        // when/then
        assertThatThrownBy(() -> registrationService.approve(10L, dto, superAdmin()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("ORG_NOT_FOUND"));
    }

    @Test
    void approveRegistration_notPending() {
        // given
        RegistrationRequest reg = pendingRequest();
        reg.setStatus(RegistrationStatus.REJECTED); // not PENDING
        ApproveRegistrationRequest dto = new ApproveRegistrationRequest("EMP004", 1L, 1L);

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));

        // when/then
        assertThatThrownBy(() -> registrationService.approve(10L, dto, superAdmin()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("REG_INVALID_STATUS"));
    }

    // ── Reject tests ──

    @Test
    void rejectRegistration_setsReasonAndStatus() {
        // given
        RegistrationRequest reg = pendingRequest();
        RejectRegistrationRequest dto = new RejectRegistrationRequest("소속 확인 불가");

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));

        // when
        registrationService.reject(10L, dto, superAdmin());

        // then
        assertThat(reg.getStatus()).isEqualTo(RegistrationStatus.REJECTED);
        assertThat(reg.getRejectionReason()).isEqualTo("소속 확인 불가");
        assertThat(reg.getApprovedBy()).isEqualTo(1L);
        assertThat(reg.getProcessedAt()).isNotNull();

        verify(auditLogService).log(eq(1L), eq("REGISTRATION_REJECTED"), eq("REGISTRATION_REQUEST"), eq(10L), any());
    }

    @Test
    void rejectRegistration_notPending() {
        // given
        RegistrationRequest reg = pendingRequest();
        reg.setStatus(RegistrationStatus.APPROVED); // not PENDING
        RejectRegistrationRequest dto = new RejectRegistrationRequest("테스트 거부");

        when(registrationRequestRepository.findById(10L)).thenReturn(Optional.of(reg));

        // when/then
        assertThatThrownBy(() -> registrationService.reject(10L, dto, superAdmin()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("REG_INVALID_STATUS"));
    }
}
