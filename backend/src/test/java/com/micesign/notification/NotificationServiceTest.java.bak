package com.micesign.notification;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.*;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.repository.UserRepository;
import com.micesign.service.EmailService;
import com.micesign.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationLogRepository notificationLogRepository;

    @Mock
    private ApprovalLineRepository approvalLineRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DocumentRepository documentRepository;

    private NotificationService notificationService;

    private User drafter;
    private User approver1;
    private User approver2;
    private Document document;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                emailService, notificationLogRepository, approvalLineRepository, userRepository, documentRepository);

        drafter = new User();
        drafter.setId(1L);
        drafter.setName("기안자");
        drafter.setEmail("drafter@example.com");

        approver1 = new User();
        approver1.setId(2L);
        approver1.setName("결재자1");
        approver1.setEmail("approver1@example.com");

        approver2 = new User();
        approver2.setId(3L);
        approver2.setName("결재자2");
        approver2.setEmail("approver2@example.com");

        document = new Document();
        document.setId(100L);
        document.setTitle("테스트 문서");
        document.setDocNumber("GEN-2026-0001");
        document.setDrafter(drafter);
        document.setStatus(DocumentStatus.SUBMITTED);
        document.setCurrentStep(1);
    }

    @Test
    @DisplayName("SUBMIT 이벤트: APPROVE/AGREE 유형의 결재선 멤버에게 알림 전송")
    void resolveRecipients_submit_returnsApproveAndAgreeMembers() {
        ApprovalLine line1 = createApprovalLine(approver1, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);
        ApprovalLine line2 = createApprovalLine(approver2, ApprovalLineType.AGREE, 2, ApprovalLineStatus.PENDING);

        User referenceUser = new User();
        referenceUser.setId(4L);
        referenceUser.setName("참조자");
        referenceUser.setEmail("reference@example.com");
        ApprovalLine referenceLine = createApprovalLine(referenceUser, ApprovalLineType.REFERENCE, 0, ApprovalLineStatus.PENDING);

        when(approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(100L))
                .thenReturn(List.of(referenceLine, line1, line2));

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.SUBMIT, drafter.getId(), null);

        List<User> recipients = notificationService.resolveRecipients(event);

        assertThat(recipients).hasSize(2);
        assertThat(recipients).extracting(User::getId).containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("APPROVE 중간 결재: 다음 대기 결재자에게만 알림")
    void resolveRecipients_approveIntermediate_returnsNextPendingApprover() {
        // Document is still SUBMITTED (intermediate approval)
        document.setStatus(DocumentStatus.SUBMITTED);
        document.setCurrentStep(2);

        ApprovalLine line1 = createApprovalLine(approver1, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.APPROVED);
        ApprovalLine line2 = createApprovalLine(approver2, ApprovalLineType.APPROVE, 2, ApprovalLineStatus.PENDING);

        when(approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(100L))
                .thenReturn(List.of(line1, line2));

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.APPROVE, approver1.getId(), "승인합니다");

        List<User> recipients = notificationService.resolveRecipients(event);

        assertThat(recipients).hasSize(1);
        assertThat(recipients.get(0).getId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("APPROVE 최종 결재: 기안자에게 알림")
    void resolveRecipients_approveFinal_returnsDrafter() {
        document.setStatus(DocumentStatus.APPROVED);

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.APPROVE, approver1.getId(), "최종 승인");

        List<User> recipients = notificationService.resolveRecipients(event);

        assertThat(recipients).hasSize(1);
        assertThat(recipients.get(0).getId()).isEqualTo(drafter.getId());
    }

    @Test
    @DisplayName("REJECT: 기안자에게만 알림")
    void resolveRecipients_reject_returnsDrafter() {
        document.setStatus(DocumentStatus.REJECTED);

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.REJECT, approver1.getId(), "반려 사유");

        List<User> recipients = notificationService.resolveRecipients(event);

        assertThat(recipients).hasSize(1);
        assertThat(recipients.get(0).getId()).isEqualTo(drafter.getId());
    }

    @Test
    @DisplayName("WITHDRAW: 기안자에게만 알림 (NTF-03)")
    void resolveRecipients_withdraw_returnsDrafterOnly() {
        document.setStatus(DocumentStatus.WITHDRAWN);

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.WITHDRAW, drafter.getId(), null);

        List<User> recipients = notificationService.resolveRecipients(event);

        assertThat(recipients).hasSize(1);
        assertThat(recipients.get(0).getId()).isEqualTo(drafter.getId());
    }

    @Test
    @DisplayName("재시도 성공: 첫 시도 실패 후 두번째에 성공하면 retryCount=1, status=SUCCESS")
    void sendWithRetry_succeedsOnSecondAttempt() throws Exception {
        when(emailService.buildSubject(any(), any())).thenReturn("[MiceSign] 테스트 - 결재 요청");
        when(emailService.getTemplateName(any())).thenReturn("submit");
        when(emailService.buildTemplateVariables(any(), any(), any())).thenReturn(Map.of("documentId", 100L));

        // Capture status at each save call (since the same object is mutated)
        java.util.List<NotificationStatus> statusHistory = new java.util.ArrayList<>();
        java.util.List<Integer> retryHistory = new java.util.ArrayList<>();
        when(notificationLogRepository.save(any(NotificationLog.class)))
                .thenAnswer(invocation -> {
                    NotificationLog log = invocation.getArgument(0);
                    statusHistory.add(log.getStatus());
                    retryHistory.add(log.getRetryCount());
                    return log;
                });

        // First call throws, second succeeds
        doThrow(new RuntimeException("SMTP error"))
                .doNothing()
                .when(emailService).sendEmail(anyString(), anyString(), anyString(), anyMap());

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.SUBMIT, drafter.getId(), null);

        notificationService.sendWithRetry(approver1, event);

        // Verify status progression: PENDING -> RETRY -> SUCCESS
        assertThat(statusHistory).hasSize(3);
        assertThat(statusHistory.get(0)).isEqualTo(NotificationStatus.PENDING);
        assertThat(statusHistory.get(1)).isEqualTo(NotificationStatus.RETRY);
        assertThat(statusHistory.get(2)).isEqualTo(NotificationStatus.SUCCESS);
        assertThat(retryHistory.get(2)).isEqualTo(1);
    }

    @Test
    @DisplayName("재시도 소진: 모든 시도 실패 시 status=FAILED, errorMessage 설정")
    void sendWithRetry_exhaustsRetries() throws Exception {
        when(emailService.buildSubject(any(), any())).thenReturn("[MiceSign] 테스트 - 결재 요청");
        when(emailService.getTemplateName(any())).thenReturn("submit");
        when(emailService.buildTemplateVariables(any(), any(), any())).thenReturn(Map.of("documentId", 100L));

        java.util.List<NotificationStatus> statusHistory = new java.util.ArrayList<>();
        java.util.List<Integer> retryHistory = new java.util.ArrayList<>();
        java.util.List<String> errorHistory = new java.util.ArrayList<>();
        when(notificationLogRepository.save(any(NotificationLog.class)))
                .thenAnswer(invocation -> {
                    NotificationLog log = invocation.getArgument(0);
                    statusHistory.add(log.getStatus());
                    retryHistory.add(log.getRetryCount());
                    errorHistory.add(log.getErrorMessage());
                    return log;
                });

        doThrow(new RuntimeException("SMTP connection refused"))
                .when(emailService).sendEmail(anyString(), anyString(), anyString(), anyMap());

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.SUBMIT, drafter.getId(), null);

        notificationService.sendWithRetry(approver1, event);

        // Verify status progression: PENDING -> RETRY -> RETRY -> FAILED
        assertThat(statusHistory).hasSize(4);
        assertThat(statusHistory.get(0)).isEqualTo(NotificationStatus.PENDING);
        assertThat(statusHistory.get(1)).isEqualTo(NotificationStatus.RETRY);
        assertThat(statusHistory.get(2)).isEqualTo(NotificationStatus.RETRY);
        assertThat(statusHistory.get(3)).isEqualTo(NotificationStatus.FAILED);
        assertThat(retryHistory.get(3)).isEqualTo(2);
        assertThat(errorHistory.get(3)).contains("SMTP connection refused");
    }

    @Test
    @DisplayName("notification_log가 PENDING 상태로 먼저 저장된다")
    void sendWithRetry_savesInitialPendingLog() throws Exception {
        when(emailService.buildSubject(any(), any())).thenReturn("[MiceSign] 테스트");
        when(emailService.getTemplateName(any())).thenReturn("submit");
        when(emailService.buildTemplateVariables(any(), any(), any())).thenReturn(Map.of("documentId", 100L));

        java.util.List<NotificationStatus> statusHistory = new java.util.ArrayList<>();
        java.util.List<String> emailHistory = new java.util.ArrayList<>();
        java.util.List<String> eventTypeHistory = new java.util.ArrayList<>();
        java.util.List<Long> docIdHistory = new java.util.ArrayList<>();
        when(notificationLogRepository.save(any(NotificationLog.class)))
                .thenAnswer(invocation -> {
                    NotificationLog log = invocation.getArgument(0);
                    statusHistory.add(log.getStatus());
                    emailHistory.add(log.getRecipientEmail());
                    eventTypeHistory.add(log.getEventType());
                    docIdHistory.add(log.getDocumentId());
                    return log;
                });
        doNothing().when(emailService).sendEmail(anyString(), anyString(), anyString(), anyMap());

        ApprovalNotificationEvent event = new ApprovalNotificationEvent(
                document, NotificationEventType.SUBMIT, drafter.getId(), null);

        notificationService.sendWithRetry(approver1, event);

        // First save should be PENDING
        assertThat(statusHistory.get(0)).isEqualTo(NotificationStatus.PENDING);
        assertThat(emailHistory.get(0)).isEqualTo("approver1@example.com");
        assertThat(eventTypeHistory.get(0)).isEqualTo("SUBMIT");
        assertThat(docIdHistory.get(0)).isEqualTo(100L);
    }

    // --- Helper ---

    private ApprovalLine createApprovalLine(User approver, ApprovalLineType type, int stepOrder, ApprovalLineStatus status) {
        ApprovalLine line = new ApprovalLine();
        line.setApprover(approver);
        line.setDocument(document);
        line.setLineType(type);
        line.setStepOrder(stepOrder);
        line.setStatus(status);
        return line;
    }
}
