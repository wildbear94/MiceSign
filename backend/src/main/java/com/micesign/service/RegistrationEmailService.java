package com.micesign.service;

import com.micesign.domain.NotificationLog;
import com.micesign.domain.RegistrationRequest;
import com.micesign.domain.User;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.event.RegistrationEventType;
import com.micesign.event.RegistrationNotificationEvent;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.repository.RegistrationRequestRepository;
import com.micesign.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Registration email notification service.
 * Listens for RegistrationNotificationEvent after transaction commit.
 * Runs asynchronously to avoid blocking the main thread.
 *
 * When JavaMailSender is not configured (dev mode), logs emails instead of sending.
 */
@Service
public class RegistrationEmailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationEmailService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final UserRepository userRepository;
    private final NotificationLogRepository notificationLogRepository;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${spring.mail.username:noreply@micesign.com}")
    private String fromAddress;

    public RegistrationEmailService(
            @Autowired(required = false) JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            RegistrationRequestRepository registrationRequestRepository,
            UserRepository userRepository,
            NotificationLogRepository notificationLogRepository) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.registrationRequestRepository = registrationRequestRepository;
        this.userRepository = userRepository;
        this.notificationLogRepository = notificationLogRepository;
    }

    /**
     * Handle registration notification events after transaction commit.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleRegistrationEvent(RegistrationNotificationEvent event) {
        try {
            RegistrationRequest reg = registrationRequestRepository
                    .findById(event.getRegistrationRequestId())
                    .orElse(null);
            if (reg == null) {
                log.warn("RegistrationRequest not found for notification: id={}",
                        event.getRegistrationRequestId());
                return;
            }

            switch (event.getEventType()) {
                case REGISTRATION_SUBMIT -> {
                    sendSubmitConfirmation(reg);
                    notifySuperAdmins(reg);
                }
                case REGISTRATION_APPROVE -> sendApproveResult(reg);
                case REGISTRATION_REJECT -> sendRejectResult(reg);
            }
        } catch (Exception e) {
            log.error("Failed to process registration notification: regId={}, event={}, error={}",
                    event.getRegistrationRequestId(), event.getEventType(), e.getMessage(), e);
        }
    }

    private void sendSubmitConfirmation(RegistrationRequest reg) {
        Context ctx = new Context();
        ctx.setVariable("name", reg.getName());
        ctx.setVariable("submittedDate", reg.getCreatedAt());

        sendEmail(reg.getEmail(), "[MiceSign] 등록 신청 접수 확인",
                "registration-submit", ctx, null, reg.getId(),
                RegistrationEventType.REGISTRATION_SUBMIT);
    }

    private void sendApproveResult(RegistrationRequest reg) {
        Context ctx = new Context();
        ctx.setVariable("name", reg.getName());
        ctx.setVariable("approvedDate", reg.getProcessedAt());
        ctx.setVariable("loginUrl", baseUrl + "/login");

        sendEmail(reg.getEmail(), "[MiceSign] 등록 신청 승인 완료",
                "registration-approve", ctx, null, reg.getId(),
                RegistrationEventType.REGISTRATION_APPROVE);
    }

    private void sendRejectResult(RegistrationRequest reg) {
        Context ctx = new Context();
        ctx.setVariable("name", reg.getName());
        ctx.setVariable("rejectionReason", reg.getRejectionReason());

        sendEmail(reg.getEmail(), "[MiceSign] 등록 신청 결과 안내",
                "registration-reject", ctx, null, reg.getId(),
                RegistrationEventType.REGISTRATION_REJECT);
    }

    private void notifySuperAdmins(RegistrationRequest reg) {
        List<User> admins = userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE);

        for (User admin : admins) {
            Context ctx = new Context();
            ctx.setVariable("applicantName", reg.getName());
            ctx.setVariable("applicantEmail", reg.getEmail());
            ctx.setVariable("submittedDate", reg.getCreatedAt());

            sendEmail(admin.getEmail(), "[MiceSign] 새로운 등록 신청",
                    "registration-admin-notify", ctx, admin, reg.getId(),
                    RegistrationEventType.REGISTRATION_SUBMIT);
        }
    }

    /**
     * Send email via SMTP or log in dev mode.
     * Always records to notification_log.
     * Uses recipientEmail field (existing NotificationLog column) for email address storage.
     */
    private void sendEmail(String to, String subject, String templateName,
                           Context ctx, User recipient, Long registrationRequestId,
                           RegistrationEventType eventType) {
        NotificationLog notifLog = new NotificationLog();
        notifLog.setRecipient(recipient);
        // recipientEmail - 기존 NotificationLog 필드. 등록 알림에서 recipient=null일 때도 이메일 주소 저장.
        notifLog.setRecipientEmail(to);
        notifLog.setEventType(eventType.name());
        notifLog.setRegistrationRequestId(registrationRequestId);
        notifLog.setSubject(subject);

        try {
            if (mailSender == null) {
                // Dev mode: log only, no SMTP configured
                log.info("[EMAIL STUB] To: {}, Subject: {}", to, subject);
                notifLog.setStatus(NotificationStatus.SUCCESS);
                notifLog.setSentAt(LocalDateTime.now());
            } else {
                String html = templateEngine.process("email/" + templateName, ctx);
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(html, true);
                helper.setFrom("MiceSign <" + fromAddress + ">");
                mailSender.send(message);
                notifLog.setStatus(NotificationStatus.SUCCESS);
                notifLog.setSentAt(LocalDateTime.now());
            }
        } catch (Exception e) {
            // No retry for registration emails (per D-06)
            log.error("등록 이메일 발송 실패: to={}, error={}", to, e.getMessage());
            notifLog.setStatus(NotificationStatus.FAILED);
            notifLog.setErrorMessage(e.getMessage());
        }

        notificationLogRepository.save(notifLog);
    }
}
