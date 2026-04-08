package com.micesign.registration;

import com.micesign.domain.NotificationLog;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.User;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.domain.enums.RegistrationStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.event.RegistrationEventType;
import com.micesign.event.RegistrationNotificationEvent;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
import com.micesign.service.RegistrationEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegistrationEmailServiceTest {

    @Mock
    private SpringTemplateEngine templateEngine;

    @Mock
    private RegistrationRequestRepository registrationRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationLogRepository notificationLogRepository;

    private RegistrationEmailService registrationEmailService;

    @BeforeEach
    void setUp() {
        // mailSender=null -> log mode (no SMTP)
        registrationEmailService = new RegistrationEmailService(
                null, // mailSender
                templateEngine,
                registrationRequestRepository,
                userRepository,
                notificationLogRepository
        );

        // Stub template engine to return test HTML
        lenient().when(templateEngine.process(anyString(), any()))
                .thenReturn("<html>test</html>");
    }

    private RegistrationRequest createSubmitRequest() {
        RegistrationRequest reg = new RegistrationRequest();
        reg.setId(1L);
        reg.setName("홍길동");
        reg.setEmail("hong@test.com");
        reg.setStatus(RegistrationStatus.PENDING);
        return reg;
    }

    private User createSuperAdmin(Long id, String email) {
        User admin = new User();
        admin.setId(id);
        admin.setName("관리자" + id);
        admin.setEmail(email);
        admin.setRole(UserRole.SUPER_ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        return admin;
    }

    // Test 1: REGISTRATION_SUBMIT -> applicant confirmation email log
    @Test
    void test_handleSubmitEvent_sendsConfirmationToApplicant() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_SUBMIT));

        // then
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository, times(1)).save(captor.capture());

        NotificationLog saved = captor.getValue();
        assertThat(saved.getRecipientEmail()).isEqualTo("hong@test.com");
        assertThat(saved.getEventType()).isEqualTo("REGISTRATION_SUBMIT");
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.SUCCESS);
        assertThat(saved.getRegistrationRequestId()).isEqualTo(1L);
    }

    // Test 2: REGISTRATION_SUBMIT -> notify SUPER_ADMINs
    @Test
    void test_handleSubmitEvent_notifiesSuperAdmins() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        User admin1 = createSuperAdmin(10L, "admin1@test.com");
        User admin2 = createSuperAdmin(11L, "admin2@test.com");

        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of(admin1, admin2));

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_SUBMIT));

        // then: 1 applicant + 2 super admins = 3 saves
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository, times(3)).save(captor.capture());

        List<NotificationLog> logs = captor.getAllValues();
        // First: applicant confirmation
        assertThat(logs.get(0).getRecipientEmail()).isEqualTo("hong@test.com");
        // Second & Third: admin notifications
        assertThat(logs.get(1).getRecipientEmail()).isEqualTo("admin1@test.com");
        assertThat(logs.get(2).getRecipientEmail()).isEqualTo("admin2@test.com");
    }

    // Test 3: REGISTRATION_APPROVE -> approve email to applicant
    @Test
    void test_handleApproveEvent_sendsApproveEmail() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        reg.setStatus(RegistrationStatus.APPROVED);
        reg.setProcessedAt(LocalDateTime.now());

        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_APPROVE));

        // then
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository, times(1)).save(captor.capture());

        NotificationLog saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo("REGISTRATION_APPROVE");
        assertThat(saved.getSubject()).contains("승인");
        assertThat(saved.getRecipientEmail()).isEqualTo("hong@test.com");
    }

    // Test 4: REGISTRATION_REJECT -> reject email with reason
    @Test
    void test_handleRejectEvent_sendsRejectEmail() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        reg.setStatus(RegistrationStatus.REJECTED);
        reg.setRejectionReason("서류 미비");
        reg.setProcessedAt(LocalDateTime.now());

        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_REJECT));

        // then
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository, times(1)).save(captor.capture());

        NotificationLog saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo("REGISTRATION_REJECT");
        assertThat(saved.getSubject()).contains("결과");
        assertThat(saved.getRecipientEmail()).isEqualTo("hong@test.com");
    }

    // Test 5: Non-existent registrationRequestId -> no exception, no save
    @Test
    void test_handleEvent_registrationNotFound_noException() {
        // given
        when(registrationRequestRepository.findById(999L)).thenReturn(Optional.empty());

        // when/then - no exception
        assertThatCode(() ->
                registrationEmailService.handleRegistrationEvent(
                        new RegistrationNotificationEvent(999L, RegistrationEventType.REGISTRATION_SUBMIT))
        ).doesNotThrowAnyException();

        // No notification log saved
        verify(notificationLogRepository, never()).save(any());
    }

    // Test 6: NotificationLog has correct registrationRequestId
    @Test
    void test_notificationLog_hasCorrectRegistrationRequestId() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        reg.setId(42L);
        when(registrationRequestRepository.findById(42L)).thenReturn(Optional.of(reg));
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(42L, RegistrationEventType.REGISTRATION_SUBMIT));

        // then
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(captor.capture());

        assertThat(captor.getValue().getRegistrationRequestId()).isEqualTo(42L);
    }

    // Test 7: NotificationLog has correct eventType for each event
    @Test
    void test_notificationLog_hasCorrectEventType() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        reg.setStatus(RegistrationStatus.APPROVED);
        reg.setProcessedAt(LocalDateTime.now());
        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));

        // when - test APPROVE event type
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_APPROVE));

        // then
        ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(captor.capture());

        assertThat(captor.getValue().getEventType()).isEqualTo("REGISTRATION_APPROVE");
    }

    // Test 8: No SUPER_ADMINs -> only applicant notification, no error
    @Test
    void test_noSuperAdmins_noError() {
        // given
        RegistrationRequest reg = createSubmitRequest();
        when(registrationRequestRepository.findById(1L)).thenReturn(Optional.of(reg));
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(Collections.emptyList());

        // when
        registrationEmailService.handleRegistrationEvent(
                new RegistrationNotificationEvent(1L, RegistrationEventType.REGISTRATION_SUBMIT));

        // then - only 1 save (applicant confirmation), no admin notifications
        verify(notificationLogRepository, times(1)).save(any());
    }
}
