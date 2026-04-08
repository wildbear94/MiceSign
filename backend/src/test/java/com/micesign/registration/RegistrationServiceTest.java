package com.micesign.registration;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.dto.registration.RegistrationStatusResponse;
import com.micesign.dto.registration.RegistrationSubmitRequest;
import com.micesign.mapper.RegistrationMapper;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
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

    @InjectMocks private RegistrationService registrationService;

    @Test
    void submitRegistration_success() {
        // given
        RegistrationSubmitRequest request = new RegistrationSubmitRequest("홍길동", "hong@example.com", "Password123!");
        when(userRepository.findByEmail("hong@example.com")).thenReturn(Optional.empty());
        when(registrationRequestRepository.existsByEmailAndStatus("hong@example.com", RegistrationStatus.PENDING)).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$hashedValue");

        RegistrationRequest saved = new RegistrationRequest();
        saved.setId(1L);
        saved.setName("홍길동");
        saved.setEmail("hong@example.com");
        saved.setPasswordHash("$2a$10$hashedValue");
        saved.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.save(any(RegistrationRequest.class))).thenReturn(saved);

        RegistrationStatusResponse expectedResponse = new RegistrationStatusResponse(
                1L, "홍길동", "hong@example.com", RegistrationStatus.PENDING, null, null, null);
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
        when(registrationRequestRepository.existsByEmailAndStatus("pending@example.com", RegistrationStatus.PENDING)).thenReturn(true);

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
        when(registrationRequestRepository.existsByEmailAndStatus("rejected@example.com", RegistrationStatus.PENDING)).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$hashedValue");

        RegistrationRequest saved = new RegistrationRequest();
        saved.setId(2L);
        saved.setEmail("rejected@example.com");
        saved.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.save(any())).thenReturn(saved);
        when(registrationMapper.toStatusResponse(any())).thenReturn(
                new RegistrationStatusResponse(2L, "홍길동", "rejected@example.com", RegistrationStatus.PENDING, null, null, null));

        // when
        RegistrationStatusResponse result = registrationService.submit(request);

        // then - submission succeeds because only PENDING is checked (REG-03)
        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(RegistrationStatus.PENDING);
    }

    @Test
    void getStatusByEmail_found() {
        // given
        RegistrationRequest entity = new RegistrationRequest();
        entity.setId(1L);
        entity.setEmail("test@example.com");
        entity.setStatus(RegistrationStatus.PENDING);
        when(registrationRequestRepository.findByEmailOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(List.of(entity));

        RegistrationStatusResponse expectedResponse = new RegistrationStatusResponse(
                1L, "테스트", "test@example.com", RegistrationStatus.PENDING, null, null, null);
        when(registrationMapper.toStatusResponse(entity)).thenReturn(expectedResponse);

        // when
        RegistrationStatusResponse result = registrationService.getStatusByEmail("test@example.com");

        // then
        assertThat(result).isNotNull();
        assertThat(result.email()).isEqualTo("test@example.com");
    }

    @Test
    void getStatusByEmail_notFound() {
        // given
        when(registrationRequestRepository.findByEmailOrderByCreatedAtDesc("unknown@example.com"))
                .thenReturn(Collections.emptyList());

        // when
        RegistrationStatusResponse result = registrationService.getStatusByEmail("unknown@example.com");

        // then
        assertThat(result).isNull();
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
}
