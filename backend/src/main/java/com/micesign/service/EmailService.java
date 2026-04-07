package com.micesign.service;

import com.micesign.domain.Document;
import com.micesign.domain.enums.NotificationEventType;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.HashMap;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.notification.sender-name}")
    private String senderName;

    @Value("${app.notification.sender-email}")
    private String senderEmail;

    @Value("${app.notification.base-url}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    public void sendEmail(String to, String subject, String templateName, Map<String, Object> variables) throws Exception {
        Context context = new Context();
        context.setVariables(variables);

        // Always add documentUrl
        if (variables.containsKey("documentId")) {
            context.setVariable("documentUrl", baseUrl + "/documents/" + variables.get("documentId"));
        }

        String html = templateEngine.process("email/" + templateName, context);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(new InternetAddress(senderEmail, senderName, "UTF-8"));
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);

        mailSender.send(message);
    }

    public String buildSubject(NotificationEventType eventType, String documentTitle) {
        return switch (eventType) {
            case SUBMIT -> "[MiceSign] " + documentTitle + " - 결재 요청";
            case APPROVE -> "[MiceSign] " + documentTitle + " - 승인 완료";
            case REJECT -> "[MiceSign] " + documentTitle + " - 반려";
            case WITHDRAW -> "[MiceSign] " + documentTitle + " - 회수";
        };
    }

    public Map<String, Object> buildTemplateVariables(Document document, NotificationEventType eventType, String comment) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("documentTitle", document.getTitle());
        variables.put("docNumber", document.getDocNumber() != null ? document.getDocNumber() : "");
        variables.put("drafterName", document.getDrafter().getName());
        variables.put("documentId", document.getId());
        variables.put("documentUrl", baseUrl + "/documents/" + document.getId());

        String statusLabel = switch (eventType) {
            case SUBMIT -> "결재 요청";
            case APPROVE -> "승인 완료";
            case REJECT -> "반려";
            case WITHDRAW -> "회수";
        };
        variables.put("statusLabel", statusLabel);

        if (comment != null) {
            variables.put("comment", comment);
        }

        return variables;
    }

    public String getTemplateName(NotificationEventType eventType) {
        return switch (eventType) {
            case SUBMIT -> "submit";
            case APPROVE -> "approve";
            case REJECT -> "reject";
            case WITHDRAW -> "withdraw";
        };
    }
}
