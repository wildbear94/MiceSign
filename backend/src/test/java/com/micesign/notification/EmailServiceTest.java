package com.micesign.notification;

import com.micesign.domain.Document;
import com.micesign.domain.User;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.context.IContext;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private SpringTemplateEngine templateEngine;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSender, templateEngine);
        ReflectionTestUtils.setField(emailService, "senderName", "MiceSign 전자결재");
        ReflectionTestUtils.setField(emailService, "senderEmail", "approval@example.com");
        ReflectionTestUtils.setField(emailService, "baseUrl", "http://localhost:5173");
    }

    @Test
    @DisplayName("SUBMIT 이벤트의 이메일 제목이 올바르게 생성된다")
    void buildSubject_submit() {
        String subject = emailService.buildSubject(NotificationEventType.SUBMIT, "연차 신청서");
        assertThat(subject).isEqualTo("[MiceSign] 연차 신청서 - 결재 요청");
    }

    @Test
    @DisplayName("APPROVE 이벤트의 이메일 제목이 올바르게 생성된다")
    void buildSubject_approve() {
        String subject = emailService.buildSubject(NotificationEventType.APPROVE, "경비 청구서");
        assertThat(subject).isEqualTo("[MiceSign] 경비 청구서 - 승인 완료");
    }

    @Test
    @DisplayName("REJECT 이벤트의 이메일 제목이 올바르게 생성된다")
    void buildSubject_reject() {
        String subject = emailService.buildSubject(NotificationEventType.REJECT, "일반 기안서");
        assertThat(subject).isEqualTo("[MiceSign] 일반 기안서 - 반려");
    }

    @Test
    @DisplayName("WITHDRAW 이벤트의 이메일 제목이 올바르게 생성된다")
    void buildSubject_withdraw() {
        String subject = emailService.buildSubject(NotificationEventType.WITHDRAW, "일반 기안서");
        assertThat(subject).isEqualTo("[MiceSign] 일반 기안서 - 회수");
    }

    @Test
    @DisplayName("sendEmail 호출 시 JavaMailSender.send()가 호출된다")
    void sendEmail_callsMailSenderSend() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(templateEngine.process(eq("email/submit"), any(IContext.class))).thenReturn("<html>test</html>");

        Map<String, Object> variables = Map.of("documentId", 1L, "documentTitle", "테스트");
        emailService.sendEmail("test@example.com", "[MiceSign] 테스트", "submit", variables);

        verify(mailSender).send(mimeMessage);
    }

    @Test
    @DisplayName("buildTemplateVariables가 올바른 키를 포함한다")
    void buildTemplateVariables_containsCorrectKeys() {
        Document document = new Document();
        document.setId(1L);
        document.setTitle("연차 신청서");
        document.setDocNumber("LEV-2026-0001");
        User drafter = new User();
        drafter.setName("홍길동");
        document.setDrafter(drafter);

        Map<String, Object> vars = emailService.buildTemplateVariables(document, NotificationEventType.SUBMIT, null);

        assertThat(vars).containsKeys("documentTitle", "docNumber", "drafterName", "statusLabel", "documentId", "documentUrl");
        assertThat(vars.get("documentTitle")).isEqualTo("연차 신청서");
        assertThat(vars.get("statusLabel")).isEqualTo("결재 요청");
        assertThat(vars).doesNotContainKey("comment");
    }

    @Test
    @DisplayName("comment가 non-null이면 변수에 포함된다")
    void buildTemplateVariables_includesComment() {
        Document document = new Document();
        document.setId(1L);
        document.setTitle("테스트");
        User drafter = new User();
        drafter.setName("테스트");
        document.setDrafter(drafter);

        Map<String, Object> vars = emailService.buildTemplateVariables(document, NotificationEventType.REJECT, "반려 사유");

        assertThat(vars).containsEntry("comment", "반려 사유");
    }

    @Test
    @DisplayName("getTemplateName이 각 이벤트 타입에 올바른 템플릿명을 반환한다")
    void getTemplateName_returnsCorrectNames() {
        assertThat(emailService.getTemplateName(NotificationEventType.SUBMIT)).isEqualTo("submit");
        assertThat(emailService.getTemplateName(NotificationEventType.APPROVE)).isEqualTo("approve");
        assertThat(emailService.getTemplateName(NotificationEventType.REJECT)).isEqualTo("reject");
        assertThat(emailService.getTemplateName(NotificationEventType.WITHDRAW)).isEqualTo("withdraw");
    }
}
