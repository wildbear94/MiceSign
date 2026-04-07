package com.micesign.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Email service stub for sending templated emails.
 * Currently logs emails instead of sending them since SMTP infrastructure
 * is deferred to Phase 1-B. When SMTP is configured, replace the log-only
 * implementation with actual JavaMailSender + Thymeleaf template rendering.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    /**
     * Send a templated email.
     *
     * @param to recipient email address
     * @param subject email subject
     * @param templateName Thymeleaf template name (without .html extension)
     * @param variables template variables
     */
    public void sendEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        // SMTP not yet configured (Phase 1-B). Log the email for now.
        log.info("[EMAIL STUB] To: {}, Subject: {}, Template: {}, Variables: {}",
                to, subject, templateName, variables);
    }
}
